import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '../lib/supabase.js';
import { authMiddleware } from '../lib/auth.js';
import { queueAnalysis, getAnalysisStatus, retryFailedJobs } from '../services/asyncAnalysis.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /api/analysis/analyze
 * Synchronous analysis fallback - analyzes transcript directly
 */
router.post('/analyze', async (req, res) => {
  try {
    const { transcript, scenario, callDuration } = req.body;

    if (!transcript || transcript.length < 10) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are an expert CSR coach specializing in pest control and home services customer service training.
You understand what drives revenue and customer retention for pest control companies:
- Converting inquiries into booked appointments (the #1 metric)
- Getting customers on recurring service plans vs one-time treatments
- Handling price objections by communicating value, not discounting
- Creating urgency appropriately for pest issues
- Building trust through technical knowledge and professionalism

Provide detailed, constructive feedback that helps CSRs book more appointments and retain more customers.
Always respond with valid JSON matching the exact schema provided.`;

    const userPrompt = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Scenario: ${scenario?.name || 'Training Call'}
- Call Duration: ${callDuration || 'Unknown'} seconds

## Transcript
${transcript}

## Scoring Categories for Pest Control CSRs

### 1. Empathy & Rapport (15%) - Building trust with customers about pest concerns
### 2. Booking & Conversion (25%) - CRITICAL: Did they ask for and secure the appointment?
### 3. Service & Technical Knowledge (20%) - Treatment methods, pest knowledge, safety info
### 4. Value Communication (25%) - Handling price objections, communicating value vs competitors
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const analysis = JSON.parse(jsonMatch[1].trim());

    res.json({ analysis });
  } catch (error) {
    console.error('Error in sync analysis:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * POST /api/analysis/queue
 * Queue a session for background analysis
 */
router.post('/queue', async (req, res) => {
  try {
    const { orgId } = req.user;
    const { sessionId, priority } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const job = await queueAnalysis(sessionId, orgId, priority || 5);

    res.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: 'Analysis queued for background processing'
    });
  } catch (error) {
    console.error('Error queueing analysis:', error);
    res.status(500).json({ error: 'Failed to queue analysis' });
  }
});

/**
 * GET /api/analysis/status/:sessionId
 * Get analysis status for a session
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const status = await getAnalysisStatus(sessionId);

    res.json(status);
  } catch (error) {
    console.error('Error getting analysis status:', error);
    res.status(500).json({ error: 'Failed to get analysis status' });
  }
});

/**
 * GET /api/analysis/results/:sessionId
 * Get cached analysis results for a session
 */
router.get('/results/:sessionId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { sessionId } = req.params;

    // Get from cache
    const { data: cache, error } = await supabase
      .from('analysis_cache')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!cache) {
      // Try to get from session directly
      const { data: session } = await supabase
        .from('training_sessions')
        .select('overall_score, category_scores, strengths, improvements')
        .eq('id', sessionId)
        .single();

      if (session && session.overall_score) {
        return res.json({
          cached: false,
          analysis: {
            overallScore: session.overall_score,
            categories: session.category_scores,
            strengths: session.strengths,
            improvements: session.improvements
          }
        });
      }

      return res.status(404).json({ error: 'Analysis results not found' });
    }

    res.json({
      cached: true,
      cachedAt: cache.cached_at,
      analysis: {
        overallScore: cache.overall_score,
        categories: cache.category_scores,
        summary: cache.summary,
        strengths: cache.strengths,
        improvements: cache.improvements,
        keyMoment: cache.key_moment,
        nextSteps: cache.next_steps
      },
      meta: {
        modelUsed: cache.model_used,
        tokensUsed: cache.tokens_used,
        durationMs: cache.analysis_duration_ms
      }
    });
  } catch (error) {
    console.error('Error getting analysis results:', error);
    res.status(500).json({ error: 'Failed to get analysis results' });
  }
});

/**
 * POST /api/analysis/retry/:sessionId
 * Retry a failed analysis
 */
router.post('/retry/:sessionId', async (req, res) => {
  try {
    const { orgId } = req.user;
    const { sessionId } = req.params;

    // Reset status and re-queue
    const supabase = createAdminClient();

    await supabase
      .from('training_sessions')
      .update({
        analysis_status: 'pending',
        analysis_error: null
      })
      .eq('id', sessionId);

    // Delete old queue entry if exists
    await supabase
      .from('analysis_queue')
      .delete()
      .eq('session_id', sessionId);

    // Queue new job with higher priority
    const job = await queueAnalysis(sessionId, orgId, 8);

    res.json({
      success: true,
      jobId: job.id,
      message: 'Analysis re-queued with higher priority'
    });
  } catch (error) {
    console.error('Error retrying analysis:', error);
    res.status(500).json({ error: 'Failed to retry analysis' });
  }
});

/**
 * GET /api/analysis/queue-stats
 * Get queue statistics (admin only)
 */
router.get('/queue-stats', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    const { data: pending } = await supabase
      .from('analysis_queue')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'pending');

    const { data: processing } = await supabase
      .from('analysis_queue')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'processing');

    const { data: failed } = await supabase
      .from('analysis_queue')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'failed');

    // Get average processing time from recent completions
    const { data: recent } = await supabase
      .from('analysis_cache')
      .select('analysis_duration_ms')
      .order('cached_at', { ascending: false })
      .limit(10);

    const avgDuration = recent && recent.length > 0
      ? Math.round(recent.reduce((sum, r) => sum + (r.analysis_duration_ms || 0), 0) / recent.length)
      : null;

    res.json({
      pending: pending?.length || 0,
      processing: processing?.length || 0,
      failed: failed?.length || 0,
      averageDurationMs: avgDuration
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

/**
 * GET /api/analysis/comparative/:scenarioId
 * Get comparison data for all attempts of a scenario by the current user
 */
router.get('/comparative/:scenarioId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId, orgId } = req.user;
    const { scenarioId } = req.params;

    // Get all completed sessions for this scenario
    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select(`
        id,
        started_at,
        ended_at,
        duration_seconds,
        overall_score,
        category_scores,
        strengths,
        improvements,
        transcript_formatted,
        difficulty
      `)
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .eq('status', 'completed')
      .order('started_at', { ascending: true });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return res.json({
        scenarioId,
        attempts: [],
        summary: null,
        progression: null
      });
    }

    // Calculate progression metrics
    const attempts = sessions.map((session, index) => ({
      attemptNumber: index + 1,
      sessionId: session.id,
      date: session.started_at,
      duration: session.duration_seconds,
      overallScore: session.overall_score,
      categoryScores: session.category_scores,
      difficulty: session.difficulty,
      strengthsCount: session.strengths?.length || 0,
      improvementsCount: session.improvements?.length || 0
    }));

    // Calculate trend data
    const scores = attempts.map(a => a.overallScore).filter(s => s !== null);
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const bestScore = Math.max(...scores);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Calculate category trends
    const categoryTrends = {};
    const categories = ['empathyRapport', 'problemResolution', 'productKnowledge', 'professionalism', 'scenarioSpecific'];

    categories.forEach(cat => {
      const catScores = sessions
        .map(s => s.category_scores?.[cat]?.score)
        .filter(s => s !== undefined && s !== null);

      if (catScores.length > 0) {
        categoryTrends[cat] = {
          first: catScores[0],
          last: catScores[catScores.length - 1],
          best: Math.max(...catScores),
          average: Math.round(catScores.reduce((a, b) => a + b, 0) / catScores.length),
          trend: catScores.length > 1 ? (catScores[catScores.length - 1] - catScores[0]) : 0
        };
      }
    });

    // Identify consistent improvement areas
    const commonImprovements = {};
    sessions.forEach(s => {
      (s.improvements || []).forEach(imp => {
        const key = imp.title || imp.issue || 'Unknown';
        commonImprovements[key] = (commonImprovements[key] || 0) + 1;
      });
    });

    const recurringImprovements = Object.entries(commonImprovements)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, occurrences: count }));

    res.json({
      scenarioId,
      totalAttempts: attempts.length,
      attempts,
      summary: {
        firstScore,
        lastScore,
        bestScore,
        averageScore,
        improvement: lastScore - firstScore,
        improvementPercent: firstScore > 0 ? Math.round(((lastScore - firstScore) / firstScore) * 100) : 0
      },
      categoryTrends,
      recurringImprovements,
      progression: {
        isImproving: lastScore > firstScore,
        consistentlyHigh: scores.every(s => s >= 80),
        needsWork: averageScore < 60,
        masteryAchieved: bestScore >= 90 && lastScore >= 85
      }
    });
  } catch (error) {
    console.error('Error getting comparative analysis:', error);
    res.status(500).json({ error: 'Failed to get comparative analysis' });
  }
});

/**
 * GET /api/analysis/scenario-stats/:scenarioId
 * Get aggregate stats for a scenario across all users in the org
 */
router.get('/scenario-stats/:scenarioId', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { scenarioId } = req.params;

    // Get all completed sessions for this scenario in the org
    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select(`
        id,
        user_id,
        overall_score,
        duration_seconds,
        category_scores,
        started_at
      `)
      .eq('org_id', orgId)
      .eq('scenario_id', scenarioId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return res.json({
        scenarioId,
        totalAttempts: 0,
        uniqueUsers: 0,
        stats: null
      });
    }

    const scores = sessions.map(s => s.overall_score).filter(s => s !== null);
    const durations = sessions.map(s => s.duration_seconds).filter(d => d !== null);
    const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;

    // Score distribution
    const distribution = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 75 && s < 90).length,
      satisfactory: scores.filter(s => s >= 60 && s < 75).length,
      needsWork: scores.filter(s => s < 60).length
    };

    // Category averages
    const categoryAverages = {};
    const categories = ['empathyRapport', 'problemResolution', 'productKnowledge', 'professionalism', 'scenarioSpecific'];

    categories.forEach(cat => {
      const catScores = sessions
        .map(s => s.category_scores?.[cat]?.score)
        .filter(s => s !== undefined && s !== null);

      if (catScores.length > 0) {
        categoryAverages[cat] = Math.round(catScores.reduce((a, b) => a + b, 0) / catScores.length);
      }
    });

    res.json({
      scenarioId,
      totalAttempts: sessions.length,
      uniqueUsers,
      stats: {
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        medianScore: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
        averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      },
      distribution,
      categoryAverages,
      recentAttempts: sessions.slice(0, 10).map(s => ({
        sessionId: s.id,
        userId: s.user_id,
        score: s.overall_score,
        date: s.started_at
      }))
    });
  } catch (error) {
    console.error('Error getting scenario stats:', error);
    res.status(500).json({ error: 'Failed to get scenario stats' });
  }
});

/**
 * GET /api/analysis/user-progress
 * Get overall progress trends for the current user
 */
router.get('/user-progress', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { id: userId } = req.user;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all completed sessions in the time period
    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select(`
        id,
        scenario_id,
        started_at,
        overall_score,
        category_scores,
        duration_seconds
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: true });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return res.json({
        period: { days: parseInt(days), start: startDate.toISOString() },
        totalSessions: 0,
        progress: null
      });
    }

    // Group by date for daily trends
    const dailyScores = {};
    sessions.forEach(s => {
      const date = s.started_at.split('T')[0];
      if (!dailyScores[date]) {
        dailyScores[date] = [];
      }
      if (s.overall_score !== null) {
        dailyScores[date].push(s.overall_score);
      }
    });

    const dailyAverages = Object.entries(dailyScores).map(([date, scores]) => ({
      date,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      sessionsCount: scores.length
    }));

    // Calculate overall trends
    const allScores = sessions.map(s => s.overall_score).filter(s => s !== null);
    const firstHalf = allScores.slice(0, Math.floor(allScores.length / 2));
    const secondHalf = allScores.slice(Math.floor(allScores.length / 2));

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : 0;

    // Scenario performance breakdown
    const scenarioPerformance = {};
    sessions.forEach(s => {
      if (!scenarioPerformance[s.scenario_id]) {
        scenarioPerformance[s.scenario_id] = { scores: [], attempts: 0 };
      }
      scenarioPerformance[s.scenario_id].attempts++;
      if (s.overall_score !== null) {
        scenarioPerformance[s.scenario_id].scores.push(s.overall_score);
      }
    });

    const scenarioStats = Object.entries(scenarioPerformance).map(([id, data]) => ({
      scenarioId: id,
      attempts: data.attempts,
      averageScore: data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : null,
      bestScore: data.scores.length > 0 ? Math.max(...data.scores) : null
    })).sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

    // Category trends over time
    const categoryTrends = {};
    const categories = ['empathyRapport', 'problemResolution', 'productKnowledge', 'professionalism', 'scenarioSpecific'];

    categories.forEach(cat => {
      const catScores = sessions
        .map(s => s.category_scores?.[cat]?.score)
        .filter(s => s !== undefined && s !== null);

      if (catScores.length > 0) {
        const firstHalfCat = catScores.slice(0, Math.floor(catScores.length / 2));
        const secondHalfCat = catScores.slice(Math.floor(catScores.length / 2));

        categoryTrends[cat] = {
          current: catScores[catScores.length - 1],
          average: Math.round(catScores.reduce((a, b) => a + b, 0) / catScores.length),
          trend: secondHalfCat.length > 0 && firstHalfCat.length > 0
            ? Math.round((secondHalfCat.reduce((a, b) => a + b, 0) / secondHalfCat.length) -
                        (firstHalfCat.reduce((a, b) => a + b, 0) / firstHalfCat.length))
            : 0
        };
      }
    });

    res.json({
      period: { days: parseInt(days), start: startDate.toISOString() },
      totalSessions: sessions.length,
      totalTrainingTime: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
      progress: {
        overallAverage: Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length),
        trend: Math.round(secondHalfAvg - firstHalfAvg),
        isImproving: secondHalfAvg > firstHalfAvg,
        bestScore: Math.max(...allScores),
        mostRecentScore: allScores[allScores.length - 1]
      },
      dailyAverages,
      scenarioStats,
      categoryTrends
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ error: 'Failed to get user progress' });
  }
});

export default router;
