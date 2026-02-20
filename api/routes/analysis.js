import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { authMiddleware } from '../lib/auth.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /api/analysis/queue
 * Run analysis for a training session (runs inline, saves to training_sessions)
 */
router.post('/queue', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const orgId = req.organization?.id || req.user?.organization_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Return immediately — run analysis in background
    res.json({
      success: true,
      status: 'processing',
      message: 'Analysis started'
    });

    // Run analysis in background (don't await)
    runAnalysis(sessionId, orgId).catch(err => {
      console.error(`[Analysis] Background analysis failed for session ${sessionId}:`, err.message);
    });
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

/**
 * GET /api/analysis/status/:sessionId
 * Check analysis status by looking at training_sessions
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const supabase = createAdminClient();

    const { data: session, error } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .select('status, overall_score, category_scores, strengths, improvements, started_at, ended_at, duration_seconds')
      .eq('id', sessionId)
      .single();

    if (error) throw error;

    if (session?.status === 'completed' && session?.overall_score !== null) {
      return res.json({
        status: 'completed',
        results: {
          overall_score: session.overall_score,
          category_scores: session.category_scores,
          strengths: session.strengths,
          improvements: session.improvements
        }
      });
    }

    // Still processing or hasn't started
    res.json({
      status: session?.overall_score === null ? 'processing' : session?.status || 'unknown'
    });
  } catch (error) {
    console.error('Error getting analysis status:', error);
    res.status(500).json({ error: 'Failed to get analysis status' });
  }
});

/**
 * GET /api/analysis/results/:sessionId
 * Get analysis results from training_sessions
 */
router.get('/results/:sessionId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .select('overall_score, category_scores, strengths, improvements')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!session || session.overall_score === null) {
      return res.status(404).json({ error: 'Analysis results not found' });
    }

    res.json({
      cached: false,
      analysis: {
        overallScore: session.overall_score,
        categories: session.category_scores,
        strengths: session.strengths,
        improvements: session.improvements
      }
    });
  } catch (error) {
    console.error('Error getting analysis results:', error);
    res.status(500).json({ error: 'Failed to get analysis results' });
  }
});

/**
 * POST /api/analysis/analyze
 * Synchronous analysis — analyzes transcript directly and returns result
 */
router.post('/analyze', async (req, res) => {
  try {
    const { transcript, scenario, callDuration } = req.body;

    if (!transcript || transcript.length < 10) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const analysis = await callClaude(transcript, scenario?.name, callDuration, req.organization);
    res.json({ analysis });
  } catch (error) {
    console.error('Error in sync analysis:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

/**
 * POST /api/analysis/retry/:sessionId
 * Retry analysis for a session
 */
router.post('/retry/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const orgId = req.organization?.id || req.user?.organization_id;

    // Kick off analysis again
    runAnalysis(sessionId, orgId).catch(err => {
      console.error(`[Analysis] Retry failed for session ${sessionId}:`, err.message);
    });

    res.json({ success: true, message: 'Analysis re-queued' });
  } catch (error) {
    console.error('Error retrying analysis:', error);
    res.status(500).json({ error: 'Failed to retry analysis' });
  }
});

/**
 * GET /api/analysis/comparative/:scenarioId
 * Get comparison data for all attempts of a scenario by the current user
 */
router.get('/comparative/:scenarioId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const userId = req.user.id;
    const { scenarioId } = req.params;

    const { data: sessions, error } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .select('id, started_at, ended_at, duration_seconds, overall_score, category_scores, strengths, improvements, difficulty')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .eq('status', 'completed')
      .order('started_at', { ascending: true });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return res.json({ scenarioId, attempts: [], summary: null, progression: null });
    }

    const attempts = sessions.map((session, index) => ({
      attemptNumber: index + 1,
      sessionId: session.id,
      date: session.started_at,
      duration: session.duration_seconds,
      overallScore: session.overall_score,
      categoryScores: session.category_scores
    }));

    const scores = attempts.map(a => a.overallScore).filter(s => s !== null);
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];

    res.json({
      scenarioId,
      totalAttempts: attempts.length,
      attempts,
      summary: {
        firstScore,
        lastScore,
        bestScore: Math.max(...scores),
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        improvement: lastScore - firstScore
      }
    });
  } catch (error) {
    console.error('Error getting comparative analysis:', error);
    res.status(500).json({ error: 'Failed to get comparative analysis' });
  }
});

/**
 * POST /api/analysis/feedback/:sessionId
 * Submit pass/fail feedback for a session
 */
