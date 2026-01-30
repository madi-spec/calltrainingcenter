import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Retell from 'retell-sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Import route handlers
import authRoutes from './routes/auth.js';
import trainingRoutes from './routes/training.js';
import assignmentsRoutes from './routes/assignments.js';
import suitesRoutes from './routes/suites.js';
import branchesRoutes from './routes/branches.js';
import billingRoutes from './routes/billing.js';
import reportsRoutes from './routes/reports.js';
import gamificationRoutes from './routes/gamification.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';
import productsRoutes from './routes/products.js';
import teamsRoutes from './routes/teams.js';
import coursesRoutes from './routes/courses.js';
import modulesRoutes from './routes/modules.js';
import practiceRoutes from './routes/practice.js';
import organizationsRoutes from './routes/organizations.js';
import invitationsRoutes from './routes/invitations.js';
import generatedScenariosRoutes from './routes/generatedScenarios.js';
import challengesRoutes from './routes/challenges.js';
import streaksRoutes from './routes/streaks.js';
import bookmarksRoutes from './routes/bookmarks.js';
import socialRoutes from './routes/social.js';
import onboardingRoutes from './routes/onboarding.js';
import warmupsRoutes from './routes/warmups.js';
import microlearningRoutes from './routes/microlearning.js';
import recommendationsRoutes from './routes/recommendations.js';
import liveRoutes from './routes/live.js';
import skillGapsRoutes from './routes/skillGaps.js';
import roiRoutes from './routes/roi.js';
import analysisRoutes from './routes/analysis.js';
import pwaRoutes from './routes/pwa.js';
import calendarRoutes from './routes/calendar.js';
import recordingsRoutes from './routes/recordings.js';
import helpAgentRoutes from './routes/helpAgent.js';

// Import services
import {
  refreshVoiceCache,
  getAvailableVoices,
  getVoiceCacheInfo,
  getValidVoiceId
} from './services/voiceService.js';

// Import middleware and helpers
import { optionalAuthMiddleware } from './lib/auth.js';
import { createAdminClient, TABLES } from './lib/supabase.js';

const app = express();

// Middleware
app.use(cors());

// Stripe webhook needs raw body for signature verification
// This route must be registered BEFORE the json parser
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============ UTILITIES ============

// Template Engine
function processTemplate(template, context) {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined && value !== null ? String(value) : match;
  });
}

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

// Default config (in-memory for serverless - will be replaced by org settings from DB)
let configStore = {
  company: {
    name: 'Accel Pest & Termite Control',
    phone: '(877) 716-7522',
    website: 'https://www.accelpest.com/',
    logo: 'https://cdn.accelpest.com/wp-content/uploads/2024/01/NEW-Accel-Logo-PMS116-scaled.png',
    colors: { primary: '#003388', secondary: '#8217', accent: '#32373c' },
    serviceAreas: ['Richmond', 'Virginia Beach', 'Hampton', 'Canton', 'Newport News'],
    services: ['Pest Control', 'Termite Control', 'Mosquito Control', 'Rodent Control', 'Ant Control', 'Bed Bug Control'],
    pricing: { quarterlyPrice: '42', initialPrice: null, hasPublicPricing: true },
    guarantees: ['100% Satisfaction Guarantee', 'Free re-service'],
    valuePropositions: ['QualityPro accredited company', 'Same day service available', '98% customer satisfaction'],
    businessHours: 'Mon-Sat 7am-7pm'
  },
  settings: { defaultVoiceId: '11labs-Brian', callTimeout: 600000 }
};

