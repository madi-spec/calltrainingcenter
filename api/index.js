import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Retell from 'retell-sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Default config (in-memory for serverless)
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
  settings: { defaultVoiceId: '11labs-Adrian', callTimeout: 600000 }
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
    voiceId: '11labs-Dorothy',
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
    voiceId: '11labs-Josh',
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
    voiceId: '11labs-Myra',
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
    voiceId: '11labs-Myra',
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

function buildAgentPrompt(scenario, company) {
  const companyName = company.name || 'the pest control company';
  const quarterlyPrice = company.pricing?.quarterlyPrice || '149';
  const services = company.services?.join(', ') || 'pest control services';

  return `You are playing the role of a customer calling ${companyName}. You are participating in a training simulation for customer service representatives.

## Your Character
Name: ${scenario.customerName || 'Customer'}
Personality: ${scenario.personality || 'Average customer'}
Emotional State: ${scenario.emotionalState || 'Neutral'}
Background: ${scenario.customerBackground || 'Regular customer'}

## The Situation
${scenario.situation || 'You are calling about a pest control issue.'}

## Your Goals
${scenario.customerGoals || 'Get your issue resolved satisfactorily.'}

## How to Behave
- Stay in character throughout the call
- React naturally to what the CSR says
- ${scenario.escalationTriggers ? `Escalate if: ${scenario.escalationTriggers}` : 'Escalate if the CSR is dismissive or unhelpful'}
- ${scenario.deescalationTriggers ? `Calm down if: ${scenario.deescalationTriggers}` : 'Calm down if the CSR shows genuine empathy'}
- Use natural speech patterns with occasional filler words
- Don't be a pushover - advocate for yourself realistically

## Company Context
- Company: ${companyName}
- Services: ${services}
- Quarterly price: $${quarterlyPrice}
${company.guarantees ? `- Guarantee: ${company.guarantees[0]}` : ''}

## Resolution Conditions
${scenario.resolutionConditions || 'Accept a reasonable solution that addresses your concerns.'}

Remember: This is training - challenge the CSR but be fair.`;
}

function buildCoachingPrompt(transcript, context) {
  const { scenario, company, callDuration } = context;
  const companyName = company?.name || 'the company';

  const system = `You are an expert CSR coach specializing in pest control customer service training.
Provide detailed, constructive feedback on call performance.
Always respond with valid JSON matching the exact schema provided.`;

  const user = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Scenario: ${scenario?.name || 'Customer Service Call'}
- Difficulty: ${scenario?.difficulty || 'Medium'}
- Company: ${companyName}
- Call Duration: ${callDuration ? Math.round(callDuration) + ' seconds' : 'Unknown'}

## Transcript
${transcript}

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "problemResolution": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "productKnowledge": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "scenarioSpecific": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] }
  },
  "strengths": [{ "title": "Strength", "description": "Why effective", "quote": "Quote" }],
  "improvements": [{ "title": "Area", "issue": "What went wrong", "quote": "What they said", "alternative": "Better response for ${companyName}" }],
  "keyMoment": { "timestamp": "When", "description": "What happened", "impact": "Effect", "betterApproach": "Alternative" },
  "summary": "2-3 sentence assessment",
  "nextSteps": ["Action 1", "Action 2", "Action 3"]
}`;

  return { system, user };
}

// ============ ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get config
app.get('/api/admin/current-config', (req, res) => {
  res.json(configStore);
});

// Update config
app.post('/api/admin/apply-company', (req, res) => {
  const { companyData } = req.body;
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
app.get('/api/scenarios', (req, res) => {
  const company = configStore.company;
  const processed = scenarios.map(s => ({
    ...s,
    situation: processTemplate(s.situation, { company }),
    customerBackground: processTemplate(s.customerBackground, { company })
  }));
  res.json({ success: true, scenarios: processed });
});

// Get single scenario
app.get('/api/scenarios/:id', (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

  const company = configStore.company;
  const processed = {
    ...scenario,
    situation: processTemplate(scenario.situation, { company }),
    customerBackground: processTemplate(scenario.customerBackground, { company })
  };
  res.json({ success: true, scenario: processed });
});

// Get voices
app.get('/api/scenarios/meta/voices', (req, res) => {
  res.json({
    success: true,
    voices: [
      { id: '11labs-Adrian', name: 'Adrian', gender: 'male' },
      { id: '11labs-Myra', name: 'Myra', gender: 'female' },
      { id: '11labs-Dorothy', name: 'Dorothy', gender: 'female' },
      { id: '11labs-Josh', name: 'Josh', gender: 'male' }
    ]
  });
});

// Debug endpoint to check env vars
app.get('/api/debug/env', (req, res) => {
  res.json({
    hasRetellKey: !!process.env.RETELL_API_KEY,
    retellKeyPrefix: process.env.RETELL_API_KEY ? process.env.RETELL_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 12) + '...' : 'NOT SET'
  });
});

// Create training call
app.post('/api/calls/create-training-call', async (req, res) => {
  try {
    const { scenario } = req.body;
    if (!scenario) return res.status(400).json({ error: 'Scenario is required' });

    // Check for API key
    if (!process.env.RETELL_API_KEY) {
      return res.status(500).json({ error: 'RETELL_API_KEY not configured' });
    }

    const company = configStore.company;
    const processedScenario = {
      ...scenario,
      systemPrompt: processTemplate(scenario.systemPrompt, { company }),
      customerBackground: processTemplate(scenario.customerBackground, { company }),
      situation: processTemplate(scenario.situation, { company })
    };

    const agentPrompt = buildAgentPrompt(processedScenario, company);

    console.log('Creating LLM with Retell...');
    // Create LLM
    const llm = await getRetellClient().llm.create({
      model: 'gpt-4o',
      general_prompt: agentPrompt,
      begin_message: processedScenario.openingLine || 'Hello?'
    });
    console.log('LLM created:', llm.llm_id);

    console.log('Creating agent...');
    // Create agent
    const agent = await getRetellClient().agent.create({
      agent_name: `CSR Training - ${processedScenario.name}`,
      response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
      voice_id: scenario.voiceId || '11labs-Adrian',
      language: 'en-US'
    });
    console.log('Agent created:', agent.agent_id);

    console.log('Creating web call...');
    // Create web call
    const webCall = await getRetellClient().call.createWebCall({
      agent_id: agent.agent_id
    });
    console.log('Web call created:', webCall.call_id);

    res.json({
      success: true,
      callId: webCall.call_id,
      agentId: agent.agent_id,
      accessToken: webCall.access_token,
      sampleRate: webCall.sample_rate || 24000
    });
  } catch (error) {
    console.error('Error creating call:', error);
    const errorDetails = {
      error: error.message,
      type: error.constructor.name,
      status: error.status || error.statusCode,
      details: error.error || error.body || null
    };
    res.status(500).json(errorDetails);
  }
});

// End call
app.post('/api/calls/end', async (req, res) => {
  try {
    const { callId } = req.body;
    if (!callId) return res.status(400).json({ error: 'Call ID is required' });

    await getRetellClient().call.end(callId);
    await new Promise(r => setTimeout(r, 2000));

    const call = await getRetellClient().call.retrieve(callId);

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
    res.status(500).json({ error: error.message });
  }
});

// Analyze transcript
app.post('/api/analysis/analyze', async (req, res) => {
  try {
    const { transcript, scenario, callDuration } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const company = configStore.company;
    const { system, user } = buildCoachingPrompt(transcript, { scenario, company, callDuration });

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

export default app;