router.post('/feedback/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { passed } = req.body;

    if (typeof passed !== 'boolean') {
      return res.status(400).json({ error: 'passed (boolean) is required' });
    }

    const supabase = createAdminClient();

    // Verify session belongs to user's org
    const { data: session, error: sessionError } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .select('id, user_id, organization_id')
      .eq('id', sessionId)
      .eq('organization_id', req.organization.id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ============ INTERNAL FUNCTIONS ============

/**
 * Run analysis for a session — fetches transcript, calls Claude, saves results
 */
async function runAnalysis(sessionId, orgId) {
  const supabase = createAdminClient();

  console.log(`[Analysis] Starting analysis for session ${sessionId}`);

  // Get session with transcript
  const { data: session, error: sessionError } = await supabase
    .from(TABLES.TRAINING_SESSIONS)
    .select('*, organization:organizations(*)')
    .eq('id', sessionId)
    .single();

  if (sessionError) throw sessionError;

  const transcript = session.transcript_raw || '';
  if (!transcript || transcript.trim().length < 50) {
    console.log(`[Analysis] Skipping — transcript too short (${transcript.length} chars)`);
    return;
  }

  const startTime = Date.now();

  try {
    const analysis = await callClaude(
      transcript,
      session.scenario_name,
      session.duration_seconds,
      session.organization
    );

    const duration = Date.now() - startTime;
    console.log(`[Analysis] Claude returned in ${duration}ms, score: ${analysis.overallScore}`);

    // Save results to training session
    const { error: updateError } = await supabase
      .from(TABLES.TRAINING_SESSIONS)
      .update({
        status: 'completed',
        overall_score: analysis.overallScore,
        category_scores: analysis.categories,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        ended_at: session.ended_at || new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error(`[Analysis] Failed to save results:`, updateError);
      throw updateError;
    }

    console.log(`[Analysis] Saved results for session ${sessionId}`);
    return analysis;
  } catch (err) {
    console.error(`[Analysis] Failed for session ${sessionId}:`, err.message);
    throw err;
  }
}

/**
 * Call Claude to analyze a transcript
 */
async function callClaude(transcript, scenarioName, callDuration, organization) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const companyName = organization?.name || 'the company';

  const systemPrompt = `You are an expert CSR coach specializing in pest control, lawn care, and home services customer service training.
You understand what drives revenue and customer retention:
- Converting inquiries into booked appointments
- Retaining existing customers through empathy and value demonstration
- Resolving complaints quickly to preserve the relationship
- Handling price objections by communicating value, not discounting
- Building trust through knowledge and professionalism

Score based on how well the CSR achieved the CORE OBJECTIVE for the scenario type. A CSR who handles the primary objective competently should score 70-80. Reserve 80-90 for strong performances and 90+ for exceptional ones. Scores below 60 should only be given when fundamental skills were clearly missing.

Provide detailed, constructive feedback.
Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Company: ${companyName}
- Scenario: ${scenarioName || 'Training Call'}
- Call Duration: ${callDuration || 'Unknown'} seconds

## Transcript
${transcript}

## Scoring Categories — Adapt to Scenario Type

IMPORTANT: Adjust "Booking & Conversion" based on scenario type. For retention calls, evaluate as retention/save. For complaint calls, evaluate as resolution/recovery. For emergency calls, evaluate as emergency handling. Only evaluate as booking/conversion for sales calls. A competent CSR who achieves the core objective should score 70-80. Do NOT penalize for items irrelevant to the scenario type.

### 1. Empathy & Rapport (15%) - Building trust with customer
### 2. Booking & Conversion / Retention / Resolution (25%) - Based on scenario type
### 3. Service & Technical Knowledge (20%) - Treatment methods, service knowledge, safety info
### 4. Value Communication (25%) - Handling objections, communicating value vs competitors
### 5. Professionalism & Call Control (15%) - Tone, call flow, qualifying questions

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "Specific feedback on building trust", "keyMoments": [] },
    "bookingConversion": { "score": 0-100, "feedback": "Did they achieve the primary call objective?", "keyMoments": [] },
    "serviceKnowledge": { "score": 0-100, "feedback": "Technical accuracy and service explanation", "keyMoments": [] },
    "valueAndObjections": { "score": 0-100, "feedback": "Value communication and objection handling", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "Call control and professional conduct", "keyMoments": [] }
  },
  "strengths": [{ "title": "Strength", "description": "Why effective", "quote": "Quote from transcript" }],
  "improvements": [{ "title": "Area", "issue": "What went wrong", "quote": "What they said", "alternative": "Better response" }],
  "keyMoment": { "timestamp": "When", "description": "Pivotal moment", "impact": "Effect on outcome", "betterApproach": "What would improve it" },
  "summary": "2-3 sentence assessment",
  "nextSteps": ["Specific action 1", "Action 2", "Action 3"]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0].text;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  return JSON.parse(jsonMatch[1].trim());
}

export default router;