// Scenarios data
const scenarios = [
  {
    id: 'cancellation-save',
    name: 'The Cancellation Save',
    difficulty: 'hard',
    category: 'Retention',
    estimatedDuration: '5-8 minutes',
    customerName: 'Margaret Thompson',
    personality: 'Direct, frustrated but reasonable, values being heard',
    emotionalState: 'Frustrated, considering leaving',
    voiceId: '11labs-Aria',
    situation: 'Margaret has been a {{company.name}} customer for 3 years but wants to cancel after seeing a competitor\'s lower price ($99/quarter vs your ${{company.pricing.quarterlyPrice}}/quarter). She\'s not angry, just practical about money.',
    customerBackground: 'Retired teacher, been with {{company.name}} for 3 years, always paid on time. Saw a mailer from a competitor offering $99/quarter service.',
    openingLine: 'Hi, I need to cancel my pest control service please.',
    customerGoals: 'Cancel service to save money, unless given a compelling reason to stay',
    csrObjective: 'Retain the customer by demonstrating value, offering solutions, and potentially matching or beating the competitor\'s offer',
    keyPointsToMention: ['Competitor is offering $99/quarter', 'Husband saw the mailer', 'We\'ve never had problems with your service', 'It\'s just about the money'],
    escalationTriggers: 'CSR is dismissive of concerns, doesn\'t acknowledge loyalty, or is pushy without listening first',
    deescalationTriggers: 'CSR acknowledges her loyalty, genuinely listens to concerns, offers real value or price match',
    resolutionConditions: 'Will stay if: offered a price match, loyalty discount, or CSR demonstrates clear value difference.',
    scoringFocus: ['Empathy', 'Retention techniques', 'Value articulation', 'Negotiation'],
    systemPrompt: 'You are Margaret Thompson, a 68-year-old retired teacher who has been a loyal {{company.name}} customer for 3 years. You\'re calling to cancel because a competitor sent a mailer offering $99/quarter. You\'re not angry - you\'ve always been happy with the service - but your husband Bob saw the mailer and is pushing you to switch. Be direct but polite. If the CSR acknowledges your loyalty and offers a real solution, you\'re open to staying.'
  },
  {
    id: 'furious-callback',
    name: 'The Furious Callback',
    difficulty: 'hard',
    category: 'Complaint Resolution',
    estimatedDuration: '6-10 minutes',
    customerName: 'David Martinez',
    personality: 'Hot-tempered, loud, but fair when truly heard',
    emotionalState: 'Extremely angry, feeling ignored',
    voiceId: '11labs-Jason',
    situation: 'David had a technician visit yesterday for ants. This morning he woke up to ants all over his kitchen counter - worse than before. This is the second time treatment hasn\'t worked.',
    customerBackground: 'Young professional, busy schedule. Had ant treatment 3 weeks ago that didn\'t work, technician came again yesterday, now ants are worse.',
    openingLine: 'I am SO done with you people! I need to speak to a manager RIGHT NOW!',
    customerGoals: 'Get the ant problem ACTUALLY fixed, feel heard and respected, possibly get compensation',
    csrObjective: 'De-escalate the angry customer, apologize sincerely, schedule immediate re-treatment, and retain the relationship',
    keyPointsToMention: ['This is the SECOND time treatment didn\'t work', 'Took time off work twice already', 'Woke up to ants crawling on my coffee maker'],
    escalationTriggers: 'CSR reads from script, doesn\'t apologize sincerely, tries to blame him',
    deescalationTriggers: 'Sincere apology, acknowledgment of failure, immediate action plan, offer of compensation/credit',
    resolutionConditions: 'Will calm down if: CSR truly apologizes, takes ownership, offers same-day visit and service credit.',
    scoringFocus: ['De-escalation', 'Empathy', 'Problem ownership', 'Service recovery'],
    systemPrompt: 'You are David Martinez, a 32-year-old marketing manager who is FURIOUS. You\'ve had {{company.name}} come out twice for ants and this morning you woke up to ants crawling on your kitchen counter. Start the call very angry and demanding a manager. However, you\'re fundamentally fair - if the CSR genuinely apologizes and offers real solutions, you will gradually calm down.'
  },
  {
    id: 'price-shopper',
    name: 'The Price Shopper',
    difficulty: 'medium',
    category: 'Sales',
    estimatedDuration: '4-6 minutes',
    customerName: 'Jennifer Walsh',
    personality: 'Analytical, comparison-focused, skeptical of sales pitches',
    emotionalState: 'Neutral, evaluating options',
    voiceId: '11labs-Jenny',
    situation: 'Jennifer is calling {{company.name}} as part of her research - she\'s getting quotes from 3 companies. She\'s focused purely on price.',
    customerBackground: 'New homeowner, first time hiring pest control. Has already called one competitor who quoted $89/quarter. Very analytical.',
    openingLine: 'Hi, I\'m just calling to get a quote for quarterly pest control service.',
    customerGoals: 'Get a clear price quote, understand exactly what\'s included, make an informed decision',
    csrObjective: 'Provide clear pricing while effectively communicating value to differentiate from cheaper competitors',
    keyPointsToMention: ['I\'m getting quotes from three companies', 'Someone already quoted me $89 a quarter', 'What exactly is included?'],
    escalationTriggers: 'CSR is vague about pricing, uses too much jargon, or is pushy',
    deescalationTriggers: 'Clear pricing, specific value explanations, no pressure',
    resolutionConditions: 'Will consider {{company.name}} if: CSR clearly explains pricing AND articulates specific value differences.',
    scoringFocus: ['Value communication', 'Handling objections', 'Product knowledge', 'Consultative selling'],
    systemPrompt: 'You are Jennifer Walsh, a 35-year-old financial analyst who just bought her first home. You\'re calling {{company.name}} as one of 3 pest control companies you\'re comparing. Stay neutral and analytical. Push back on vague value claims - ask for specifics. Mention that you already got a quote for $89/quarter from another company.'
  },
  {
    id: 'new-customer-inquiry',
    name: 'The New Customer Inquiry',
    difficulty: 'easy',
    category: 'Sales',
    estimatedDuration: '3-5 minutes',
    customerName: 'Michael Torres',
    personality: 'Friendly, new to pest control, asks lots of questions',
    emotionalState: 'Curious, slightly anxious about pest issue',
    voiceId: '11labs-Adrian',
    situation: 'Michael just moved into a new home and found some roaches in the kitchen. He\'s never hired pest control before and has basic questions.',
    customerBackground: 'First-time homeowner, 28 years old, just moved in last week. Found roaches and is a bit grossed out.',
    openingLine: 'Hi, um, I just moved into a new house and I\'ve been seeing some roaches. I\'ve never had to deal with this before - how does pest control work?',
    customerGoals: 'Understand how pest control works, get pricing, and potentially schedule first service',
    csrObjective: 'Educate the new customer, build trust, answer questions clearly, and book the initial service',
    keyPointsToMention: ['I\'ve never hired pest control before', 'How often do you need to come out?', 'Is it safe for my dog?', 'How soon can you come?'],
    escalationTriggers: 'CSR is condescending, uses too much jargon, or rushes the call',
    deescalationTriggers: 'N/A - customer starts positive',
    resolutionConditions: 'Will book if: CSR is patient, answers questions clearly, and the price seems reasonable.',
    scoringFocus: ['Customer education', 'Clear communication', 'Building trust', 'Closing skills'],
    systemPrompt: 'You are Michael Torres, a 28-year-old who just bought his first home. You found roaches in your kitchen and you\'re kind of freaked out. Ask genuine beginner questions: How does this work? How often do you come? Is it safe for my dog Max? You\'re ready to book if the CSR is helpful and patient.'
  },
  {
    id: 'wildlife-emergency',
    name: 'The Wildlife Emergency',
    difficulty: 'medium',
    category: 'Emergency Response',
    estimatedDuration: '4-6 minutes',
    customerName: 'Karen Mitchell',
    personality: 'Panicked but cooperative, needs reassurance',
    emotionalState: 'Scared, anxious, needs immediate help',
    voiceId: '11labs-Jenny',
    situation: 'Karen can hear scratching and movement in her attic - she thinks there\'s an animal up there. She\'s home alone with her kids and is scared.',
    customerBackground: 'Existing customer, single mom with two young kids (ages 5 and 7). Home alone, scared of what might be in the attic.',
    openingLine: 'Oh thank god you answered! There\'s something in my attic - I can hear it moving around up there. I\'m here alone with my kids and I don\'t know what to do!',
    customerGoals: 'Get someone out immediately, be reassured that it\'s going to be okay',
    csrObjective: 'Calm the customer, gather necessary information, schedule emergency service, and provide reassurance',
    keyPointsToMention: ['I can hear scratching in the attic right now', 'I\'m here alone with my two kids', 'What if it comes down into the house?', 'How soon can someone get here?'],
    escalationTriggers: 'CSR is dismissive of fear, can\'t get anyone out today, or doesn\'t provide reassurance',
    deescalationTriggers: 'CSR is calm and reassuring, confirms someone can come soon, provides safety tips',
    resolutionConditions: 'Will be satisfied if: CSR calms her down, schedules same-day service, and provides reassurance about safety.',
    scoringFocus: ['Empathy', 'Urgency handling', 'Reassurance', 'Emergency scheduling'],
    systemPrompt: 'You are Karen Mitchell, a 35-year-old single mom with two young kids (Emma, 5 and Jake, 7). You can hear scratching and movement in your attic and you\'re scared. Call sounding panicked but not hysterical. Your main concerns: Is it dangerous? Will it come down? How soon can someone come? Calm down significantly if the CSR is soothing and confirms they can help soon.'
  }
];

// ============ LAZY CLIENTS ============

let anthropicClient = null;
let retellClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getRetellClient() {
  if (!retellClient) {
    retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY });
  }
  return retellClient;
}

// ============ PROMPTS ============

