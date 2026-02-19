import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { updateSkillProfile } from './recommendationEngine.js';
import { getProductContext, getSalesGuidelines } from './scenarioGenerator.js';

let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Queue a session for background analysis
 */
export async function queueAnalysis(sessionId, orgId, priority = 5) {
  const supabase = createAdminClient();

  // Update session status
  await supabase
    .from(TABLES.TRAINING_SESSIONS)
    .update({
      analysis_status: 'pending'
    })
    .eq('id', sessionId);

  // Add to queue
  const { data, error } = await supabase
    .from(TABLES.ANALYSIS_QUEUE)
    .insert({
      session_id: sessionId,
      org_id: orgId,
      priority,
      status: 'pending',
      queued_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error queueing analysis:', error);
    throw error;
  }

  // Try to process immediately if no other jobs are running
  processNextJob().catch(err => {
    console.error('Background processing error:', err);
  });

  return data;
}

/**
 * Get analysis status for a session
 */
export async function getAnalysisStatus(sessionId) {
  const supabase = createAdminClient();

  // Get session analysis status
  const { data: session, error: sessionError } = await supabase
    .from(TABLES.TRAINING_SESSIONS)
    .select('analysis_status, analysis_started_at, analysis_completed_at, analysis_error')
    .eq('id', sessionId)
    .single();

  if (sessionError) throw sessionError;

  // Get cached results if completed
  let results = null;
  if (session.analysis_status === 'completed') {
    const { data: cache } = await supabase
      .from(TABLES.ANALYSIS_CACHE)
      .select('*')
      .eq('session_id', sessionId)
      .single();

    results = cache;
  }

  // Get queue position if pending
  let queuePosition = null;
  if (session.analysis_status === 'pending') {
    const { data: queue } = await supabase
      .from(TABLES.ANALYSIS_QUEUE)
      .select('id')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('queued_at', { ascending: true });

    const { data: currentJob } = await supabase
      .from(TABLES.ANALYSIS_QUEUE)
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .single();

    if (queue && currentJob) {
      queuePosition = queue.findIndex(q => q.id === currentJob.id) + 1;
    }
  }

  return {
    status: session.analysis_status,
    startedAt: session.analysis_started_at,
    completedAt: session.analysis_completed_at,
    error: session.analysis_error,
    queuePosition,
    results
  };
}

/**
 * Process the next job in the queue
 */
export async function processNextJob() {
  const supabase = createAdminClient();
  const workerId = `worker-${process.pid}-${Date.now()}`;

  // Get next job
  const { data: jobs } = await supabase
    .rpc('get_next_analysis_job', {
      p_worker_id: workerId,
      p_lock_duration: '5 minutes'
    });

  const job = jobs?.[0];
  if (!job) {
    return null; // No jobs available
  }

  console.log(`[AsyncAnalysis] Processing job ${job.job_id} for session ${job.session_id}`);

  try {
    // Update session status
    await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        analysis_status: 'processing',
        analysis_started_at: new Date().toISOString()
      })
      .eq('id', job.session_id);

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('id', job.session_id)
      .single();

    if (sessionError) throw sessionError;

    // Perform analysis
    const startTime = Date.now();
    const analysis = await performAnalysis(session);
    const duration = Date.now() - startTime;

    // Cache the results
    await supabase
      .from(TABLES.ANALYSIS_CACHE)
      .upsert({
        session_id: job.session_id,
        overall_score: analysis.overallScore,
        category_scores: analysis.categories,
        summary: analysis.summary,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        key_moment: analysis.keyMoment,
        next_steps: analysis.nextSteps,
        model_used: 'claude-sonnet-4-20250514',
        analysis_duration_ms: duration,
        cached_at: new Date().toISOString()
      }, { onConflict: 'session_id' });

    // Update session with results
    await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        analysis_status: 'completed',
        analysis_completed_at: new Date().toISOString(),
        overall_score: analysis.overallScore,
        category_scores: analysis.categories,
        strengths: analysis.strengths,
        improvements: analysis.improvements
      })
      .eq('id', job.session_id);

    // Mark job as completed
    await supabase
      .from(TABLES.ANALYSIS_QUEUE)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.job_id);

    console.log(`[AsyncAnalysis] Completed job ${job.job_id} in ${duration}ms`);

    // Update skill profile only on first attempt per scenario
    // Repeat attempts at the same scenario don't re-calibrate the profile
    if (session.user_id && session.org_id && session.scenario_id) {
      try {
        const { data: priorSessions } = await supabase
          .from(TABLES.TRAINING_SESSIONS)
          .select('id')
          .eq('user_id', session.user_id)
          .eq('scenario_id', session.scenario_id)
          .eq('status', 'completed')
          .neq('id', session.id)
          .limit(1);

        if (!priorSessions || priorSessions.length === 0) {
          await updateSkillProfile(session.user_id, session.org_id, {
            session_id: session.id,
            categories: analysis.categories,
            category_scores: analysis.categories
          });
          console.log(`[AsyncAnalysis] Updated skill profile for user ${session.user_id} (first attempt at ${session.scenario_id})`);
        }
      } catch (profileError) {
        console.error(`[AsyncAnalysis] Skill profile update failed (non-blocking):`, profileError);
      }
    }

    // Try to process next job
    setImmediate(() => processNextJob().catch(console.error));

    return analysis;
  } catch (error) {
    console.error(`[AsyncAnalysis] Failed job ${job.job_id}:`, error);

    // Update session with error
    await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        analysis_status: 'failed',
        analysis_error: error.message,
        analysis_retry_count: (session?.analysis_retry_count || 0) + 1
      })
      .eq('id', job.session_id);

    // Mark job as failed
    await supabase
      .from(TABLES.ANALYSIS_QUEUE)
      .update({
        status: 'failed',
        last_error: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.job_id);

    throw error;
  }
}

