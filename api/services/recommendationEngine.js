import { createAdminClient, TABLES } from '../lib/supabase.js';

/**
 * Recommendation Engine Service
 * Analyzes user skill profiles and generates personalized recommendations
 */

const SKILL_CATEGORIES = [
  'empathy',
  'problem_solving',
  'product_knowledge',
  'communication',
  'objection_handling',
  'closing',
  'time_management'
];

/**
 * Update a user's skill profile based on a completed training session
 */
export async function updateSkillProfile(userId, orgId, sessionData) {
  const supabase = createAdminClient();

  try {
    // Get current skill profile
    let { data: profile, error } = await supabase
      .from(TABLES.SKILL_PROFILES)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Create profile if doesn't exist
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from(TABLES.SKILL_PROFILES)
        .insert({
          user_id: userId,
          org_id: orgId,
          category_scores: {},
          total_sessions_analyzed: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      profile = newProfile;
    }

    // Extract skill scores from session
    const sessionSkills = extractSkillsFromSession(sessionData);

    // Update category scores (weighted average)
    const currentScores = profile.category_scores || {};
    const newScores = {};
    const sessionsCount = (profile.total_sessions_analyzed || 0) + 1;

    for (const skill of SKILL_CATEGORIES) {
      const currentScore = currentScores[skill];
      const newScore = sessionSkills[skill];

      if (newScore !== null && newScore !== undefined) {
        if (currentScore !== null && currentScore !== undefined) {
          // Weighted average: give more weight to recent scores
          const weight = Math.min(0.3, 1 / sessionsCount);
          newScores[skill] = Math.round(currentScore * (1 - weight) + newScore * weight);
        } else {
          newScores[skill] = newScore;
        }

        // Record in skill history
        await supabase.from(TABLES.SKILL_HISTORY).insert({
          user_id: userId,
          skill_category: skill,
          score: newScore,
          session_id: sessionData.session_id
        });
      } else {
        newScores[skill] = currentScore;
      }
    }

    // Calculate strongest and weakest skills
    const scoredSkills = Object.entries(newScores)
      .filter(([, score]) => score !== null && score !== undefined)
      .sort((a, b) => b[1] - a[1]);

    const strongest = scoredSkills.slice(0, 3).map(([skill]) => skill);
    const weakest = scoredSkills.slice(-3).reverse().map(([skill]) => skill);

    // Update profile
    await supabase
      .from(TABLES.SKILL_PROFILES)
      .update({
        category_scores: newScores,
        strongest_skills: strongest,
        weakest_skills: weakest,
        total_sessions_analyzed: sessionsCount,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return { newScores, strongest, weakest };
  } catch (error) {
    console.error('Error updating skill profile:', error);
    throw error;
  }
}

/**
 * Extract skill scores from a training session's analysis
 */
function extractSkillsFromSession(sessionData) {
  const skills = {};
  const categories = sessionData.category_scores || sessionData.categories || {};

  // Map session categories to skill categories
  const categoryMapping = {
    empathyRapport: 'empathy',
    problemResolution: 'problem_solving',
    productKnowledge: 'product_knowledge',
    professionalism: 'communication',
    scenarioSpecific: null // Skip or map based on scenario type
  };

  for (const [key, data] of Object.entries(categories)) {
    const skillKey = categoryMapping[key];
    if (skillKey && data?.score !== undefined) {
      skills[skillKey] = data.score;
    }
  }

  return skills;
}

/**
 * Generate personalized recommendations for a user
 */
export async function generateRecommendations(userId, orgId) {
  const supabase = createAdminClient();

  try {
    // Get user's skill profile
    const { data: profile, error: profileError } = await supabase
      .from(TABLES.SKILL_PROFILES)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') throw profileError;

    const weakSkills = profile?.weakest_skills || [];
    const categoryScores = profile?.category_scores || {};

    // Get scenarios tagged with user's weak skills
    const { data: taggedScenarios } = await supabase
      .from(TABLES.SCENARIO_SKILL_TAGS)
      .select('scenario_id, primary_skill, secondary_skills')
      .in('primary_skill', weakSkills.length > 0 ? weakSkills : SKILL_CATEGORIES);

    const scenarioIds = taggedScenarios?.map(t => t.scenario_id) || [];

    // Get scenario details
    let scenarios = [];
    if (scenarioIds.length > 0) {
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('id, name, difficulty, category')
        .in('id', scenarioIds)
        .limit(10);

      scenarios = scenarioData || [];
    }

    // Clear existing active recommendations
    await supabase
      .from(TABLES.RECOMMENDATIONS)
      .update({ status: 'dismissed' })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Generate new recommendations
    const recommendations = [];

    // Scenario recommendations for weak skills
    for (const scenario of scenarios.slice(0, 5)) {
      const tag = taggedScenarios.find(t => t.scenario_id === scenario.id);
      const targetSkill = tag?.primary_skill || weakSkills[0];
      const currentScore = categoryScores[targetSkill];

      recommendations.push({
        user_id: userId,
        org_id: orgId,
        scenario_id: scenario.id,
        recommendation_type: 'scenario',
        reason: `Practice ${targetSkill.replace(/_/g, ' ')} - currently at ${currentScore || 'N/A'}%`,
        target_skill: targetSkill,
        priority: currentScore ? 10 - Math.floor(currentScore / 10) : 5
      });
    }

    // Skill focus recommendations
    for (const skill of weakSkills.slice(0, 2)) {
      const score = categoryScores[skill];
      if (score && score < 70) {
        recommendations.push({
          user_id: userId,
          org_id: orgId,
          recommendation_type: 'skill_focus',
          reason: `Focus on improving ${skill.replace(/_/g, ' ')} (${score}%)`,
          target_skill: skill,
          priority: 10 - Math.floor(score / 10)
        });
      }
    }

    // Warmup recommendation if consistently low scores
    const avgScore = Object.values(categoryScores).filter(Boolean).reduce((a, b) => a + b, 0) /
      Object.values(categoryScores).filter(Boolean).length;

    if (avgScore && avgScore < 65) {
      recommendations.push({
        user_id: userId,
        org_id: orgId,
        recommendation_type: 'warmup',
        reason: 'Pre-call warmups can help improve your readiness',
        target_skill: weakSkills[0] || 'general',
        priority: 7
      });
    }

    // Insert recommendations
    if (recommendations.length > 0) {
      await supabase.from(TABLES.RECOMMENDATIONS).insert(recommendations);
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Get active recommendations for a user
 */
export async function getRecommendations(userId) {
  const supabase = createAdminClient();

  const { data: recommendations, error } = await supabase
    .from(TABLES.RECOMMENDATIONS)
    .select(`
      *,
      scenario:scenarios(id, name, difficulty, category)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('priority', { ascending: false })
    .limit(10);

  if (error) throw error;
  return recommendations || [];
}

/**
 * Get user's skill profile
 */
export async function getSkillProfile(userId) {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from(TABLES.SKILL_PROFILES)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return profile;
}

/**
 * Get skill history for trending
 */
export async function getSkillHistory(userId, days = 30) {
  const supabase = createAdminClient();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { data: history, error } = await supabase
    .from(TABLES.SKILL_HISTORY)
    .select('skill_category, score, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', fromDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (error) throw error;
  return history || [];
}

/**
 * Update skill profile from explicit user/manager feedback (pass/fail).
 * This is the primary tuning mechanism after initial scenario calibration.
 * Pass = bump relevant skills toward 80, Fail = pull toward 40.
 */
export async function updateSkillProfileFromFeedback(userId, orgId, sessionId, passed) {
  const supabase = createAdminClient();

  try {
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('category_scores')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    const categories = session.category_scores || {};
    const feedbackScores = {};

    for (const [key, data] of Object.entries(categories)) {
      const original = data?.score;
      if (original === undefined || original === null) continue;

      if (passed) {
        // Pass: nudge scores up — floor of 70 for any category
        feedbackScores[key] = { ...data, score: Math.max(original, 70) };
      } else {
        // Fail: nudge scores down by 10, floor of 20
        feedbackScores[key] = { ...data, score: Math.max(original - 10, 20) };
      }
    }

    await updateSkillProfile(userId, orgId, {
      session_id: sessionId,
      categories: feedbackScores,
      category_scores: feedbackScores
    });

    return { success: true, passed, adjustedCategories: feedbackScores };
  } catch (error) {
    console.error('Error updating skill profile from feedback:', error);
    throw error;
  }
}

export default {
  updateSkillProfile,
  updateSkillProfileFromFeedback,
  generateRecommendations,
  getRecommendations,
  getSkillProfile,
  getSkillHistory
};