// Default prompt templates (can be overridden by organization settings)
const DEFAULT_AGENT_PROMPT_TEMPLATE = `You are playing the role of a customer calling {{company.name}}. You are participating in a training simulation for customer service representatives.

## Your Character
Name: {{scenario.customerName}}
Personality: {{scenario.personality}}
Emotional State: {{scenario.emotionalState}}
Background: {{scenario.customerBackground}}

## The Situation
{{scenario.situation}}

## Your Goals
{{scenario.customerGoals}}

## How to Behave
- Stay in character throughout the call
- React naturally to what the CSR says
- Escalate if: {{scenario.escalationTriggers}}
- Calm down if: {{scenario.deescalationTriggers}}
- Use natural speech patterns with occasional filler words
- Don't be a pushover - advocate for yourself realistically

## Company Context (What You Know About the Company)
- Company: {{company.name}}
- Phone: {{company.phone}}
- Services offered: {{company.services}}
- Guarantees: {{company.guarantees}}
- What makes them different: {{company.valuePropositions}}

## Pricing Information (What You Might Ask About)
- Monthly pricing starts around: ${'$'}{{company.pricing.monthlyPrice}}/month
- Initial service fee: ${'$'}{{company.pricing.initialPrice}}
- Price range: {{company.pricing.priceRange}}

## Service Packages Available
{{company.packages}}

## Resolution Conditions
{{scenario.resolutionConditions}}

Remember: This is training - challenge the CSR but be fair. Ask about specific packages and pricing when relevant to your scenario.`;

const DEFAULT_COACHING_SYSTEM_PROMPT = `You are an expert CSR coach specializing in pest control and home services customer service training.
You understand what drives revenue and customer retention for pest control companies:
- Converting inquiries into booked appointments (the #1 metric)
- Getting customers on recurring service plans vs one-time treatments
- Handling price objections by communicating value, not discounting
- Creating urgency appropriately for pest issues
- Building trust through technical knowledge and professionalism

Provide detailed, constructive feedback that helps CSRs book more appointments and retain more customers.
You have deep knowledge of the company's products, services, and recommended objection responses.
Always respond with valid JSON matching the exact schema provided.`;

const DEFAULT_COACHING_USER_PROMPT = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Scenario: {{scenario.name}}
- Difficulty: {{scenario.difficulty}}
- Company: {{company.name}}
- Call Duration: {{callDuration}} seconds

