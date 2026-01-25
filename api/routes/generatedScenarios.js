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

    // Get organization info for company context
    const { data: org } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', req.organization.id)
      .single();

    // Transform to match the scenario format expected by PreCall
    const profile = genScenario.profile || {};
    const module = genScenario.module || {};
    const course = module.course || {};

    const scenario = {
      id: genScenario.id,
      type: 'generated', // Flag to indicate this is a generated scenario
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

      // Objectives based on course category
      csrObjective: getObjectiveForCategory(course.category, module.name),
      scoringFocus: getScoringFocusForCategory(course.category),

      // Behavior triggers based on profile
      deescalationTriggers: profile.deescalation_triggers || 'Showing empathy and understanding their concerns',
      escalationTriggers: profile.escalation_triggers || 'Being dismissive or rushing through the conversation',
      resolutionConditions: genScenario.will_close
        ? 'Customer is open to purchasing if you handle the conversation well'
        : 'Customer may not purchase today, focus on building rapport',

      // Module tracking info
      moduleId: module.id,
      sequenceNumber: genScenario.sequence_number,
      willClose: genScenario.will_close,

      // Voice settings - use valid Retell voice IDs based on gender
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

export default router;
