/**
 * Backfill analysis for Stephen Harper's training sessions.
 * Pulls transcripts from Retell, runs Claude analysis, saves to DB.
 */
import Retell from 'retell-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

import 'dotenv/config';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SESSIONS = [
  { id: '15ff81ed-b900-435e-ae50-8ca53283f77e', callId: 'call_5d44d515960b5c4e5194121ea4d', name: 'The Furious Callback' },
  { id: '978e54aa-4b1a-4c5f-9da5-8b8aa5e971d2', callId: 'call_2e67bfbacdcebeae30c75891f7e', name: 'Communication & Documentation' },
  { id: '21006f19-bdd0-478c-9cb1-b2fdadf25062', callId: 'call_a2d4a2f4a6c2ee511d5eec53d43', name: 'Service Knowledge Fundamentals' },
  { id: '16747dd2-096f-49e4-8483-4f9b45040575', callId: 'call_b49fb1d9476317c57331480ec9a', name: 'The New Customer Inquiry' },
];

// Skip short/abandoned sessions
const SKIP = [
  'fe614b7c-8d1d-4539-a066-90ae8326c082',
  'ef80fe21-338f-4757-a09c-55c7e31df00f',
  '9e609b8d-b066-4663-a9f6-f295cfb0c343',
];

async function analyzeTranscript(transcript, scenarioName, duration) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are an expert CSR coach specializing in pest control and home services customer service training.
Score based on how well the CSR achieved the CORE OBJECTIVE for the scenario type. A CSR who handles the primary objective competently should score 70-80. Reserve 80-90 for strong performances and 90+ for exceptional ones.
Always respond with valid JSON matching the exact schema provided.`,
    messages: [{
      role: 'user',
      content: `Analyze this CSR training call and provide a coaching scorecard.

## Call Context
- Company: All "U" Need Pest Control
- Scenario: ${scenarioName}
- Duration: ${duration} seconds

## Transcript
${transcript}

## Scoring
Adjust based on scenario type. For retention/cancellation: evaluate save attempt. For complaints: evaluate de-escalation and resolution. For sales inquiries: evaluate booking/conversion.

### 1. Empathy & Rapport (15%)
### 2. Booking/Conversion or Retention/Resolution (25%)
### 3. Service & Technical Knowledge (20%)
### 4. Value Communication (25%)
### 5. Professionalism & Call Control (15%)

Respond with JSON:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "feedback", "keyMoments": [] },
    "bookingConversion": { "score": 0-100, "feedback": "feedback", "keyMoments": [] },
    "serviceKnowledge": { "score": 0-100, "feedback": "feedback", "keyMoments": [] },
    "valueAndObjections": { "score": 0-100, "feedback": "feedback", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "feedback", "keyMoments": [] }
  },
  "strengths": [{ "title": "title", "description": "desc", "quote": "quote" }],
  "improvements": [{ "title": "title", "issue": "issue", "quote": "quote", "alternative": "better" }],
  "keyMoment": { "timestamp": "when", "description": "desc", "impact": "impact", "betterApproach": "better" },
  "summary": "2-3 sentence assessment",
  "nextSteps": ["action1", "action2", "action3"]
}`
    }]
  });

  const content = response.content[0].text;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  return JSON.parse(jsonMatch[1].trim());
}

async function run() {
  // Mark short/abandoned sessions as cancelled
  for (const skipId of SKIP) {
    await supabase
      .from('training_sessions')
      .update({ status: 'cancelled' })
      .eq('id', skipId);
    console.log(`Marked ${skipId} as cancelled (too short)`);
  }

  // Process real sessions
  for (const session of SESSIONS) {
    console.log(`\n--- Processing: ${session.name} (${session.id}) ---`);

    // 1. Get transcript from Retell
    let call;
    try {
      call = await retell.call.retrieve(session.callId);
    } catch (e) {
      console.log(`  Retell error: ${e.message} — skipping`);
      continue;
    }

    const transcript = call.transcript || '';
    const duration = call.end_timestamp
      ? Math.round((new Date(call.end_timestamp) - new Date(call.start_timestamp)) / 1000)
      : 0;

    console.log(`  Transcript: ${transcript.length} chars, Duration: ${duration}s`);

    if (transcript.length < 50) {
      console.log(`  Transcript too short — skipping`);
      await supabase.from('training_sessions').update({ status: 'cancelled' }).eq('id', session.id);
      continue;
    }

    // 2. Save transcript to session
    await supabase
      .from('training_sessions')
      .update({
        transcript_raw: transcript,
        duration_seconds: duration,
        ended_at: call.end_timestamp || new Date().toISOString()
      })
      .eq('id', session.id);
    console.log(`  Transcript saved`);

    // 3. Run Claude analysis
    console.log(`  Running Claude analysis...`);
    try {
      const analysis = await analyzeTranscript(transcript, session.name, duration);
      console.log(`  Score: ${analysis.overallScore}`);

      // 4. Save results
      await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          overall_score: analysis.overallScore,
          category_scores: analysis.categories,
          strengths: analysis.strengths,
          improvements: analysis.improvements
        })
        .eq('id', session.id);
      console.log(`  Results saved`);
    } catch (e) {
      console.error(`  Analysis failed: ${e.message}`);
    }
  }

  console.log('\nDone!');
}

run().catch(console.error);
