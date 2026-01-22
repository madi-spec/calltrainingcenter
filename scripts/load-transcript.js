#!/usr/bin/env node

/**
 * CLI script to load and analyze a conversation transcript
 *
 * Usage:
 *   node scripts/load-transcript.js <transcript-file>
 *   node scripts/load-transcript.js --text "CSR: Hello... Customer: Hi..."
 */

import { readFileSync } from 'fs';
import { config } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
config({ path: './server/.env' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function analyzeTranscript(transcript) {
  console.log('\n📝 Analyzing transcript...\n');

  const systemPrompt = `You are an expert at extracting business intelligence from conversation transcripts.
Your task is to identify companies, services, pain points, and coaching preferences.
Always respond with valid JSON only.`;

  const userPrompt = `Analyze this conversation transcript and extract relevant intelligence for a CSR training simulator.

Transcript:
${transcript}

Extract and respond with JSON in this exact format:
{
  "companies": [{ "name": "Company Name", "context": "How they were mentioned", "sentiment": "positive/negative/neutral" }],
  "services": ["Service 1", "Service 2"],
  "painPoints": [{ "issue": "Description", "severity": "high/medium/low", "quote": "Relevant quote" }],
  "terminology": { "industryTerms": ["term1"], "companySpecificTerms": ["term1"] },
  "customerTypes": ["Type 1"],
  "commonObjections": ["Objection 1"],
  "suggestedScenarios": [{ "name": "Scenario name", "description": "Brief description", "difficulty": "easy/medium/hard", "basedOn": "What inspired this" }],
  "coachingInsights": { "strengthsToReinforce": ["Strength 1"], "areasToAddress": ["Area 1"], "recommendedFocus": "Primary recommendation" }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0].text;

    // Parse JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const result = JSON.parse(jsonMatch[1].trim());

    return result;
  } catch (error) {
    console.error('Error analyzing transcript:', error.message);
    throw error;
  }
}

function printResults(results) {
  console.log('═'.repeat(60));
  console.log('📊 TRANSCRIPT ANALYSIS RESULTS');
  console.log('═'.repeat(60));

  if (results.painPoints?.length) {
    console.log('\n🔴 PAIN POINTS:');
    results.painPoints.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.severity.toUpperCase()}] ${p.issue}`);
      if (p.quote) console.log(`     "${p.quote}"`);
    });
  }

  if (results.suggestedScenarios?.length) {
    console.log('\n🎯 SUGGESTED TRAINING SCENARIOS:');
    results.suggestedScenarios.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (${s.difficulty})`);
      console.log(`     ${s.description}`);
    });
  }

  if (results.coachingInsights) {
    console.log('\n💡 COACHING INSIGHTS:');
    if (results.coachingInsights.recommendedFocus) {
      console.log(`  Focus: ${results.coachingInsights.recommendedFocus}`);
    }
    if (results.coachingInsights.strengthsToReinforce?.length) {
      console.log('  Strengths:');
      results.coachingInsights.strengthsToReinforce.forEach(s => console.log(`    ✓ ${s}`));
    }
    if (results.coachingInsights.areasToAddress?.length) {
      console.log('  Areas to Address:');
      results.coachingInsights.areasToAddress.forEach(a => console.log(`    ⚠ ${a}`));
    }
  }

  console.log('\n' + '═'.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
CSR Training Simulator - Transcript Analyzer

Usage:
  node scripts/load-transcript.js <transcript-file>
  node scripts/load-transcript.js --text "transcript content"

Examples:
  node scripts/load-transcript.js conversation.txt
  node scripts/load-transcript.js --text "CSR: Hello, how can I help?..."
    `);
    process.exit(1);
  }

  let transcript;

  if (args[0] === '--text') {
    transcript = args.slice(1).join(' ');
  } else {
    try {
      transcript = readFileSync(args[0], 'utf-8');
    } catch (error) {
      console.error(`Error reading file: ${args[0]}`);
      process.exit(1);
    }
  }

  try {
    const results = await analyzeTranscript(transcript);
    printResults(results);

    // Output raw JSON for piping
    console.log('\n📄 Raw JSON output:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

main();