{{#if productContext}}
## Company Products & Services

### Service Packages
{{#each productContext.packages}}
- **{{name}}**: ${'$'}{{price}}/{{frequency}}
  - Selling Points: {{sellingPoints}}
{{/each}}

### Key Objection Responses
{{#each productContext.objections}}
- Objection: "{{objection}}"
  - Recommended Response: "{{response}}"
{{/each}}

### Competitor Information
{{#each productContext.competitors}}
- {{name}}: {{pricing}}
  - Our Advantages: {{advantages}}
{{/each}}
{{/if}}

## Transcript
{{transcript}}

## Scoring Categories for Pest Control CSRs

### 1. Empathy & Rapport (Weight: 15%)
- Did the CSR acknowledge the customer's pest concerns with understanding?
- Did they make the customer feel heard and not judged about having pests?
- Did they build trust and connection appropriate to a home service call?

### 2. Booking & Conversion (Weight: 25%) - CRITICAL
- Did the CSR attempt to book an appointment? (Most important metric)
- Did they offer specific date/time options rather than leaving it open?
- Did they create appropriate urgency for the pest situation?
- Did they overcome scheduling objections?
- For existing customers: Did they successfully retain or save the account?

### 3. Service & Technical Knowledge (Weight: 20%)
- Did the CSR accurately explain treatment methods and what to expect?
- Did they demonstrate knowledge of pest behavior and solutions?
- Did they explain safety information (pets, children, prep requirements)?
- Did they accurately describe service packages and pricing?
- Did they mention guarantees and follow-up services?

### 4. Value Communication & Objection Handling (Weight: 25%)
- Did the CSR communicate value rather than just price?
- Did they handle price objections effectively without discounting?
- Did they differentiate from competitors when relevant?
- Did they recommend the right service level (not underserving or overselling)?
- Did they present recurring service benefits vs one-time treatment?

### 5. Professionalism & Call Control (Weight: 15%)
- Did the CSR maintain a professional, confident tone?
- Did they control the call flow and guide the conversation?
- Did they ask the right qualifying questions?
- Did they summarize and confirm next steps clearly?

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "Specific feedback on building trust with customer", "keyMoments": [] },
    "bookingConversion": { "score": 0-100, "feedback": "Did they ask for the appointment? How well did they handle booking?", "keyMoments": [] },
    "serviceKnowledge": { "score": 0-100, "feedback": "Feedback on technical accuracy and service explanation", "keyMoments": [] },
    "valueAndObjections": { "score": 0-100, "feedback": "How well did they communicate value and handle price/competitor objections?", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "Call control, tone, and professional conduct", "keyMoments": [] }
  },
  "strengths": [{ "title": "Strength", "description": "Why this was effective for booking/retention", "quote": "Quote" }],
  "improvements": [{ "title": "Area", "issue": "What went wrong or was missed", "quote": "What they said", "alternative": "Better response that would improve booking/retention for {{company.name}}" }],
  "keyMoment": { "timestamp": "When", "description": "The pivotal moment that most impacted whether this call would convert", "impact": "Effect on booking likelihood", "betterApproach": "What would have increased conversion" },
  "bookingAssessment": {
    "attemptedToBook": true/false,
    "offeredSpecificTimes": true/false,
    "createdUrgency": true/false,
    "wouldHaveConverted": "likely/unlikely/uncertain",
    "primaryBookingBarrier": "What prevented or almost prevented the booking"
  },
  "summary": "2-3 sentence assessment focusing on booking/retention effectiveness",
  "nextSteps": ["Specific action to improve conversion", "Action 2", "Action 3"]
}`;

function buildAgentPrompt(scenario, company, customTemplate = null) {
  const template = customTemplate || DEFAULT_AGENT_PROMPT_TEMPLATE;

  // Build services list
  const servicesList = Array.isArray(company.services)
    ? company.services.join(', ')
    : (company.services || 'pest control services');

  // Build guarantees list
  const guaranteesList = Array.isArray(company.guarantees)
    ? company.guarantees.join(', ')
    : (company.guarantees || 'satisfaction guaranteed');

  // Build package details for prompt
  const packages = company.packages || [];
  const packageDetails = packages.length > 0
    ? packages.map(pkg => {
        let price = '';
        if (pkg.recurringPrice) {
          price = `$${pkg.recurringPrice}/${pkg.frequency || 'month'}`;
          if (pkg.initialPrice) price = `$${pkg.initialPrice} initial + ${price}`;
        }
        return `${pkg.name}: ${pkg.description || 'No description'} ${price ? `(${price})` : ''}`;
      }).join('\n    ')
    : 'Standard packages available';

  // Build context for template replacement
  const context = {
    company: {
      name: company.name || 'the pest control company',
      phone: company.phone || '',
      services: servicesList,
      pricing: {
        quarterlyPrice: company.pricing?.quarterlyPrice || '149',
        monthlyPrice: company.pricing?.monthlyPrice || '49',
        initialPrice: company.pricing?.initialPrice || '199',
        priceRange: company.pricing?.priceRange || ''
      },
      packages: packageDetails,
      packageSummary: company.packageSummary || 'Standard packages available',
      guarantees: guaranteesList,
      valuePropositions: Array.isArray(company.valuePropositions)
        ? company.valuePropositions.join(', ')
        : (company.valuePropositions || ''),
      tagline: company.tagline || ''
    },
    scenario: {
      customerName: scenario.customerName || 'Customer',
      personality: scenario.personality || 'Average customer',
      emotionalState: scenario.emotionalState || 'Neutral',
      customerBackground: scenario.customerBackground || 'Regular customer',
      situation: scenario.situation || 'You are calling about a pest control issue.',
      customerGoals: scenario.customerGoals || 'Get your issue resolved satisfactorily.',
      escalationTriggers: scenario.escalationTriggers || 'the CSR is dismissive or unhelpful',
      deescalationTriggers: scenario.deescalationTriggers || 'the CSR shows genuine empathy',
      resolutionConditions: scenario.resolutionConditions || 'Accept a reasonable solution that addresses your concerns.'
    }
  };

  return processTemplate(template, context);
}

function buildCoachingPrompt(transcript, context, customTemplates = null) {
  const { scenario, company, callDuration, productContext, scoringCriteria } = context;

  const systemTemplate = customTemplates?.system || DEFAULT_COACHING_SYSTEM_PROMPT;
  let userTemplate = customTemplates?.user || DEFAULT_COACHING_USER_PROMPT;

  // Build product context section if available
  let productSection = '';
  if (productContext && productContext.hasProducts) {
    productSection = `
## Company Products & Services

### Service Packages
${productContext.packages?.map(pkg => `- **${pkg.name}**: $${pkg.price}/${pkg.frequency || 'service'}
  - Selling Points: ${pkg.sellingPoints?.join(', ') || 'N/A'}`).join('\n') || 'No packages configured'}

### Key Objection Responses
${productContext.objections?.slice(0, 5).map(obj => `- Objection: "${obj.objection}"
  - Recommended Response: "${obj.response}"`).join('\n') || 'No objection responses configured'}

### Competitor Information
${productContext.competitors?.map(comp => `- ${comp.name}: ${comp.pricing || 'Pricing unknown'}
  - Our Advantages: ${comp.ourAdvantages?.join(', ') || 'N/A'}`).join('\n') || 'No competitor info configured'}
${productContext.guidelines?.length > 0 ? `
### Sales Guidelines
${productContext.guidelines.map(g => `- **${g.title || g.type}**: ${g.content}`).join('\n')}` : ''}
`;
    // Replace the placeholder section with actual content
    userTemplate = userTemplate.replace(/\{\{#if productContext\}\}[\s\S]*?\{\{\/if\}\}/g, productSection);
  } else {
    // Remove the productContext section if not available
    userTemplate = userTemplate.replace(/\{\{#if productContext\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Build custom scoring criteria section if available
  let scoringSection = '';
  if (scoringCriteria) {
    const { requiredPhrases, prohibitedPhrases, customCriteria } = scoringCriteria;

    if (requiredPhrases?.length > 0 || prohibitedPhrases?.length > 0 || customCriteria?.length > 0) {
      scoringSection = `

## Company-Specific Scoring Criteria

IMPORTANT: These criteria MUST be factored into the scoring. Check for each one explicitly.
`;

      if (requiredPhrases?.length > 0) {
        scoringSection += `
### Required Behaviors/Phrases (REWARD if present, PENALIZE if missing)
${requiredPhrases.map(p => `- "${p.phrase}" - ${p.description || 'Required'} (Impact: ${p.impact || 'medium'})`).join('\n')}
`;
      }

      if (prohibitedPhrases?.length > 0) {
        scoringSection += `
### Prohibited Behaviors/Phrases (PENALIZE if present)
${prohibitedPhrases.map(p => `- "${p.phrase}" - ${p.description || 'Prohibited'} (Impact: ${p.impact || 'medium'})`).join('\n')}
`;
      }

      if (customCriteria?.length > 0) {
        scoringSection += `
### Additional Success Criteria
${customCriteria.map(c => `- ${c.criterion} (Category: ${c.category || 'scenarioSpecific'}, Impact: ${c.impact || 'medium'})`).join('\n')}
`;
      }

      scoringSection += `
In your analysis, explicitly note which company-specific criteria were met or missed.
`;
    }
  }

  // Append scoring section before the JSON format instructions
  if (scoringSection) {
    userTemplate = userTemplate.replace(
      /Respond with JSON in this exact format:/,
      `${scoringSection}\nRespond with JSON in this exact format:`
    );
  }

  // Build context for template replacement
  const templateContext = {
    company: {
      name: company?.name || 'the company'
    },
    scenario: {
      name: scenario?.name || 'Customer Service Call',
      difficulty: scenario?.difficulty || 'Medium'
    },
    callDuration: callDuration ? Math.round(callDuration) : 'Unknown',
    transcript: transcript
  };

  const system = processTemplate(systemTemplate, templateContext);
  const user = processTemplate(userTemplate, templateContext);

  return { system, user };
}

/**
 * Fetch product context for coaching analysis
 */
async function getProductContext(organizationId) {
  if (!organizationId) return null;

  try {
    const adminClient = createAdminClient();

    // Fetch packages with selling points
    const { data: packages } = await adminClient
      .from('service_packages')
      .select(`
        name,
        recurring_price,
        initial_price,
        service_frequency,
        selling_points:package_selling_points(point),
        objections:package_objections(objection_text, recommended_response)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(5);

    // Fetch competitors
    const { data: competitors } = await adminClient
      .from('competitor_info')
      .select('name, typical_pricing, our_advantages')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(5);

    // Fetch sales guidelines
    const { data: guidelines } = await adminClient
      .from('sales_guidelines')
      .select('guideline_type, title, content')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(10);

    // Collect all objections
    const allObjections = [];
    packages?.forEach(pkg => {
      pkg.objections?.forEach(obj => {
        allObjections.push({
          objection: obj.objection_text,
          response: obj.recommended_response
        });
      });
    });

    return {
      hasProducts: (packages?.length || 0) > 0 || (guidelines?.length || 0) > 0,
      packages: packages?.map(pkg => ({
        name: pkg.name,
        price: pkg.recurring_price || pkg.initial_price,
        frequency: pkg.service_frequency,
        sellingPoints: pkg.selling_points?.map(sp => sp.point) || []
      })) || [],
      objections: allObjections,
      competitors: competitors?.map(c => ({
        name: c.name,
        pricing: c.typical_pricing,
        ourAdvantages: c.our_advantages || []
      })) || [],
      guidelines: guidelines?.map(g => ({
        type: g.guideline_type,
        title: g.title,
        content: g.content
      })) || []
    };
  } catch (error) {
    console.error('Error fetching product context:', error);
    return null;
  }
}

// ============ HELPER TO GET COMPANY CONFIG ============

async function getCompanyConfig(req) {
  try {
    // If authenticated, get org settings from database
    if (req.organization) {
      const org = req.organization;
      const packages = org.pricing?.packages || [];

      // Transform packages into pricing info for prompts
      const pricing = buildPricingFromPackages(packages);

      // Build a text summary of packages for prompts
      const packageSummary = buildPackageSummary(packages);

      return {
        name: org.name || configStore.company.name,
        phone: org.phone || configStore.company.phone,
        website: org.website || configStore.company.website,
        logo: org.logo_url || configStore.company.logo,
        colors: org.colors,
        services: org.services || [],
        serviceAreas: org.service_areas || [],
        pricing,
        packages,
        packageSummary,
        guarantees: org.guarantees || [],
        valuePropositions: org.value_propositions || [],
        businessHours: org.business_hours,
        tagline: org.tagline,
        ...org.settings
      };
    }
  } catch (error) {
    console.error('Error getting company config from org:', error);
  }
  // Fallback to in-memory config
  return configStore.company;
}

/**
 * Build pricing object from packages array for backward compatibility with prompts
 */
function buildPricingFromPackages(packages) {
  if (!packages || packages.length === 0) {
    return { quarterlyPrice: '149', initialPrice: '199', hasPublicPricing: false };
  }

  // Find representative prices from packages
  let monthlyPrice = null;
  let quarterlyPrice = null;
  let initialPrice = null;
  let lowestRecurring = null;
  let highestRecurring = null;

  for (const pkg of packages) {
    const recurring = parseFloat(pkg.recurringPrice) || 0;
    const initial = parseFloat(pkg.initialPrice) || 0;

    if (initial && !initialPrice) {
      initialPrice = initial;
    }

    if (recurring > 0) {
      if (!lowestRecurring || recurring < lowestRecurring) lowestRecurring = recurring;
      if (!highestRecurring || recurring > highestRecurring) highestRecurring = recurring;

      if (pkg.frequency === 'monthly' && !monthlyPrice) {
        monthlyPrice = recurring;
      } else if (pkg.frequency === 'quarterly' && !quarterlyPrice) {
        quarterlyPrice = recurring;
      }
    }
  }

  // If no quarterly found but we have monthly, estimate quarterly
  if (!quarterlyPrice && monthlyPrice) {
    quarterlyPrice = monthlyPrice * 3;
  }

  // If no monthly found but we have quarterly, estimate monthly
  if (!monthlyPrice && quarterlyPrice) {
    monthlyPrice = Math.round(quarterlyPrice / 3);
  }

  return {
    hasPublicPricing: true,
    monthlyPrice: monthlyPrice ? String(monthlyPrice) : null,
    quarterlyPrice: quarterlyPrice ? String(quarterlyPrice) : (lowestRecurring ? String(lowestRecurring) : '149'),
    initialPrice: initialPrice ? String(initialPrice) : '199',
    priceRange: lowestRecurring && highestRecurring
      ? `$${lowestRecurring} - $${highestRecurring}/month`
      : null
  };
}

/**
 * Build a text summary of packages for use in prompts
 */
function buildPackageSummary(packages) {
  if (!packages || packages.length === 0) {
    return 'Standard pest control packages available.';
  }

  const summaries = packages
    .filter(pkg => pkg.name && (pkg.recurringPrice || pkg.description))
    .map(pkg => {
      let priceStr = '';
      if (pkg.recurringPrice) {
        priceStr = `$${pkg.recurringPrice}/${pkg.frequency || 'month'}`;
        if (pkg.initialPrice) {
          priceStr += ` (initial: $${pkg.initialPrice})`;
        }
      }
      return `- ${pkg.name}: ${pkg.description || 'No description'}${priceStr ? ' - ' + priceStr : ''}`;
    });

  return summaries.length > 0
    ? `Available packages:\n${summaries.join('\n')}`
    : 'Standard pest control packages available.';
}

// ============ ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular routes
app.use('/api/auth', authRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/suites', suitesRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/generated-scenarios', generatedScenariosRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/streaks', streaksRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/warmups', warmupsRoutes);
app.use('/api/microlearning', microlearningRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/skill-gaps', skillGapsRoutes);
app.use('/api/roi', roiRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/pwa', pwaRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/recordings', recordingsRoutes);
app.use('/api/help-agent', helpAgentRoutes);

// ============ LEGACY ROUTES (maintain backward compatibility) ============

// Get config (with optional auth to get org-specific config)
app.get('/api/admin/current-config', optionalAuthMiddleware, async (req, res) => {
  const company = await getCompanyConfig(req);
  res.json({ company, settings: configStore.settings });
});

// Update config
app.post('/api/admin/apply-company', optionalAuthMiddleware, async (req, res) => {
  const { companyData } = req.body;

  // If authenticated, save to organization
  if (req.organization) {
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from(TABLES.ORGANIZATIONS)
        .update({
          name: companyData.name,
          phone: companyData.phone,
          website: companyData.website,
          logo_url: companyData.logo,
          colors: companyData.colors,
          services: companyData.services,
          pricing: companyData.pricing
        })
        .eq('id', req.organization.id);
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  }

  // Also update in-memory for non-authenticated use
  if (companyData) {
    configStore.company = { ...configStore.company, ...companyData };
  }

  res.json({ success: true, config: configStore.company });
});

// Scrape website
app.post('/api/admin/scrape-company', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const fullUrl = url.startsWith('http') ? url : 'https://' + url;

    const response = await axios.get(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Extract logo
    let logo = null;
    $('header img, .logo img, [class*="logo"] img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        logo = src.startsWith('http') ? src : new URL(src, fullUrl).href;
        return false;
      }
    });

    // Extract text
    $('script, style, nav, footer').remove();
    const textContent = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);

    // Use Claude to extract data
    const claudeResponse = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: 'Extract business intelligence from website content. Respond with valid JSON only.',
      messages: [{
        role: 'user',
        content: `Extract from this pest control website:\n${textContent}\n\nJSON format: { "name": "", "phone": "", "serviceAreas": [], "services": [], "pricing": { "hasPublicPricing": bool, "quarterlyPrice": "", "initialPrice": "" }, "guarantees": [], "valuePropositions": [], "businessHours": "" }`
      }]
    });

    const content = claudeResponse.content[0].text;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const extracted = JSON.parse(jsonMatch[1].trim());

    res.json({ success: true, data: { url: fullUrl, logo, extracted } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape website: ' + error.message });
  }
});

