import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient, TABLES } from '../lib/supabase.js';

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
  const scenario = { name: session.scenario_id, difficulty: 'medium' };

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

  const systemPrompt = `You are an expert CSR coach specializing in customer service training.
Provide detailed, constructive feedback on call performance.
Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Company: ${company.name || 'Training Company'}
- Call Duration: ${session.duration_seconds || 'Unknown'} seconds

## Transcript
${transcript}

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "problemResolution": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "productKnowledge": { "score": 0-100, "feedback": "Feedback on product/service knowledge accuracy", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "communication": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] }
  },
  "strengths": [{ "title": "Strength", "description": "Why effective", "quote": "Quote" }],
  "improvements": [{ "title": "Area", "issue": "What went wrong", "quote": "What they said", "alternative": "Better response" }],
  "keyMoment": { "timestamp": "When", "description": "What happened", "impact": "Effect", "betterApproach": "Alternative" },
  "summary": "2-3 sentence assessment",
  "nextSteps": ["Action 1", "Action 2", "Action 3"]
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
