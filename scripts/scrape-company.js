#!/usr/bin/env node

/**
 * CLI script to scrape a company website for branding data
 *
 * Usage:
 *   node scripts/scrape-company.js <url>
 *   node scripts/scrape-company.js https://www.accelpest.com
 */

import { config } from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
config({ path: './server/.env' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function scrapeWebsite(url) {
  console.log(`\n🌐 Scraping: ${url}\n`);

  // Normalize URL
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 15000
  });

  const $ = cheerio.load(response.data);

  // Extract logo
  let logo = null;
  $('header img, .logo img, [class*="logo"] img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      logo = src.startsWith('http') ? src : new URL(src, url).href;
      return false;
    }
  });

  // Extract text content
  $('script, style, nav, footer').remove();
  const textContent = $('main, article, .content, body').text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 15000);

  return { url, logo, textContent };
}

async function extractIntelligence(textContent) {
  console.log('🤖 Extracting business intelligence...\n');

  const systemPrompt = `You are an expert at extracting business intelligence from website content.
Your task is to analyze pest control company websites and extract structured data.
Always respond with valid JSON only.`;

  const userPrompt = `Analyze this pest control company website content and extract:

${textContent}

Respond with JSON:
{
  "name": "Company Name",
  "phone": "xxx-xxx-xxxx",
  "serviceAreas": ["City 1", "City 2"],
  "services": ["Termite Control", "Ant Control"],
  "pricing": { "hasPublicPricing": true/false, "quarterlyPrice": "XX" or null, "initialPrice": "XX" or null },
  "valuePropositions": ["Point 1", "Point 2"],
  "guarantees": ["Guarantee 1"],
  "businessHours": "Mon-Fri 8am-6pm" or null
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0].text;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  return JSON.parse(jsonMatch[1].trim());
}

function printResults(scrapedData, intelligence) {
  console.log('═'.repeat(60));
  console.log('🏢 COMPANY PROFILE');
  console.log('═'.repeat(60));

  console.log(`\n📛 Name: ${intelligence.name || 'Unknown'}`);
  console.log(`📞 Phone: ${intelligence.phone || 'Not found'}`);
  console.log(`🌐 Website: ${scrapedData.url}`);

  if (scrapedData.logo) {
    console.log(`🖼️  Logo: ${scrapedData.logo}`);
  }

  if (intelligence.serviceAreas?.length) {
    console.log(`\n📍 Service Areas:`);
    console.log(`   ${intelligence.serviceAreas.join(', ')}`);
  }

  if (intelligence.services?.length) {
    console.log(`\n🐜 Services:`);
    intelligence.services.forEach(s => console.log(`   • ${s}`));
  }

  if (intelligence.pricing) {
    console.log(`\n💰 Pricing:`);
    if (intelligence.pricing.quarterlyPrice) {
      console.log(`   Quarterly: $${intelligence.pricing.quarterlyPrice}`);
    }
    if (intelligence.pricing.initialPrice) {
      console.log(`   Initial: $${intelligence.pricing.initialPrice}`);
    }
  }

  if (intelligence.guarantees?.length) {
    console.log(`\n✅ Guarantees:`);
    intelligence.guarantees.forEach(g => console.log(`   • ${g}`));
  }

  if (intelligence.valuePropositions?.length) {
    console.log(`\n⭐ Value Propositions:`);
    intelligence.valuePropositions.forEach(v => console.log(`   • ${v}`));
  }

  if (intelligence.businessHours) {
    console.log(`\n🕐 Hours: ${intelligence.businessHours}`);
  }

  console.log('\n' + '═'.repeat(60));

  // Output config format
  console.log('\n📋 Configuration format (for config.json):');
  console.log(JSON.stringify({
    company: {
      name: intelligence.name,
      phone: intelligence.phone,
      website: scrapedData.url,
      logo: scrapedData.logo,
      serviceAreas: intelligence.serviceAreas,
      services: intelligence.services,
      pricing: intelligence.pricing,
      guarantees: intelligence.guarantees,
      valuePropositions: intelligence.valuePropositions,
      businessHours: intelligence.businessHours
    }
  }, null, 2));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
CSR Training Simulator - Company Website Scraper

Usage:
  node scripts/scrape-company.js <url>

Examples:
  node scripts/scrape-company.js https://www.accelpest.com
  node scripts/scrape-company.js pestcontrolcompany.com
    `);
    process.exit(1);
  }

  const url = args[0];

  try {
    const scrapedData = await scrapeWebsite(url);
    const intelligence = await extractIntelligence(scrapedData.textContent);
    printResults(scrapedData, intelligence);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