// Get scenarios
app.get('/api/scenarios', optionalAuthMiddleware, async (req, res) => {
  try {
    const company = await getCompanyConfig(req);
    const processed = scenarios.map(s => ({
      ...s,
      situation: processTemplate(s.situation, { company }),
      customerBackground: processTemplate(s.customerBackground, { company })
    }));
    res.json({ success: true, scenarios: processed });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios', message: error.message });
  }
});

// Get single scenario
app.get('/api/scenarios/:id', optionalAuthMiddleware, async (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

  const company = await getCompanyConfig(req);
  const processed = {
    ...scenario,
    situation: processTemplate(scenario.situation, { company }),
    customerBackground: processTemplate(scenario.customerBackground, { company })
  };
  res.json({ success: true, scenario: processed });
});

// Get voices from Retell (uses cache from voiceService)
app.get('/api/scenarios/meta/voices', async (req, res) => {
  try {
    // Force refresh if requested
    if (req.query.refresh === 'true') {
      await refreshVoiceCache();
    }

    const voices = await getAvailableVoices();
    const cacheInfo = getVoiceCacheInfo();
    res.json({
      success: true,
      voices,
      cached: cacheInfo.lastFetched,
      error: cacheInfo.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      voices: [],
      error: 'Failed to get voices: ' + error.message
    });
  }
});

