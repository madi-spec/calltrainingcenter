/**
 * Scenario Generator Service
 *
 * Generates personalized training scenarios combining:
 * - Course/module context
 * - Customer profiles (difficulty-matched)
 * - Organization product context
 * - AI-generated situation text
 */

import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '../lib/supabase.js';

let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Get customer profiles matching the module difficulty
 */
async function getProfilesForDifficulty(difficulty) {
  const adminClient = createAdminClient();

  const difficultyRanges = {
    easy: { min: 1, max: 4 },
    medium: { min: 4, max: 7 },
    hard: { min: 7, max: 10 }
  };

  const range = difficultyRanges[difficulty] || difficultyRanges.medium;

  const { data, error } = await adminClient
    .from('customer_profiles')
    .select('*')
    .gte('close_difficulty', range.min)
    .lte('close_difficulty', range.max)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

/**
 * Get product context for an organization
 */
async function getProductContext(organizationId) {
  const adminClient = createAdminClient();

  // Fetch organization info
  const { data: org } = await adminClient
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  // Fetch packages with selling points
  const { data: packages } = await adminClient
    .from('service_packages')
    .select(`
      *,
      selling_points:package_selling_points(point),
      objections:package_objections(objection_text, recommended_response)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  // Fetch competitors
  const { data: competitors } = await adminClient
    .from('competitor_info')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  return {
    company: {
      name: org?.name || 'the pest control company',
      phone: org?.phone,
      services: org?.services || [],
      guarantees: org?.guarantees || [],
      pricing: org?.pricing || {}
    },
    packages: packages?.map(pkg => ({
      name: pkg.name,
      price: pkg.recurring_price || pkg.initial_price,
      frequency: pkg.service_frequency,
      warranty: pkg.warranty_details,
      sellingPoints: pkg.selling_points?.map(sp => sp.point) || [],
      objections: pkg.objections?.map(obj => ({
        text: obj.objection_text,
        response: obj.recommended_response
      })) || []
    })) || [],
    competitors: competitors?.map(c => ({
      name: c.name,
      pricing: c.typical_pricing,
      weaknesses: c.known_weaknesses,
      ourAdvantages: c.our_advantages
    })) || [],
    hasProducts: (packages?.length || 0) > 0
  };
}

/**
 * Determine if a scenario should result in a successful close
 */
function determineOutcome(difficulty, profile) {
  // Base close rates by difficulty
  const baseRates = {
    easy: 0.75,
    medium: 0.65,
    hard: 0.55
  };

  const baseRate = baseRates[difficulty] || 0.65;

  // Adjust based on profile close_difficulty (1-10)
  // Higher difficulty = lower chance of closing
  const profileAdjustment = (5 - (profile.close_difficulty || 5)) * 0.03;

  const finalRate = Math.max(0.3, Math.min(0.9, baseRate + profileAdjustment));

  return Math.random() < finalRate;
}

/**
 * Generate scenario text using Claude
 */
async function generateScenarioText(module, profile, productContext, index) {
  const courseCategory = module.course?.category || 'service';
  const moduleName = module.name;
  const companyName = productContext.company.name;

  const prompt = `Generate a realistic customer service training scenario for a pest control company.

## Context
- Company: ${companyName}
- Course Category: ${courseCategory}
- Module: ${moduleName}
- Difficulty: ${module.difficulty}

## Customer Profile
- Name: ${profile.name}
- Personality: ${(profile.personality_traits || []).join(', ')}
- Communication Style: ${profile.communication_style}
- Age Range: ${profile.age_range}

## Company Products
${productContext.hasProducts ? productContext.packages.map(pkg =>
  `- ${pkg.name}: $${pkg.price}/${pkg.frequency || 'service'}`
).join('\n') : 'No specific packages configured - use generic pest control services'}

## Requirements
Generate a brief, realistic scenario description (2-3 sentences) and an opening line the customer would say when calling.

The scenario should:
1. Match the course category (${courseCategory})
2. Reflect the customer's personality traits
3. Be appropriate for a ${module.difficulty} difficulty call
4. Reference the company or its services naturally

Respond with JSON only:
{
  "situation": "Description of why the customer is calling and their state of mind",
  "openingLine": "What the customer says when the call connects"
}`;

  try {
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating scenario text:', error);
  }

  // Fallback to template-based generation
  return {
    situation: generateFallbackSituation(module, profile, productContext),
    openingLine: generateFallbackOpeningLine(profile)
  };
}

/**
 * Fallback situation generator (no AI)
 */
function generateFallbackSituation(module, profile, productContext) {
  const category = module.course?.category || 'service';
  const companyName = productContext.company.name;
  const traits = profile.personality_traits || [];

  const templates = {
    sales: [
      `${profile.name} is calling ${companyName} to inquire about pest control services. They are ${traits[0] || 'curious'} and want to understand their options.`,
      `${profile.name} saw an advertisement and is comparing pest control providers. They tend to be ${traits[0] || 'analytical'} when making decisions.`,
      `${profile.name} was referred by a neighbor and wants to learn about ${companyName}'s services and pricing.`
    ],
    service: [
      `${profile.name} is an existing customer calling about a service concern. They are feeling ${traits[0] || 'concerned'} about the situation.`,
      `${profile.name} has questions about their upcoming service appointment with ${companyName}.`,
      `${profile.name} wants to discuss their service history and possibly make changes to their plan.`
    ],
    retention: [
      `${profile.name} is considering canceling their ${companyName} service. They seem ${traits[0] || 'frustrated'} about something.`,
      `${profile.name} received a competitor's offer and is thinking about switching from ${companyName}.`,
      `${profile.name} is calling about their account due to budget concerns and may want to cancel.`
    ]
  };

  const options = templates[category] || templates.service;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Fallback opening line generator (no AI)
 */
function generateFallbackOpeningLine(profile) {
  const style = profile.communication_style || 'direct';

  const templates = {
    direct: [
      `Hi, this is ${profile.name}. I need to speak with someone about pest control.`,
      `Hello? I'm calling about your services.`,
      `Yes, hi. I have some questions about your pricing.`
    ],
    friendly: [
      `Hi there! This is ${profile.name}. How are you doing today?`,
      `Hello! I hope I'm not catching you at a bad time.`,
      `Hi! I was hoping you could help me with something.`
    ],
    analytical: [
      `Hello, I'm ${profile.name}. I've been researching pest control companies and have some questions.`,
      `Hi, I need some detailed information about your service packages.`,
      `Hello, I'm comparing options and need specific details about your services.`
    ],
    emotional: [
      `Oh thank goodness someone answered! I really need help with a pest problem.`,
      `Hi... I'm so stressed about this situation.`,
      `Hello? I'm really hoping you can help me today.`
    ],
    confrontational: [
      `Yeah, I need to talk to someone about my account.`,
      `Hello. I have some concerns that need to be addressed.`,
      `Hi, I've got an issue that needs resolving right now.`
    ],
    guarded: [
      `Hello. I'm calling about... well, I have some questions.`,
      `Hi. Before I say anything, I need to know some things.`,
      `Yes, hello. I'm not sure if I need your services but...`
    ],
    verbose: [
      `Oh hi there! So I was just telling my neighbor the other day about this pest problem I've been having...`,
      `Hello! I hope you have a moment because I have quite a story to tell you.`,
      `Hi! Let me tell you about what happened this morning...`
    ]
  };

  const options = templates[style] || templates.direct;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Main function: Generate scenarios for a module
 */
export async function generateScenariosForModule(userId, organizationId, module) {
  const adminClient = createAdminClient();

  // Get profiles for this difficulty
  const profiles = await getProfilesForDifficulty(module.difficulty);
  if (profiles.length === 0) {
    throw new Error('No customer profiles available for this difficulty level');
  }

  // Get product context
  const productContext = await getProductContext(organizationId);

  // Generate scenarios
  const scenarioCount = module.scenario_count || 10;
  const scenarios = [];

  for (let i = 0; i < scenarioCount; i++) {
    // Pick a random profile (with some variety)
    const profileIndex = i % profiles.length;
    const profile = profiles[profileIndex];

    // Determine outcome
    const willClose = determineOutcome(module.difficulty, profile);

    // Generate scenario text (can use AI or fallback)
    let scenarioText;
    if (i < 3) {
      // Use AI for first few scenarios
      scenarioText = await generateScenarioText(module, profile, productContext, i);
    } else {
      // Use fallback for the rest to save API calls
      scenarioText = {
        situation: generateFallbackSituation(module, profile, productContext),
        openingLine: generateFallbackOpeningLine(profile)
      };
    }

    scenarios.push({
      user_id: userId,
      module_id: module.id,
      profile_id: profile.id,
      sequence_number: i + 1,
      situation_text: scenarioText.situation,
      opening_line: scenarioText.openingLine,
      will_close: willClose,
      close_stage: willClose ? Math.floor(Math.random() * 3) + 1 : null,
      status: 'pending'
    });
  }

  // Insert all scenarios
  const { data, error } = await adminClient
    .from('generated_scenarios')
    .insert(scenarios)
    .select(`
      *,
      profile:customer_profiles(name, gender, age_range, personality_traits, communication_style)
    `);

  if (error) throw error;

  return data;
}

/**
 * Regenerate a single scenario (if skipped or needs refresh)
 */
export async function regenerateScenario(userId, organizationId, moduleId, sequenceNumber) {
  const adminClient = createAdminClient();

  // Get module
  const { data: module } = await adminClient
    .from('course_modules')
    .select('*, course:courses(*)')
    .eq('id', moduleId)
    .single();

  if (!module) throw new Error('Module not found');

  // Get profiles
  const profiles = await getProfilesForDifficulty(module.difficulty);
  const profile = profiles[Math.floor(Math.random() * profiles.length)];

  // Get product context
  const productContext = await getProductContext(organizationId);

  // Generate new scenario
  const willClose = determineOutcome(module.difficulty, profile);
  const scenarioText = await generateScenarioText(module, profile, productContext, 0);

  // Update the scenario
  const { data, error } = await adminClient
    .from('generated_scenarios')
    .update({
      profile_id: profile.id,
      situation_text: scenarioText.situation,
      opening_line: scenarioText.openingLine,
      will_close: willClose,
      close_stage: willClose ? Math.floor(Math.random() * 3) + 1 : null,
      status: 'pending'
    })
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .eq('sequence_number', sequenceNumber)
    .select(`
      *,
      profile:customer_profiles(name, gender, age_range, personality_traits, communication_style)
    `)
    .single();

  if (error) throw error;

  return data;
}

export default {
  generateScenariosForModule,
  regenerateScenario,
  getProfilesForDifficulty,
  getProductContext
};
