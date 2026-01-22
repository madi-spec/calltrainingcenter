import Anthropic from '@anthropic-ai/sdk';
import { buildCoachingPrompt, buildIntelligenceExtractionPrompt, buildSentimentPrompt } from './prompts.js';

// Lazy initialization to ensure env vars are loaded
let anthropic = null;

function getAnthropicClient() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

/**
 * Analyze transcript using Claude
 * @param {string} transcript - The conversation transcript
 * @param {string} type - Type of analysis: 'coaching', 'extract', 'sentiment'
 * @param {object} context - Additional context (scenario, company, etc.)
 */
export async function analyzeTranscript(transcript, type = 'coaching', context = {}) {
  try {
    let prompt;
    let systemPrompt;

    switch (type) {
      case 'coaching':
        const coachingPrompts = buildCoachingPrompt(transcript, context);
        systemPrompt = coachingPrompts.system;
        prompt = coachingPrompts.user;
        break;

      case 'extract':
        const extractionPrompts = buildIntelligenceExtractionPrompt(transcript);
        systemPrompt = extractionPrompts.system;
        prompt = extractionPrompts.user;
        break;

      case 'sentiment':
        const sentimentPrompts = buildSentimentPrompt(transcript);
        systemPrompt = sentimentPrompts.system;
        prompt = sentimentPrompts.user;
        break;

      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = response.content[0].text;

    // Parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing Claude response as JSON:', parseError);
      // Return raw content if JSON parsing fails
      return { raw: content, parseError: true };
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Extract company intelligence from scraped website content
 */
export async function extractCompanyIntelligence(websiteContent) {
  try {
    const systemPrompt = `You are an expert at extracting business intelligence from website content.
Your task is to analyze pest control company websites and extract structured data.
Always respond with valid JSON only, no additional text.`;

    const userPrompt = `Analyze this pest control company website content and extract:
1. Company name
2. Phone number
3. Service areas (cities/regions)
4. Services offered (list of pest types they treat)
5. Pricing information (if available)
6. Unique selling points / value propositions
7. Any mentioned guarantees or warranties
8. Business hours (if available)

Website content:
${websiteContent}

Respond with JSON in this exact format:
{
  "name": "Company Name",
  "phone": "xxx-xxx-xxxx",
  "serviceAreas": ["City 1", "City 2"],
  "services": ["Termite Control", "Ant Control", etc],
  "pricing": {
    "hasPublicPricing": true/false,
    "quarterlyPrice": "XX" or null,
    "initialPrice": "XX" or null,
    "notes": "any pricing notes"
  },
  "valuePropositions": ["Point 1", "Point 2"],
  "guarantees": ["Guarantee 1"],
  "businessHours": "Mon-Fri 8am-6pm" or null
}`;

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.content[0].text;

    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      return JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Error parsing company intelligence:', parseError);
      return { raw: content, parseError: true };
    }
  } catch (error) {
    console.error('Error extracting company intelligence:', error);
    throw error;
  }
}