// Force refresh voice cache
app.post('/api/scenarios/meta/voices/refresh', async (req, res) => {
  try {
    const voices = await refreshVoiceCache();
    res.json({
      success: true,
      voices,
      message: `Refreshed ${voices.length} voices`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh voices: ' + error.message
    });
  }
});

// Track active call creation to prevent duplicates
const activeCallCreations = new Map();

// Create training call
app.post('/api/calls/create-training-call', optionalAuthMiddleware, async (req, res) => {
  try {
    const { scenario } = req.body;
    if (!scenario) return res.status(400).json({ error: 'Scenario is required' });

    // Use client IP + scenario ID to prevent rapid duplicate calls
    const clientKey = `${req.ip || 'unknown'}-${scenario.id}`;
    const now = Date.now();
    const lastCall = activeCallCreations.get(clientKey);

    if (lastCall && (now - lastCall) < 5000) {
      console.log(`[DUPLICATE BLOCKED] Call creation blocked for ${clientKey} - too soon after last call`);
      return res.status(429).json({ error: 'Please wait before starting another call' });
    }
    activeCallCreations.set(clientKey, now);

    // Clean up old entries
    for (const [key, timestamp] of activeCallCreations) {
      if (now - timestamp > 60000) activeCallCreations.delete(key);
    }

    console.log(`[CALL CREATE] Creating call for scenario: ${scenario.name}`);

    const retellKey = process.env.RETELL_API_KEY || '';
    if (!retellKey) {
      return res.status(500).json({ error: 'RETELL_API_KEY not configured' });
    }
    if (!retellKey.startsWith('key_')) {
      return res.status(500).json({
        error: 'RETELL_API_KEY appears malformed',
        hint: 'Key should start with "key_"',
        actualPrefix: retellKey.substring(0, 5)
      });
    }

    const company = await getCompanyConfig(req);
    const customPrompts = req.organization?.settings?.customPrompts || null;

    const processedScenario = {
      ...scenario,
      systemPrompt: processTemplate(scenario.systemPrompt, { company }),
      customerBackground: processTemplate(scenario.customerBackground, { company }),
      situation: processTemplate(scenario.situation, { company })
    };

    const agentPrompt = buildAgentPrompt(processedScenario, company, customPrompts?.agent);

    // Build opening instruction into prompt to prevent echo from begin_message
    const openingLine = processedScenario.openingLine || 'Hello?';
    const promptWithOpening = agentPrompt + `\n\n## Opening Line\nWhen the call starts, begin by saying: "${openingLine}"`;

    const llm = await getRetellClient().llm.create({
      model: 'gpt-4o',
      general_prompt: promptWithOpening
      // Note: begin_message removed to prevent echo/overlap issues
    });

    // Validate voice ID exists in Retell, fall back to first available if not
    const requestedVoice = scenario.voiceId || '11labs-Brian';
    const validVoiceId = await getValidVoiceId(requestedVoice);
    console.log(`[CALL] Using voice: ${validVoiceId} (requested: ${requestedVoice})`);

    const agent = await getRetellClient().agent.create({
      agent_name: `CSR Training - ${processedScenario.name}`,
      response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
      voice_id: validVoiceId,
      language: 'en-US',
      enable_backchannel: false,  // Disable to prevent echo/feedback
      responsiveness: 1.0,  // Respond quickly without overlap
      interruption_sensitivity: 0.8
    });

    const webCall = await getRetellClient().call.createWebCall({
      agent_id: agent.agent_id
    });

    console.log(`[CALL CREATE SUCCESS] callId: ${webCall.call_id}, agentId: ${agent.agent_id}`);

    res.json({
      success: true,
      callId: webCall.call_id,
      agentId: agent.agent_id,
      accessToken: webCall.access_token,
      sampleRate: webCall.sample_rate || 24000
    });
  } catch (error) {
    console.error('[CALL CREATE ERROR]', error);
    res.status(500).json({
      error: error.message || 'Unknown error',
      type: error.constructor.name,
      status: error.status || error.statusCode
    });
  }
});

// End call
app.post('/api/calls/end', async (req, res) => {
  try {
    const { callId } = req.body;
    if (!callId) {
      console.log('[CALLS/END] No callId provided');
      return res.status(400).json({ error: 'Call ID is required' });
    }

    console.log('[CALLS/END] Ending call:', callId);

    // Try to end the call, but don't fail if it's already ended
    try {
      await getRetellClient().call.end(callId);
    } catch (endErr) {
      console.log('[CALLS/END] Error ending call (may already be ended):', endErr.message);
      // Continue - the call may have already ended naturally
    }

    // Wait for transcript to be available
    await new Promise(r => setTimeout(r, 2000));

    // Try to retrieve the call data
    let call = null;
    try {
      call = await getRetellClient().call.retrieve(callId);
    } catch (retrieveErr) {
      console.log('[CALLS/END] Error retrieving call:', retrieveErr.message);
      // Return empty transcript if we can't retrieve
      return res.json({
        success: true,
        callId,
        transcript: {
          raw: '',
          formatted: [],
          duration: 0
        }
      });
    }

    console.log('[CALLS/END] Call retrieved, transcript length:', call.transcript?.length || 0);

    res.json({
      success: true,
      callId,
      transcript: {
        raw: call.transcript || '',
        formatted: [],
        duration: call.end_timestamp ? (new Date(call.end_timestamp) - new Date(call.start_timestamp)) / 1000 : 0
      }
    });
  } catch (error) {
    console.error('[CALLS/END] Unexpected error:', error);
    // Still return success with empty data rather than failing
    res.json({
      success: true,
      callId: req.body?.callId,
      transcript: {
        raw: '',
        formatted: [],
        duration: 0
      },
      warning: error.message
    });
  }
});

// In-memory store for pending analyses (in production, use Redis or database)
const pendingAnalyses = new Map();