/**
 * Perform the actual analysis using Claude
 */
async function performAnalysis(session) {
  const transcript = session.transcript_raw || '';
  const company = session.organization || {};

  if (!transcript || transcript.trim().length < 50) {
    return {
      overallScore: 0,
      categories: {},
      summary: 'Insufficient transcript data for analysis.',
      strengths: [],
      improvements: [],
      keyMoment: null,
      nextSteps: ['Complete a full training session for detailed feedback.']
    };
  }

  // Fetch org knowledge context for scoring
  const orgId = session.org_id || session.organization_id;
  let productContext = null;
  let salesGuidelines = [];
  let template = null;

  try {
    if (orgId) {
      [productContext, salesGuidelines] = await Promise.all([
        getProductContext(orgId),
        getSalesGuidelines(orgId)
      ]);
    }

    // Trace session → generated_scenario → scenario_template
    if (session.scenario_id) {
      const supabase = createAdminClient();
      const { data: genScenario } = await supabase
        .from('generated_scenarios')
        .select('template_id')
        .eq('id', session.scenario_id)
        .single();

      if (genScenario?.template_id) {
        const { data: tmpl } = await supabase
          .from('scenario_templates')
          .select('*')
          .eq('id', genScenario.template_id)
          .single();
        template = tmpl;
      }
    }
  } catch (err) {
    console.error('[AsyncAnalysis] Error fetching org context (non-blocking):', err.message);
  }

  // Build org context block
  const orgContextLines = [];
  if (productContext?.company?.name) {
    orgContextLines.push(`Company: ${productContext.company.name}`);
  }
  if (productContext?.packages?.length) {
    orgContextLines.push('Service Packages:');
    for (const pkg of productContext.packages) {
      const points = pkg.sellingPoints?.slice(0, 3).join('; ') || '';
      orgContextLines.push(`  - ${pkg.name}: $${pkg.price}/${pkg.frequency || 'service'}${points ? ` | Key points: ${points}` : ''}`);
    }
  }
  if (salesGuidelines.length > 0) {
    orgContextLines.push('Key Policies:');
    for (const g of salesGuidelines.slice(0, 8)) {
      orgContextLines.push(`  - ${g.title}: ${g.content.slice(0, 150)}${g.content.length > 150 ? '...' : ''}`);
    }
  }
  const orgContextBlock = orgContextLines.length > 0
    ? `\n## Organization Knowledge Base\n${orgContextLines.join('\n')}\n`
    : '';

  // Build scenario-specific scoring context from template
  const templateContextLines = [];
  if (template) {
    if (template.csr_objectives) {
      templateContextLines.push(`CSR Objectives: ${template.csr_objectives}`);
    }
    if (template.resolution_conditions) {
      templateContextLines.push(`Resolution Conditions: ${template.resolution_conditions}`);
    }
    if (template.scoring_focus) {
      try {
        const focus = typeof template.scoring_focus === 'string'
          ? JSON.parse(template.scoring_focus) : template.scoring_focus;
        const focusStr = Object.entries(focus)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Math.round(v * 100)}%`)
          .join(', ');
        templateContextLines.push(`Scoring Weights: ${focusStr}`);
      } catch { /* ignore parse errors */ }
    }
  }
  const templateContextBlock = templateContextLines.length > 0
    ? `\n## Scenario-Specific Objectives (score against these)\n${templateContextLines.join('\n')}\n`
    : '';

  const systemPrompt = `You are an expert CSR coach specializing in pest control, lawn care, and home services customer service training.
You understand what drives revenue and customer retention:
- Converting inquiries into booked appointments
- Retaining existing customers through empathy and value demonstration
- Resolving complaints quickly to preserve the relationship
- Handling price objections by communicating value, not discounting
- Building trust through knowledge and professionalism
${orgContextBlock}
Score based on how well the CSR achieved the CORE OBJECTIVE for the scenario type. A CSR who handles the primary objective competently should score 70-80. Reserve 80-90 for strong performances and 90+ for exceptional ones. Scores below 60 should only be given when fundamental skills were clearly missing.

${template ? 'IMPORTANT: This scenario has specific objectives. Score primarily against those objectives. Check whether the CSR quoted correct pricing, followed correct procedures, and met the resolution conditions.' : ''}

Provide detailed, constructive feedback.
Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Company: ${company.name || 'Training Company'}
- Call Duration: ${session.duration_seconds || 'Unknown'} seconds
${templateContextBlock}
## Transcript
${transcript}

## Scoring Categories — Adapt to Scenario Type

IMPORTANT: Adjust "Booking & Conversion" based on scenario type. For retention calls, evaluate as retention/save. For complaint calls, evaluate as resolution/recovery. For emergency calls, evaluate as emergency handling. Only evaluate as booking/conversion for sales calls. A competent CSR who achieves the core objective should score 70-80. Do NOT penalize for items irrelevant to the scenario type.
${template ? `\nSCENARIO-SPECIFIC: The CSR should have: ${template.csr_objectives || 'completed the scenario objectives'}. Score "Service & Technical Knowledge" based on whether they demonstrated knowledge of the correct procedures, pricing, and policies from the organization knowledge base.\n` : ''}
### 1. Empathy & Rapport (15%) - Building trust with customer
### 2. Booking & Conversion / Retention / Resolution (25%) - Based on scenario type: booking, retention, resolution, or emergency handling
### 3. Service & Technical Knowledge (20%) - Treatment methods, service knowledge, safety info
### 4. Value Communication (25%) - Handling objections, communicating value vs competitors
### 5. Professionalism & Call Control (15%) - Tone, call flow, qualifying questions

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "Specific feedback on building trust", "keyMoments": [] },
    "bookingConversion": { "score": 0-100, "feedback": "Did they ask for the appointment? Create urgency?", "keyMoments": [] },
    "serviceKnowledge": { "score": 0-100, "feedback": "Technical accuracy and service explanation", "keyMoments": [] },
    "valueAndObjections": { "score": 0-100, "feedback": "Value communication and objection handling", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "Call control and professional conduct", "keyMoments": [] }
  },
  "strengths": [{ "title": "Strength", "description": "Why effective for booking/retention", "quote": "Quote" }],
  "improvements": [{ "title": "Area", "issue": "What went wrong", "quote": "What they said", "alternative": "Better response to improve conversion" }],
  "keyMoment": { "timestamp": "When", "description": "Pivotal moment affecting conversion", "impact": "Effect on booking", "betterApproach": "What would increase conversion" },
  "summary": "2-3 sentence assessment focusing on booking/retention effectiveness",
  "nextSteps": ["Specific action to improve conversion", "Action 2", "Action 3"]
}`;

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0].text;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const analysis = JSON.parse(jsonMatch[1].trim());

  return analysis;
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(maxRetries = 3) {
  const supabase = createAdminClient();

  // Get failed jobs that haven't exceeded max retries
  const { data: failedJobs } = await supabase
    .from(TABLES.ANALYSIS_QUEUE)
    .select('id, session_id, attempts')
    .eq('status', 'failed')
    .lt('attempts', maxRetries);

  for (const job of failedJobs || []) {
    // Reset to pending
    await supabase
      .from(TABLES.ANALYSIS_QUEUE)
      .update({
        status: 'pending',
        last_error: null
      })
      .eq('id', job.id);

    await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        analysis_status: 'pending',
        analysis_error: null
      })
      .eq('id', job.session_id);
  }

  return failedJobs?.length || 0;
}

/**
 * Clean up old completed jobs
 */
export async function cleanupOldJobs(daysOld = 7) {
  const supabase = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from(TABLES.ANALYSIS_QUEUE)
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', cutoffDate.toISOString())
    .select('id');

  return data?.length || 0;
}

export default {
  queueAnalysis,
  getAnalysisStatus,
  processNextJob,
  retryFailedJobs,
  cleanupOldJobs
};
