import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '../lib/supabase.js';
import { buildGraphSummary, getKnowledgeCoverageStats, updateKnowledgeItem } from './knowledgeGraph.js';
import { validateKnowledgeGraph } from './contentValidator.js';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a Training Program Designer AI for pest control, lawn care, and home services companies. Your job is to ACTIVELY GUIDE the admin through building a complete CSR training program. You drive the conversation — don't wait for them to figure out what to do next.

## YOUR WORKFLOW (follow this sequence)

**Phase 1: ACKNOWLEDGE & RESOLVE**
When documents have been uploaded and knowledge items exist:
- Report what you found: how many items, which categories, what looks good
- If there are validation issues (contradictions, missing data), ask about them ONE AT A TIME
- Reference specific data: "Your docs show two prices for Quarterly Pest — $199 and $179. Which is current?"
- Don't ask generic questions — every question should reference actual extracted content

**Phase 2: DEEPEN UNDERSTANDING**
After conflicts are resolved (or if there are none):
- Ask questions that documents NEVER answer — the tribal knowledge, pain points, context
- Examples: "What's the #1 reason customers cancel?" / "What do new hires get wrong in their first two weeks?" / "Is there a specific competitor you lose the most to?"
- Focus on domains with 0 items in the knowledge graph — ask about those gaps
- Each answer you get makes the training program more targeted

**Phase 3: PRIORITIZE & FOCUS**
After you have enough understanding (usually 4-8 questions):
- Summarize what you know in a clear list
- Propose a priority order for the training program: "Based on everything, here's what I'd focus on: 1) Cancellation saves (you said this is the biggest gap), 2) Price objection handling..."
- Ask the admin to adjust the priorities
- This directly shapes how many scenarios and courses each topic gets

**Phase 4: PROPOSE & GENERATE**
After priorities are confirmed:
- Preview exactly what you'll create: "I'll generate X courses with Y modules, Z practice scenarios, and N scripts. Heavy emphasis on [top priority]. Ready?"
- WAIT for explicit approval before generating
- After generation, help the admin review and give feedback

## CONVERSATION RULES
- ONE question at a time — never ask multiple questions in one message
- Be specific — always reference actual data from the knowledge graph
- Don't ask what the docs already tell you — you can see the full graph
- After each phase, offer an off-ramp: "I could generate now with what I have, or dig deeper into [thin areas]. Your call."
- Show progress: "Strong coverage on products and pricing. Lighter on: competitive intel and retention strategies."
- If the admin says "skip" or "not sure" — move on gracefully
- If the admin says "just generate" or "that's enough" — go straight to Phase 4
- Be warm but efficient — this is a busy admin, not a student

## IMPORTANT
- You are the GUIDE. Don't wait for the admin to ask you things. After every response from them, move the conversation forward with your next question or action.
- When knowledge exists but you haven't started the interview yet, begin with Phase 1 immediately.
- The admin should never be confused about what to do next — always end your message with a clear question or action.`;

function buildContextBlock(graphSummary, coverageStats, validationIssues, interviewContext, phase) {
  let context = `## Current Knowledge Graph State\n\n`;
  context += `Total items: ${coverageStats.total} | Verified: ${coverageStats.verified}\n\n`;

  context += `### Domain Coverage\n`;
  for (const [domain, stats] of Object.entries(coverageStats.byDomain)) {
    const bar = stats.count > 0 ? '✅' : '⬜';
    context += `${bar} ${domain}: ${stats.count} items (${stats.verified} verified)\n`;
  }

  if (validationIssues.length > 0) {
    context += `\n### Validation Issues (${validationIssues.length})\n`;
    const errors = validationIssues.filter(i => i.severity === 'error');
    const warnings = validationIssues.filter(i => i.severity === 'warning');
    if (errors.length) context += `❌ ${errors.length} conflicts\n`;
    if (warnings.length) context += `⚠️ ${warnings.length} warnings\n`;
    for (const issue of validationIssues.slice(0, 5)) {
      context += `- [${issue.severity}] ${issue.message}\n`;
    }
  }

  if (interviewContext && Object.keys(interviewContext).length > 0) {
    context += `\n### Interview Context Accumulated\n`;
    if (interviewContext.pain_points?.length) context += `Pain points: ${interviewContext.pain_points.join(', ')}\n`;
    if (interviewContext.priorities?.length) context += `Priorities: ${interviewContext.priorities.map(p => p.topic).join(', ')}\n`;
    if (interviewContext.resolved_conflicts?.length) context += `Resolved conflicts: ${interviewContext.resolved_conflicts.length}\n`;
  }

  context += `\n### Knowledge Graph Summary\n${graphSummary}`;
  context += `\n\nCurrent phase: ${phase}`;

  return context;
}