// Start async analysis - returns immediately with session ID
app.post('/api/analysis/start', optionalAuthMiddleware, async (req, res) => {
  try {
    const { transcript, scenario, callDuration, sessionId } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const analysisId = sessionId || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store pending analysis
    pendingAnalyses.set(analysisId, {
      status: 'processing',
      startedAt: Date.now(),
      transcript,
      scenario,
      callDuration
    });

    // Return immediately
    res.json({
      success: true,
      analysisId,
      status: 'processing',
      message: 'Analysis started'
    });

    // Run analysis in background
    (async () => {
      try {
        const company = await getCompanyConfig(req);
        const customPrompts = req.organization?.settings?.customPrompts || null;
        const scoringCriteria = customPrompts?.scoringCriteria || null;

        let productContext = null;
        if (req.organization?.id) {
          productContext = await getProductContext(req.organization.id);
        }

        const { system, user } = buildCoachingPrompt(
          transcript,
          { scenario, company, callDuration, productContext, scoringCriteria },
          customPrompts?.coaching
        );

        const response = await getAnthropicClient().messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system,
          messages: [{ role: 'user', content: user }]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const analysis = JSON.parse(jsonMatch[1].trim());

        pendingAnalyses.set(analysisId, {
          status: 'completed',
          completedAt: Date.now(),
          analysis
        });

        // Clean up after 10 minutes
        setTimeout(() => pendingAnalyses.delete(analysisId), 600000);
      } catch (error) {
        console.error('Background analysis error:', error);
        pendingAnalyses.set(analysisId, {
          status: 'failed',
          error: error.message
        });
      }
    })();

  } catch (error) {
    console.error('Analysis start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check analysis status
app.get('/api/analysis/status/:analysisId', optionalAuthMiddleware, (req, res) => {
  const { analysisId } = req.params;
  const analysis = pendingAnalyses.get(analysisId);

  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found', status: 'not_found' });
  }

  if (analysis.status === 'completed') {
    return res.json({
      success: true,
      status: 'completed',
      analysis: analysis.analysis
    });
  }

  if (analysis.status === 'failed') {
    return res.json({
      success: false,
      status: 'failed',
      error: analysis.error
    });
  }

  // Still processing
  const elapsed = Date.now() - analysis.startedAt;
  res.json({
    success: true,
    status: 'processing',
    elapsedMs: elapsed,
    estimatedTotalMs: 15000 // Rough estimate
  });
});

// Legacy sync analyze endpoint (still works for backwards compatibility)
app.post('/api/analysis/analyze', optionalAuthMiddleware, async (req, res) => {
  try {
    const { transcript, scenario, callDuration } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const company = await getCompanyConfig(req);
    const customPrompts = req.organization?.settings?.customPrompts || null;
    const scoringCriteria = customPrompts?.scoringCriteria || null;

    // Fetch product context for authenticated users
    let productContext = null;
    if (req.organization?.id) {
      productContext = await getProductContext(req.organization.id);
    }

    const { system, user } = buildCoachingPrompt(
      transcript,
      { scenario, company, callDuration, productContext, scoringCriteria },
      customPrompts?.coaching
    );

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const analysis = JSON.parse(jsonMatch[1].trim());

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Transcript intelligence
app.post('/api/admin/load-transcript', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'Extract business intelligence from conversation transcripts. Respond with valid JSON only.',
      messages: [{
        role: 'user',
        content: `Analyze this transcript:\n${transcript}\n\nJSON: { "painPoints": [{"issue":"","severity":"","quote":""}], "suggestedScenarios": [{"name":"","description":"","difficulty":"","basedOn":""}], "coachingInsights": {"strengthsToReinforce":[],"areasToAddress":[],"recommendedFocus":""} }`
      }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const intelligence = JSON.parse(jsonMatch[1].trim());

    res.json({ success: true, intelligence });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Organization update endpoint
app.patch('/api/organization', optionalAuthMiddleware, async (req, res) => {
  try {
    console.log('PATCH /api/organization - user:', req.user?.id, 'org:', req.organization?.id);
    console.log('Update body:', JSON.stringify(req.body, null, 2));

    if (!req.organization) {
      console.log('No organization found on request');
      return res.status(401).json({ error: 'Authentication required - no organization found' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .update(req.body)
      .eq('id', req.organization.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Organization updated successfully');
    res.json({ organization: data });
  } catch (error) {
    console.error('Organization update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PROMPT VIEWER ENDPOINTS ============

// Get prompt templates for admin viewing
app.get('/api/admin/prompts', optionalAuthMiddleware, async (req, res) => {
  try {
    const company = await getCompanyConfig(req);

    // Get a sample scenario to show template with real values
    const sampleScenario = scenarios[0]; // Use "The Cancellation Save"
    const processedScenario = {
      ...sampleScenario,
      systemPrompt: processTemplate(sampleScenario.systemPrompt, { company }),
      customerBackground: processTemplate(sampleScenario.customerBackground, { company }),
      situation: processTemplate(sampleScenario.situation, { company })
    };

    // Build the actual prompts as they would be used
    const agentPrompt = buildAgentPrompt(processedScenario, company);
    const coachingPrompts = buildCoachingPrompt(
      '[Sample transcript would appear here]',
      { scenario: processedScenario, company, callDuration: 300 }
    );

    res.json({
      success: true,
      prompts: {
        agent: {
          name: 'Scenario Agent Prompt',
          description: 'This prompt defines how the AI customer behaves during training calls. It includes the customer persona, situation context, and behavioral guidelines.',
          template: agentPrompt,
          templateVariables: [
            { name: '{{company.name}}', description: 'Your company name', value: company.name },
            { name: '{{company.pricing.quarterlyPrice}}', description: 'Quarterly service price', value: company.pricing?.quarterlyPrice },
            { name: '{{company.services}}', description: 'List of services offered', value: company.services?.join(', ') },
            { name: '{{company.guarantees}}', description: 'Service guarantees', value: company.guarantees?.[0] }
          ]
        },
        coaching: {
          name: 'Coaching Analysis Prompt',
          description: 'This prompt is used to analyze call transcripts and generate performance feedback and scores.',
          systemPrompt: coachingPrompts.system,
          userPrompt: coachingPrompts.user,
          outputSchema: {
            overallScore: '0-100 overall performance score',
            categories: 'Scores and feedback for each category (empathy, resolution, knowledge, professionalism, scenario-specific)',
            strengths: 'Array of things the CSR did well with quotes',
            improvements: 'Array of areas to improve with alternative responses',
            keyMoment: 'The most impactful moment in the call',
            summary: 'Brief overall assessment',
            nextSteps: 'Action items for improvement'
          }
        }
      },
      sampleScenario: {
        id: processedScenario.id,
        name: processedScenario.name,
        customerName: processedScenario.customerName
      }
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get prompt template with specific scenario
app.get('/api/admin/prompts/:scenarioId', optionalAuthMiddleware, async (req, res) => {
  try {
    const scenario = scenarios.find(s => s.id === req.params.scenarioId);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    const company = await getCompanyConfig(req);
    const customPrompts = req.organization?.settings?.customPrompts || null;

    const processedScenario = {
      ...scenario,
      systemPrompt: processTemplate(scenario.systemPrompt, { company }),
      customerBackground: processTemplate(scenario.customerBackground, { company }),
      situation: processTemplate(scenario.situation, { company })
    };

    const agentPrompt = buildAgentPrompt(processedScenario, company, customPrompts?.agent);
    const coachingPrompts = buildCoachingPrompt(
      '[Transcript would appear here]',
      { scenario: processedScenario, company, callDuration: 300 },
      customPrompts?.coaching
    );

    res.json({
      success: true,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        customerName: scenario.customerName,
        difficulty: scenario.difficulty
      },
      prompts: {
        agent: agentPrompt,
        coachingSystem: coachingPrompts.system,
        coachingUser: coachingPrompts.user
      }
    });
  } catch (error) {
    console.error('Error fetching scenario prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save custom prompt templates
app.post('/api/admin/prompts', optionalAuthMiddleware, async (req, res) => {
  try {
    if (!req.organization) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      agentPrompt,
      coachingSystemPrompt,
      coachingUserPrompt,
      agentWizardAnswers,
      coachingWizardAnswers,
      scoringCriteria,
      scoringWeights,
      preserveAgent,
      preserveCoaching
    } = req.body;

    // Update organization settings with custom prompts
    const currentSettings = req.organization.settings || {};
    const currentCustomPrompts = currentSettings.customPrompts || {};

    // Build new custom prompts, preserving existing values if flags are set
    const newCustomPrompts = {
      agent: preserveAgent ? currentCustomPrompts.agent : (agentPrompt !== undefined ? agentPrompt : currentCustomPrompts.agent),
      agentWizardAnswers: preserveAgent ? currentCustomPrompts.agentWizardAnswers : (agentWizardAnswers !== undefined ? agentWizardAnswers : currentCustomPrompts.agentWizardAnswers),
      coaching: {
        system: preserveCoaching ? currentCustomPrompts.coaching?.system : (coachingSystemPrompt !== undefined ? coachingSystemPrompt : currentCustomPrompts.coaching?.system),
        user: preserveCoaching ? currentCustomPrompts.coaching?.user : (coachingUserPrompt !== undefined ? coachingUserPrompt : currentCustomPrompts.coaching?.user)
      },
      coachingWizardAnswers: preserveCoaching ? currentCustomPrompts.coachingWizardAnswers : (coachingWizardAnswers !== undefined ? coachingWizardAnswers : currentCustomPrompts.coachingWizardAnswers),
      scoringCriteria: scoringCriteria !== undefined ? scoringCriteria : currentCustomPrompts.scoringCriteria,
      scoringWeights: scoringWeights !== undefined ? scoringWeights : currentCustomPrompts.scoringWeights
    };

    const updatedSettings = {
      ...currentSettings,
      customPrompts: newCustomPrompts
    };

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .update({ settings: updatedSettings })
      .eq('id', req.organization.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Custom prompts saved successfully',
      settings: data.settings
    });
  } catch (error) {
    console.error('Error saving custom prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get default prompt templates (for reset functionality)
app.get('/api/admin/prompts/defaults', optionalAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    defaults: {
      agent: DEFAULT_AGENT_PROMPT_TEMPLATE,
      coachingSystem: DEFAULT_COACHING_SYSTEM_PROMPT,
      coachingUser: DEFAULT_COACHING_USER_PROMPT
    }
  });
});

// Get current custom prompts (raw templates, not processed)
app.get('/api/admin/prompts/custom', optionalAuthMiddleware, async (req, res) => {
  try {
    const customPrompts = req.organization?.settings?.customPrompts || null;

    res.json({
      success: true,
      hasCustomPrompts: !!customPrompts,
      customPrompts: customPrompts || {
        agent: null,
        coaching: { system: null, user: null }
      },
      defaults: {
        agent: DEFAULT_AGENT_PROMPT_TEMPLATE,
        coachingSystem: DEFAULT_COACHING_SYSTEM_PROMPT,
        coachingUser: DEFAULT_COACHING_USER_PROMPT
      }
    });
  } catch (error) {
    console.error('Error fetching custom prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoints
app.get('/api/debug/env', (req, res) => {
  const retellKey = process.env.RETELL_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  res.json({
    hasClerkSecretKey: !!clerkSecretKey,
    clerkSecretKeyLength: clerkSecretKey.length,
    clerkSecretKeyPrefix: clerkSecretKey ? clerkSecretKey.substring(0, 10) : 'NOT SET',
    clerkSecretKeyValid: clerkSecretKey.startsWith('sk_'),
    hasRetellKey: !!retellKey,
    retellKeyLength: retellKey.length,
    retellKeyPrefix: retellKey ? retellKey.substring(0, 10) : 'NOT SET',
    retellKeyValid: retellKey.startsWith('key_'),
    hasAnthropicKey: !!anthropicKey,
    anthropicKeyLength: anthropicKey.length,
    anthropicKeyPrefix: anthropicKey ? anthropicKey.substring(0, 15) : 'NOT SET',
    anthropicKeyValid: anthropicKey.startsWith('sk-ant-'),
    hasSupabaseUrl: !!supabaseUrl,
    supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) : 'NOT SET',
    hasSupabaseServiceKey: !!supabaseServiceKey,
    supabaseServiceKeyLength: supabaseServiceKey.length
  });
});

app.get('/api/debug/test-auth', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.json({ error: 'No authorization header', hasHeader: false });
    }

    const token = authHeader.replace('Bearer ', '');
    const { verifyToken } = await import('@clerk/clerk-sdk-node');

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });

      // Now try to fetch user from database
      const adminClient = createAdminClient();
      const { data: user, error: userError } = await adminClient
        .from('users')
        .select(`
          *,
          organization:organizations(*),
          branch:branches(*)
        `)
        .eq('clerk_id', payload.sub)
        .single();

      res.json({
        success: true,
        clerkUserId: payload.sub,
        tokenExp: payload.exp,
        tokenIat: payload.iat,
        dbLookup: {
          userFound: !!user,
          userError: userError?.message || null,
          userId: user?.id,
          userEmail: user?.email,
          userRole: user?.role,
          userStatus: user?.status,
          hasOrganization: !!user?.organization,
          organizationId: user?.organization?.id,
          organizationName: user?.organization?.name
        }
      });
    } catch (verifyError) {
      res.json({
        success: false,
        error: verifyError.message,
        errorCode: verifyError.code,
        secretKeySet: !!process.env.CLERK_SECRET_KEY,
        secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10)
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.get('/api/debug/test-retell', async (req, res) => {
  try {
    const retellKey = process.env.RETELL_API_KEY || '';
    if (!retellKey.startsWith('key_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Retell API key format'
      });
    }

    const agents = await getRetellClient().agent.list();
    res.json({
      success: true,
      message: 'Retell connection successful',
      agentCount: agents?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Local development server
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
