/**
 * Generated Scenarios API Routes
 *
 * Handles fetching individual generated scenarios for practice.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import { getVoiceForProfile as getVoiceFromService } from '../services/voiceService.js';

const router = Router();

/**
 * GET /api/generated-scenarios/:id
 * Get a single generated scenario with full details for practice
 */
router.get('/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get the generated scenario with profile and module info
    const { data: genScenario, error } = await adminClient
      .from('generated_scenarios')
      .select(`
        *,
        profile:customer_profiles(*),
        module:course_modules(
          *,
          course:courses(*)
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!genScenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Get organization info and scenario template in parallel
    const templateFetch = genScenario.template_id
      ? adminClient.from('scenario_templates').select('*').eq('id', genScenario.template_id).single()
      : Promise.resolve({ data: null });

    const [{ data: org }, { data: template }] = await Promise.all([
      adminClient.from('organizations').select('*').eq('id', req.organization.id).single(),
      templateFetch
    ]);

    // Transform to match the scenario format expected by PreCall
    const profile = genScenario.profile || {};
    const module = genScenario.module || {};
    const course = module.course || {};

    // Use template objectives when available, fall back to generic
    const csrObjective = template?.csr_objectives
      || getObjectiveForCategory(course.category, module.name);
    const scoringFocus = template?.scoring_focus
      ? parseScoringFocus(template.scoring_focus)
      : getScoringFocusForCategory(course.category);
    const resolutionConditions = template?.resolution_conditions
      || (genScenario.will_close
        ? 'Customer is open to purchasing if you handle the conversation well'
        : 'Customer may not purchase today, focus on building rapport');
    const escalationTriggers = template?.escalation_triggers
      || profile.escalation_triggers
      || 'Being dismissive or rushing through the conversation';
    const deescalationTriggers = template?.deescalation_triggers
      || profile.deescalation_triggers
      || 'Showing empathy and understanding their concerns';

    const scenario = {
      id: genScenario.id,
      type: 'generated',
      name: `${course.name || 'Practice'}: ${module.name || 'Scenario'}`,
      difficulty: module.difficulty || 'medium',
      category: course.category || 'service',

      // Customer profile
      customerName: profile.name || 'Customer',
      personality: (profile.personality_traits || []).join(', '),
      emotionalState: profile.communication_style || 'neutral',
      customerBackground: profile.backstory || `${profile.age_range || 'Adult'} homeowner`,

      // Situation
      situation: genScenario.situation_text,
      openingLine: genScenario.opening_line,
      keyPointsToMention: profile.typical_objections || [],

      // Objectives — template-specific or generic fallback
      csrObjective,
      scoringFocus,

      // Behavior triggers — template-specific or generic fallback
      deescalationTriggers,
      escalationTriggers,
      resolutionConditions,

      // Template extras
      customerGoals: template?.customer_goals || null,

      // Module tracking info
      moduleId: module.id,
      sequenceNumber: genScenario.sequence_number,
      willClose: genScenario.will_close,

      // Voice settings
      voiceId: profile.voice_id || await getVoiceForProfile(profile),

      // Company context
      company: {
        name: org?.name || 'the company',
        phone: org?.phone,
        pricing: org?.pricing || {},
        guarantees: org?.guarantees || [],
        services: org?.services || []
      }
    };

    res.json({ success: true, scenario });
  } catch (error) {
    console.error('Error fetching generated scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a valid Retell voice ID based on customer profile
 * Now uses the voice service which caches available voices from Retell
 */
async function getVoiceForProfile(profile) {
  const voiceId = await getVoiceFromService(profile);
  // Fallback if voice service returns null
  return voiceId || 'default';
}

/**
 * Parse scoring_focus from template — can be JSON string or object
 * Returns an array of focus area names for display
 */
function parseScoringFocus(scoringFocus) {
  try {
    const parsed = typeof scoringFocus === 'string' ? JSON.parse(scoringFocus) : scoringFocus;
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .sort(([, a], [, b]) => b - a)
        .map(([key, weight]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return `${label} (${Math.round(weight * 100)}%)`;
        });
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * Get objective text based on course category
 */
function getObjectiveForCategory(category, moduleName) {
  const objectives = {
    sales: `Convert this lead into a sale. Listen to their needs, address objections, and guide them toward scheduling service.`,
    service: `Provide excellent customer service. Address their concerns professionally and ensure they feel valued.`,
    retention: `Retain this customer. Understand their reason for considering leaving and present compelling reasons to stay.`,
    objection_handling: `Handle the customer's objections effectively. Acknowledge their concerns and provide value-based responses.`,
    de_escalation: `De-escalate this situation. Show empathy, take ownership, and find a resolution that satisfies the customer.`,
    upselling: `Identify opportunities to provide additional value. Suggest relevant upgrades or add-ons that meet their needs.`
  };

  return objectives[category] || `Complete this ${moduleName || 'practice'} scenario successfully.`;
}

/**
 * Get scoring focus areas based on course category
 */
function getScoringFocusForCategory(category) {
  const focusAreas = {
    sales: ['Building rapport', 'Needs discovery', 'Handling objections', 'Closing techniques'],
    service: ['Professionalism', 'Problem resolution', 'Empathy', 'Clear communication'],
    retention: ['Understanding concerns', 'Value proposition', 'Negotiation', 'Relationship building'],
    objection_handling: ['Active listening', 'Acknowledging concerns', 'Providing solutions', 'Confidence'],
    de_escalation: ['Empathy', 'Patience', 'Taking ownership', 'Finding solutions'],
    upselling: ['Needs identification', 'Value presentation', 'Timing', 'Soft selling']
  };

  return focusAreas[category] || ['Professionalism', 'Communication', 'Problem solving', 'Customer satisfaction'];
}

/**
 * GET /api/generated-scenarios/:id/branching
 * Get branching points for a scenario (from its template)
 */
router.get('/:id/branching', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Get the generated scenario to find its template
    const { data: genScenario } = await adminClient
      .from('generated_scenarios')
      .select('template_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!genScenario || !genScenario.template_id) {
      return res.json({ branching_points: null });
    }

    // Get the template's branching points
    const { data: template, error } = await adminClient
      .from('scenario_templates')
      .select('branching_points')
      .eq('id', genScenario.template_id)
      .single();

    if (error) throw error;

    res.json({
      branching_points: template?.branching_points || null
    });
  } catch (error) {
    console.error('Error fetching branching points:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