/**
 * Process a chat message from the admin.
 * Returns the AI response text and any side effects (knowledge updates, generation triggers).
 */
export async function processMessage(sessionId, userMessage) {
  const supabase = createAdminClient();

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('studio_sessions')
    .select('*, organization:organizations(id, name)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) throw new Error('Session not found');

  const orgId = session.organization_id;
  const interviewContext = session.interview_context || {};

  // Build context
  const [graphSummary, coverageStats, validationIssues] = await Promise.all([
    buildGraphSummary(orgId),
    getKnowledgeCoverageStats(orgId),
    validateKnowledgeGraph(orgId)
  ]);

  const contextBlock = buildContextBlock(
    graphSummary, coverageStats, validationIssues, interviewContext, session.status
  );

  // Fetch recent chat history
  const { data: recentMessages } = await supabase
    .from('studio_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(30);

  // Build messages array
  const messages = (recentMessages || []).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  messages.push({ role: 'user', content: userMessage });

  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
    messages
  });

  const assistantMessage = response.content[0].text;

  // Store both messages
  await supabase.from('studio_messages').insert([
    { session_id: sessionId, role: 'user', content: userMessage, message_type: 'chat' },
    { session_id: sessionId, role: 'assistant', content: assistantMessage, message_type: 'chat' }
  ]);

  // Parse any context updates from the AI response
  // Look for structured signals in the response
  const updatedContext = { ...interviewContext };
  let contextChanged = false;

  // Simple heuristic: if the AI confirmed resolving a conflict, note it
  if (userMessage.toLowerCase().includes('current') || userMessage.toLowerCase().includes('correct') || userMessage.toLowerCase().includes('right')) {
    // Could be confirming a price or fact — mark as noted
    if (!updatedContext.resolved_conflicts) updatedContext.resolved_conflicts = [];
    contextChanged = true;
  }

  // If AI asked about pain points and user answered
  if (assistantMessage.toLowerCase().includes('struggle') || assistantMessage.toLowerCase().includes('pain point')) {
    if (!updatedContext.pain_points) updatedContext.pain_points = [];
  }

  if (contextChanged) {
    await supabase.from('studio_sessions').update({
      interview_context: updatedContext,
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);
  }

  return {
    message: assistantMessage,
    coverageStats,
    validationIssues: validationIssues.length
  };
}

/**
 * Generate the initial AI message when a session starts or documents finish processing
 */
export async function generateWelcomeMessage(sessionId) {
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('studio_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');

  const orgId = session.organization_id;

  // Get documents and knowledge stats
  const [{ data: docs }, coverageStats, validationIssues] = await Promise.all([
    supabase.from('kb_documents').select('filename, doc_classification, parse_status').eq('session_id', sessionId),
    getKnowledgeCoverageStats(orgId),
    validateKnowledgeGraph(orgId)
  ]);

  const parsedDocs = (docs || []).filter(d => d.parse_status === 'parsed');
  const failedDocs = (docs || []).filter(d => d.parse_status === 'failed');

  let welcomeContent = `I've analyzed ${parsedDocs.length} document${parsedDocs.length !== 1 ? 's' : ''}`;
  if (failedDocs.length > 0) {
    welcomeContent += ` (${failedDocs.length} couldn't be processed)`;
  }
  welcomeContent += `. Here's what I found:\n\n`;

  for (const doc of parsedDocs) {
    welcomeContent += `📄 **${doc.filename}** — classified as ${doc.doc_classification}\n`;
  }

  welcomeContent += `\n**Knowledge extracted:** ${coverageStats.total} items across ${Object.values(coverageStats.byDomain).filter(d => d.count > 0).length} domains.\n`;

  if (validationIssues.length > 0) {
    const errors = validationIssues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      welcomeContent += `\n⚠️ I found ${errors.length} conflict${errors.length !== 1 ? 's' : ''} that I need your help resolving.\n`;
      welcomeContent += `\n${errors[0].message}\n`;
    }
  } else {
    // Ask a deepening question
    const emptyDomains = Object.entries(coverageStats.byDomain)
      .filter(([, stats]) => stats.count === 0)
      .map(([domain]) => domain);

    if (emptyDomains.length > 0) {
      welcomeContent += `\nI have some questions to make your training program better. `;
    }
    welcomeContent += `What's the #1 thing new CSRs struggle with at your company?`;
  }

  // Store the welcome message
  await supabase.from('studio_messages').insert({
    session_id: sessionId,
    role: 'assistant',
    content: welcomeContent,
    message_type: 'chat'
  });

  return { message: welcomeContent, coverageStats, validationIssues: validationIssues.length };
}
