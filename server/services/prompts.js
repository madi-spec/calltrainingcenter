/**
 * Build the agent prompt for Retell AI
 */
export function buildAgentPrompt(scenario, company) {
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
- ${scenario.deescalationTriggers ? `Calm down if: ${scenario.deescalationTriggers}` : 'Calm down if the CSR shows genuine empathy and offers solutions'}
- Use natural speech patterns with occasional filler words
- Don't be a pushover - advocate for yourself realistically

## Company Context (use naturally in conversation)
- Company: ${companyName}
- Services: ${services}
- Quarterly price: $${quarterlyPrice}
${company.guarantees ? `- Guarantee: ${company.guarantees[0]}` : ''}

## Key Points to Mention
${scenario.keyPointsToMention ? scenario.keyPointsToMention.map(p => `- ${p}`).join('\n') : '- Your main concern'}

## Resolution Conditions
${scenario.resolutionConditions || 'Accept a reasonable solution that addresses your concerns.'}

Remember: This is training - challenge the CSR but be fair. Give them opportunities to succeed if they use good techniques.`;
}

/**
 * Build coaching analysis prompt
 */
export function buildCoachingPrompt(transcript, context) {
  const { scenario, company, callDuration } = context;
  const companyName = company?.name || 'the company';

  const system = `You are an expert CSR coach specializing in pest control and home services customer service training.
You understand what drives revenue and customer retention for pest control companies:
- Converting inquiries into booked appointments (the #1 metric)
- Getting customers on recurring service plans vs one-time treatments
- Handling price objections by communicating value, not discounting
- Creating urgency appropriately for pest issues
- Building trust through technical knowledge and professionalism

Your role is to provide detailed, constructive feedback that helps CSRs book more appointments and retain more customers.
Always respond with valid JSON matching the exact schema provided.
Be specific with feedback - quote actual phrases from the transcript.
Provide actionable alternatives that reference company-specific information.`;

  const user = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Scenario: ${scenario?.name || 'Customer Service Call'}
- Difficulty: ${scenario?.difficulty || 'Medium'}
- Company: ${companyName}
- Call Duration: ${callDuration ? Math.round(callDuration) + ' seconds' : 'Unknown'}
- Scenario Goal: ${scenario?.csrObjective || 'Handle customer inquiry effectively'}

## Transcript
${transcript}

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

### 3. Service & Technical Knowledge (Weight: 20%)
- Did the CSR accurately explain treatment methods and what to expect?
- Did they demonstrate knowledge of pest behavior and solutions?
- Did they explain safety information (pets, children, prep requirements)?
- Did they accurately describe service packages and pricing?

### 4. Value Communication & Objection Handling (Weight: 25%)
- Did the CSR communicate value rather than just price?
- Did they handle price objections effectively without discounting?
- Did they differentiate from competitors when relevant?
- Did they present recurring service benefits vs one-time treatment?

### 5. Professionalism & Call Control (Weight: 15%)
- Did the CSR maintain a professional, confident tone?
- Did they control the call flow and guide the conversation?
- Did they ask the right qualifying questions?
- Did they summarize and confirm next steps clearly?

Respond with JSON in this exact format:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": {
      "score": 0-100,
      "feedback": "Specific feedback on building trust with the customer",
      "keyMoments": ["Quote from transcript"]
    },
    "bookingConversion": {
      "score": 0-100,
      "feedback": "Did they ask for the appointment? How well did they handle booking?",
      "keyMoments": []
    },
    "serviceKnowledge": {
      "score": 0-100,
      "feedback": "Feedback on technical accuracy and service explanation",
      "keyMoments": []
    },
    "valueAndObjections": {
      "score": 0-100,
      "feedback": "How well did they communicate value and handle objections?",
      "keyMoments": []
    },
    "professionalism": {
      "score": 0-100,
      "feedback": "Call control, tone, and professional conduct",
      "keyMoments": []
    }
  },
  "strengths": [
    {
      "title": "Strength title",
      "description": "Why this was effective for booking/retention",
      "quote": "Exact quote from transcript"
    }
  ],
  "improvements": [
    {
      "title": "Area to improve",
      "issue": "What went wrong or was missed",
      "quote": "What they said",
      "alternative": "Better response that would improve booking/retention for ${companyName}"
    }
  ],
  "keyMoment": {
    "timestamp": "Description of when in call",
    "description": "The pivotal moment that most impacted whether this call would convert",
    "impact": "How it affected booking likelihood",
    "betterApproach": "What would have increased conversion"
  },
  "summary": "2-3 sentence assessment focusing on booking/retention effectiveness",
  "nextSteps": ["Specific action to improve conversion", "Action item 2", "Action item 3"]
}`;

  return { system, user };
}

/**
 * Build intelligence extraction prompt for transcript analysis
 */
export function buildIntelligenceExtractionPrompt(transcript) {
  const system = `You are an expert at extracting business intelligence from conversation transcripts.
Your task is to identify companies, services, pain points, and coaching preferences.
Always respond with valid JSON only.`;

  const user = `Analyze this conversation transcript and extract relevant intelligence for a CSR training simulator.

Transcript:
${transcript}

Extract and respond with JSON in this exact format:
{
  "companies": [
    {
      "name": "Company Name",
      "context": "How they were mentioned",
      "sentiment": "positive/negative/neutral"
    }
  ],
  "services": ["Service 1", "Service 2"],
  "painPoints": [
    {
      "issue": "Description of pain point",
      "severity": "high/medium/low",
      "quote": "Relevant quote from transcript"
    }
  ],
  "terminology": {
    "industryTerms": ["term1", "term2"],
    "companySpecificTerms": ["term1", "term2"]
  },
  "customerTypes": ["Type 1", "Type 2"],
  "commonObjections": ["Objection 1", "Objection 2"],
  "suggestedScenarios": [
    {
      "name": "Scenario name",
      "description": "Brief description",
      "difficulty": "easy/medium/hard",
      "basedOn": "What in the transcript inspired this"
    }
  ],
  "coachingInsights": {
    "strengthsToReinforce": ["Strength 1"],
    "areasToAddress": ["Area 1"],
    "recommendedFocus": "Primary coaching recommendation"
  }
}`;

  return { system, user };
}

/**
 * Build sentiment analysis prompt
 */
export function buildSentimentPrompt(text) {
  const system = `You are a sentiment analysis expert. Analyze the emotional tone of customer service interactions.
Respond with JSON only.`;

  const user = `Analyze the sentiment of this text from a customer service call:

"${text}"

Respond with JSON:
{
  "sentiment": "positive/negative/neutral/frustrated/satisfied/angry/confused",
  "confidence": 0.0-1.0,
  "emotionalIndicators": ["indicator1", "indicator2"],
  "escalationRisk": "low/medium/high"
}`;

  return { system, user };
}
