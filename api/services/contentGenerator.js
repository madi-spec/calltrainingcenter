import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '../lib/supabase.js';
import { getKnowledgeItems, getKnowledgeLinks, buildGraphSummary } from './knowledgeGraph.js';
import { scoreContentQuality } from './contentValidator.js';

const anthropic = new Anthropic();

/**
 * Generate a complete training program from the knowledge graph.
 * Creates a new program_version with courses, scenarios, and scripts.
 * Returns the version record with generation stats.
 */
export async function generateTrainingProgram(orgId, sessionId, interviewContext = {}, onProgress) {
  const supabase = createAdminClient();
  const progress = (step, detail) => onProgress?.({ step, detail });

  // Create version record
  const { data: existingVersions } = await supabase
    .from('program_versions')
    .select('version_number')
    .eq('session_id', sessionId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from('program_versions')
    .insert({
      organization_id: orgId,
      session_id: sessionId,
      version_number: nextVersion,
      status: 'generating',
      generation_stats: { started_at: new Date().toISOString() }
    })
    .select()
    .single();

  if (versionError) throw new Error(`Failed to create version: ${versionError.message}`);

  try {
    // Step 1: Load knowledge graph
    progress('loading', 'Loading knowledge graph...');
    const [items, links, graphSummary] = await Promise.all([
      getKnowledgeItems(orgId),
      getKnowledgeLinks(orgId),
      buildGraphSummary(orgId)
    ]);

    const priorities = interviewContext.priorities || [];
    const painPoints = interviewContext.pain_points || [];

    // Step 2: Generate course structure
    progress('courses', 'Designing course structure...');
    const courses = await generateCourseStructure(graphSummary, priorities, painPoints, items);

    // Step 3: Store courses and modules
    progress('storing_courses', 'Saving courses...');
    const storedCourses = [];
    for (const course of courses) {
      const { data: courseRecord } = await supabase
        .from('courses')
        .insert({
          organization_id: orgId,
          version_id: version.id,
          name: course.name,
          description: course.description,
          category: course.category,
          is_system: false,
          is_active: true,
          knowledge_coverage: { domains: course.domains }
        })
        .select()
        .single();

      if (!courseRecord) continue;

      const modules = [];
      for (let i = 0; i < course.modules.length; i++) {
        const mod = course.modules[i];
        const { data: moduleRecord } = await supabase
          .from('course_modules')
          .insert({
            course_id: courseRecord.id,
            name: mod.name,
            description: mod.description,
            difficulty: mod.difficulty,
            scenario_count: mod.scenarioCount || 5,
            pass_threshold: mod.difficulty === 'easy' ? 60 : mod.difficulty === 'medium' ? 65 : 70,
            unlock_order: i + 1,
            learning_objectives: mod.learningObjectives
          })
          .select()
          .single();

        if (moduleRecord) modules.push({ ...moduleRecord, _meta: mod });
      }

      storedCourses.push({ course: courseRecord, modules });
    }

    // Step 4: Generate scenario templates per module
    progress('scenarios', 'Generating practice scenarios...');
    let scenarioCount = 0;
    for (const { course, modules } of storedCourses) {
      for (const mod of modules) {
        const scenarios = await generateScenarioTemplates(
          mod, course, graphSummary, items, interviewContext
        );

        for (const scenario of scenarios) {
          const { error: scenarioError } = await supabase.from('scenario_templates').insert({
            organization_id: orgId,
            module_id: mod.id,
            version_id: version.id,
            name: scenario.name,
            base_situation: scenario.baseSituation,
            csr_objectives: JSON.stringify(scenario.csrObjectives),
            scoring_focus: scenario.scoringFocus,
            customer_goals: JSON.stringify(scenario.customerGoals),
            resolution_conditions: JSON.stringify(scenario.resolutionConditions),
            voice_agent_context: scenario.voiceAgentContext,
            scoring_rubric: scenario.scoringRubric,
            knowledge_item_ids: scenario.knowledgeItemIds || []
          });
          if (scenarioError) {
            console.error('[Generator] Scenario insert error:', scenarioError.message);
          } else {
            scenarioCount++;
          }
        }
      }
    }

    // Step 5: Generate scripts
    progress('scripts', 'Creating training scripts...');
    const scripts = await generateScripts(graphSummary, items, priorities, interviewContext);

    let scriptCount = 0;
    for (const script of scripts) {
      await supabase.from('generated_scripts').insert({
        version_id: version.id,
        organization_id: orgId,
        script_type: script.scriptType,
        title: script.title,
        category: script.category,
        difficulty: script.difficulty,
        content: script.content,
        knowledge_item_ids: script.knowledgeItemIds || []
      });
      scriptCount++;
    }

    // Step 6: Run L2 quality scoring on a sample
    progress('scoring', 'Scoring content quality...');
    const { data: sampleScripts } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('version_id', version.id)
      .limit(5);

    let totalScore = 0;
    let scoredCount = 0;
    for (const script of (sampleScripts || [])) {
      const { score, issues } = await scoreContentQuality(
        { type: script.script_type, title: script.title, content: script.content },
        items,
        anthropic
      );
      await supabase.from('generated_scripts')
        .update({ quality_score: score, quality_issues: issues })
        .eq('id', script.id);
      totalScore += score;
      scoredCount++;
    }

    const avgScore = scoredCount > 0 ? totalScore / scoredCount : null;
    const knowledgeCoverage = items.length > 0
      ? Math.min(1, scenarioCount / items.length)
      : 0;

    // Step 7: Finalize version
    const stats = {
      started_at: version.generation_stats.started_at,
      completed_at: new Date().toISOString(),
      courses: storedCourses.length,
      modules: storedCourses.reduce((sum, c) => sum + c.modules.length, 0),
      scenarios: scenarioCount,
      scripts: scriptCount
    };

    await supabase.from('program_versions').update({
      status: 'draft',
      generation_stats: stats,
      quality_score: avgScore,
      knowledge_coverage: knowledgeCoverage
    }).eq('id', version.id);

    progress('done', 'Training program generated!');

    return { ...version, generation_stats: stats, quality_score: avgScore };

  } catch (error) {
    await supabase.from('program_versions').update({
      status: 'draft',
      generation_stats: {
        ...version.generation_stats,
        error: error.message,
        completed_at: new Date().toISOString()
      }
    }).eq('id', version.id);
    throw error;
  }
}

// ============================================================
// COURSE STRUCTURE GENERATION
// ============================================================

async function generateCourseStructure(graphSummary, priorities, painPoints, items) {
  const priorityContext = priorities.length > 0
    ? `\n\nAdmin priorities (ordered):\n${priorities.map((p, i) => `${i + 1}. ${p.topic}${p.reason ? ` — ${p.reason}` : ''}`).join('\n')}`
    : '';

  const painContext = painPoints.length > 0
    ? `\n\nKey pain points:\n${painPoints.map(p => `- ${p}`).join('\n')}`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Design a training course structure for a pest control / home services company based on their knowledge graph.

${graphSummary}
${priorityContext}
${painContext}

Create 3-6 courses, each with 3 modules (easy, medium, hard). Courses should be ordered from foundational to advanced. Priority topics should get dedicated courses with more scenarios.

Respond with JSON only:
[
  {
    "name": "Course Name",
    "description": "What this course teaches",
    "category": "sales|retention|service|objections|advanced",
    "domains": ["products", "objections"],
    "modules": [
      {
        "name": "Module Name",
        "description": "What this module focuses on",
        "difficulty": "easy",
        "scenarioCount": 5,
        "learningObjectives": ["objective 1", "objective 2"]
      }
    ]
  }
]`
    }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new Error('Failed to parse course structure from AI response');
  }
}

// ============================================================
// SCENARIO TEMPLATE GENERATION
// ============================================================

async function generateScenarioTemplates(module, course, graphSummary, items, interviewContext) {
  const count = module.scenario_count || 5;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Generate ${count} practice call scenario templates for this training module.

Course: ${course.name} (${course.description})
Module: ${module.name} (${module.description})
Difficulty: ${module.difficulty}
Learning Objectives: ${JSON.stringify(module.learning_objectives || module._meta?.learningObjectives)}

Company Knowledge:
${graphSummary}

${interviewContext.pain_points?.length ? `Pain points to address: ${interviewContext.pain_points.join(', ')}` : ''}

For each scenario, generate:
1. A realistic customer situation (2-3 sentences)
2. CSR objectives (what the CSR should accomplish)
3. Scoring focus areas
4. Customer goals (what the simulated customer wants)
5. Resolution conditions (when the call should end)
6. Voice agent context (instructions for the AI playing the customer — personality, what to push back on, emotional state, what they know)
7. Scoring rubric (specific behaviors to evaluate, each with weight)

Respond with JSON only:
[
  {
    "name": "Scenario Name",
    "baseSituation": "The customer is calling because...",
    "csrObjectives": ["Acknowledge concern", "Offer resolution"],
    "scoringFocus": ["empathy", "product_knowledge"],
    "customerGoals": ["Get a discount", "Consider canceling"],
    "resolutionConditions": ["Customer agrees to stay", "Call ends naturally"],
    "voiceAgentContext": "You are a frustrated homeowner who found ants...",
    "scoringRubric": [
      {"behavior": "Acknowledged the customer's frustration", "weight": 20},
      {"behavior": "Offered a specific resolution", "weight": 25}
    ]
  }
]`
    }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    console.error('[Generator] Failed to parse scenarios, returning empty array');
    return [];
  }
}

// ============================================================
// SCRIPT GENERATION
// ============================================================

async function generateScripts(graphSummary, items, priorities, interviewContext) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `Generate training scripts for a pest control / home services company based on their knowledge.

${graphSummary}

${priorities.length > 0 ? `Priorities: ${priorities.map(p => p.topic).join(', ')}` : ''}
${interviewContext.pain_points?.length ? `Pain points: ${interviewContext.pain_points.join(', ')}` : ''}

Generate a mix of script types:
- 3-5 **talk_track** scripts: Step-by-step call flows with branching ("If customer says X → respond with Y"). Include specific pricing, service names, and policies from the knowledge graph.
- 2-3 **reference_card** scripts: Quick-reference cards for live calls — pricing tables, objection responses, competitor comparison points.
- 2-3 **role_play** scripts: Full two-sided dialogues showing ideal CSR-customer conversations.

Respond with JSON only:
[
  {
    "scriptType": "talk_track|reference_card|role_play",
    "title": "Script Title",
    "category": "sales|retention|service|objections",
    "difficulty": "easy|medium|hard",
    "content": {
      "steps": [
        {"step": 1, "action": "Greet and identify", "script": "Thank you for calling...", "notes": "Use warm tone"},
        {"step": 2, "action": "Discover need", "script": "What can I help you with today?", "branches": [
          {"if": "price complaint", "then": "Go to step 3a"},
          {"if": "service issue", "then": "Go to step 3b"}
        ]}
      ]
    }
  }
]

Use REAL company data from the knowledge graph — actual prices, service names, policies. Do not use placeholder values.`
    }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new Error('Failed to parse scripts from AI response');
  }
}
