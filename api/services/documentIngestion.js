import Anthropic from '@anthropic-ai/sdk';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';
import { createAdminClient } from '../lib/supabase.js';
import { createKnowledgeItems, createKnowledgeLinks, getKnowledgeItems } from './knowledgeGraph.js';

const anthropic = new Anthropic();

// ============================================================
// INPUT ADAPTERS — each returns { text: string, metadata: {} }
// ============================================================

export function extractFromPdf(buffer) {
  return pdfParse(buffer).then(result => ({
    text: result.text,
    metadata: { pages: result.numpages }
  }));
}

export async function extractFromPdfVision(base64Data) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
        },
        { type: 'text', text: 'Extract all text from this document. Preserve structure (headings, lists, tables). Return the text only.' }
      ]
    }]
  });
  return { text: response.content[0].text, metadata: { method: 'vision' } };
}

export function extractFromDocx(buffer) {
  return mammoth.extractRawText({ buffer }).then(result => ({
    text: result.value,
    metadata: {}
  }));
}

export function extractFromXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!json.length) continue;

    // Convert to markdown table
    const headers = json[0];
    const rows = json.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

    let md = `### Sheet: ${sheetName}\n\n`;
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;
    for (const row of rows) {
      md += `| ${headers.map((_, i) => row[i] ?? '').join(' | ')} |\n`;
    }
    sheets.push(md);
  }

  return {
    text: sheets.join('\n\n'),
    metadata: { sheetCount: workbook.SheetNames.length, sheetNames: workbook.SheetNames }
  };
}

export function extractFromText(text) {
  return { text, metadata: {} };
}

export async function extractFromUrl(url) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove nav, footer, scripts, styles
  $('nav, footer, script, style, header, aside, .nav, .footer, .sidebar').remove();

  // Get main content
  const main = $('main, article, .content, .main, #content, #main').first();
  const text = (main.length ? main : $('body')).text()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const title = $('title').text().trim();

  return {
    text: `# ${title}\n\n${text}`,
    metadata: { url, title }
  };
}

export async function extractFromImage(base64Data, mediaType) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data }
        },
        { type: 'text', text: 'Extract all text from this image. If it contains a table or structured data, preserve the structure. Return the text only.' }
      ]
    }]
  });
  return { text: response.content[0].text, metadata: { method: 'vision' } };
}

/**
 * Route a file to the correct adapter based on type
 */
export async function extractText(fileType, buffer, base64Data) {
  switch (fileType) {
    case 'application/pdf': {
      const result = await extractFromPdf(buffer);
      // If text extraction yields very little, try vision
      if (result.text.trim().length < 50 && base64Data) {
        return extractFromPdfVision(base64Data);
      }
      return result;
    }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(buffer);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'text/csv':
      return extractFromXlsx(buffer);
    case 'text/plain':
    case 'text/markdown':
      return extractFromText(buffer.toString('utf-8'));
    case 'image/png':
    case 'image/jpeg':
    case 'image/webp':
    case 'image/heic':
      return extractFromImage(base64Data, fileType);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// ============================================================
// CLASSIFICATION — what kind of document is this?
// ============================================================

export async function classifyDocument(text, filename) {
  const preview = text.substring(0, 2000);
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Classify this document for a pest control / home services company training system.

Filename: ${filename}
Content preview:
${preview}

Respond with JSON only:
{
  "classification": "pricing|playbook|handbook|sop|transcript|competitive|other",
  "summary": "one sentence summary"
}`
    }]
  });

  try {
    const parsed = JSON.parse(response.content[0].text);
    return parsed;
  } catch {
    return { classification: 'other', summary: 'Could not classify document' };
  }
}

// ============================================================
// CHUNKING — split text into processable pieces
// ============================================================

export function chunkText(text, maxChars = 24000) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // Try to split at section boundaries (##, ---, double newline)
    let splitPoint = -1;
    const searchRegion = remaining.substring(Math.floor(maxChars * 0.7), maxChars);
    const sectionBreak = searchRegion.lastIndexOf('\n## ');
    if (sectionBreak !== -1) {
      splitPoint = Math.floor(maxChars * 0.7) + sectionBreak;
    } else {
      const paraBreak = searchRegion.lastIndexOf('\n\n');
      if (paraBreak !== -1) {
        splitPoint = Math.floor(maxChars * 0.7) + paraBreak;
      } else {
        splitPoint = maxChars;
      }
    }

    chunks.push(remaining.substring(0, splitPoint));
    remaining = remaining.substring(splitPoint).trim();
  }

  return chunks;
}

// ============================================================
// EXTRACTION — turn text chunks into knowledge items
// ============================================================

const EXTRACTION_PROMPTS = {
  pricing: `Extract structured knowledge items from this pricing/product document for a pest control or home services company.

For each item found, return it as a knowledge item with:
- domain: "products" for packages/services, "objections" for anticipated objections
- itemType: "service_package", "pricing_tier", "add_on", "selling_point"
- title: clear name
- content: structured JSON with relevant fields (price, frequency, included_services, etc.)
- confidence: 0.0-1.0 how confident you are in the extraction`,

  playbook: `Extract structured knowledge items from this sales playbook for a pest control or home services company.

For each item found, return it as a knowledge item with:
- domain: "sales_playbook" for techniques/flows, "objections" for objection handlers
- itemType: "qualification_question", "closing_technique", "objection_response", "cross_sell_trigger", "discovery_flow"
- title: clear name
- content: structured JSON with relevant fields (script, steps, trigger, response, etc.)
- confidence: 0.0-1.0 how confident you are in the extraction`,

  handbook: `Extract structured knowledge items from this employee handbook / training manual for a pest control or home services company.

For each item found, return it as a knowledge item with:
- domain: "processes" for procedures/policies, "tribal_knowledge" for tips/best practices
- itemType: "call_procedure", "escalation_rule", "scheduling_policy", "refund_policy", "service_area_rule", "faq", "best_practice"
- title: clear name
- content: structured JSON with relevant fields (steps, conditions, policy_text, etc.)
- confidence: 0.0-1.0 how confident you are in the extraction`,

  sop: `Extract structured knowledge items from this SOP (standard operating procedure) for a pest control or home services company.

For each item found, return it as a knowledge item with:
- domain: "processes" for procedures, "sales_playbook" for sales-related SOPs
- itemType: "call_procedure", "escalation_rule", "scheduling_policy", "quality_check"
- title: clear name
- content: structured JSON with steps, conditions, requirements
- confidence: 0.0-1.0 how confident you are in the extraction`,

  transcript: `Extract structured knowledge items from this call transcript for a pest control or home services company.

For each item found, return it as a knowledge item with:
- domain: "tribal_knowledge" for techniques observed, "objections" for objections handled
- itemType: "best_practice", "objection_response", "closing_technique", "de_escalation_technique"
- title: clear descriptive name for the technique or pattern observed
- content: structured JSON with the actual dialogue excerpt, what made it effective, when to use it
- confidence: 0.0-1.0 how confident you are this is a reusable pattern`,

  competitive: `Extract structured knowledge items from this competitive intelligence document for a pest control or home services company.

For each item found, return it as a knowledge item with:
- domain: "competitive_intel"
- itemType: "competitor_comparison", "win_back_strategy", "differentiator"
- title: clear name (include competitor name)
- content: structured JSON with competitor_name, their_offering, our_advantage, pricing_comparison, talk_track
- confidence: 0.0-1.0 how confident you are in the extraction`,

  other: `Extract structured knowledge items from this document for a pest control or home services company training system.

For each item found, return it as a knowledge item with:
- domain: one of "products", "objections", "processes", "sales_playbook", "competitive_intel", "tribal_knowledge"
- itemType: descriptive type like "service_package", "objection_response", "call_procedure", "best_practice", etc.
- title: clear name
- content: structured JSON with relevant fields
- confidence: 0.0-1.0 how confident you are in the extraction`
};

/**
 * Extract knowledge items from a text chunk using classification-specific prompts
 */
export async function extractKnowledgeFromChunk(chunk, classification, existingItems = []) {
  const basePrompt = EXTRACTION_PROMPTS[classification] || EXTRACTION_PROMPTS.other;

  const existingContext = existingItems.length > 0
    ? `\n\nAlready extracted items (avoid duplicates):\n${existingItems.slice(-15).map(i => `- [${i.domain}] ${i.title}`).join('\n')}`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${basePrompt}${existingContext}

Document text:
${chunk}

Respond with JSON only — an array of knowledge items:
[
  {
    "domain": "...",
    "itemType": "...",
    "title": "...",
    "content": { ... },
    "confidence": 0.95
  }
]`
    }]
  });

  const text = response.content[0].text;

  // Parse JSON — try direct parse first, then extract from text
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Second parse failed — return empty with error logged
        console.error('[Ingestion] Failed to parse extraction response');
        return [];
      }
    }
    return [];
  }
}

// ============================================================
// DEDUPLICATION & LINKING
// ============================================================

/**
 * Ask AI to identify links between knowledge items
 */
export async function identifyLinks(items) {
  if (items.length < 2) return [];

  const itemSummary = items.map((item, i) => `[${i}] ${item.domain}/${item.item_type}: ${item.title}`).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Given these knowledge items for a pest control company, identify relationships between them.

Items:
${itemSummary}

Link types: has_objection, has_selling_point, competes_with, requires_process, related_to

Respond with JSON only — an array of links:
[
  { "sourceIndex": 0, "targetIndex": 3, "linkType": "has_objection" }
]

Only include clear, meaningful relationships. Don't force links.`
    }]
  });

  try {
    const parsed = JSON.parse(response.content[0].text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return []; }
    }
    return [];
  }
}

// ============================================================
// FULL INGESTION PIPELINE
// ============================================================

/**
 * Ingest a single document: extract text → classify → chunk → extract items → store
 * Returns { document, items } with DB records
 */
export async function ingestDocument(orgId, sessionId, docRecord, buffer, base64Data) {
  const supabase = createAdminClient();

  await supabase.from('kb_documents').update({ parse_status: 'parsing' }).eq('id', docRecord.id);

  try {
    // Step 1: Extract text from file
    console.log('[Ingestion] Extracting text from', docRecord.filename);
    const { text, metadata } = await extractText(docRecord.file_type, buffer, base64Data);
    console.log('[Ingestion] Extracted', text.length, 'chars from', docRecord.filename);

    // Step 2: Store raw text
    await supabase.from('kb_documents').update({ raw_text: text }).eq('id', docRecord.id);

    // Step 3: Single Claude call — classify AND extract in one shot
    // This replaces separate classify + chunk + extract-per-chunk (was 3-5 calls, now 1)
    const docPreview = text.substring(0, 30000); // Send up to 30K chars in one call
    console.log('[Ingestion] Calling Claude for classification + extraction...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `Analyze this document from a pest control / home services company. Do two things:

1. CLASSIFY the document type
2. EXTRACT all knowledge items

Filename: ${docRecord.filename}
Document content:
${docPreview}

Respond with JSON only:
{
  "classification": "pricing|playbook|handbook|sop|transcript|competitive|other",
  "summary": "one sentence summary",
  "items": [
    {
      "domain": "products|objections|processes|sales_playbook|competitive_intel|tribal_knowledge",
      "itemType": "service_package|pricing_tier|selling_point|objection_response|call_procedure|escalation_rule|qualification_question|closing_technique|competitor_comparison|faq|best_practice",
      "title": "clear descriptive name",
      "content": { "relevant": "structured data" },
      "confidence": 0.95
    }
  ]
}

Extract EVERY piece of actionable knowledge: service packages with pricing, selling points, objection handlers with responses, call procedures, sales techniques, competitor info, policies, FAQ answers. Be thorough.`
      }]
    });

    const responseText = response.content[0].text;
    console.log('[Ingestion] Claude responded, parsing...');

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
      }
    }

    if (!parsed) {
      console.error('[Ingestion] Failed to parse Claude response for', docRecord.filename);
      await supabase.from('kb_documents').update({
        parse_status: 'parsed',
        doc_classification: 'other'
      }).eq('id', docRecord.id);
      return { document: { ...docRecord, doc_classification: 'other' }, items: [], summary: 'Could not extract structured data' };
    }

    const classification = parsed.classification || 'other';
    const summary = parsed.summary || '';
    const extractedItems = Array.isArray(parsed.items) ? parsed.items : [];

    console.log('[Ingestion] Classified as', classification, '— extracted', extractedItems.length, 'items');

    // Step 4: Update classification
    await supabase.from('kb_documents').update({ doc_classification: classification }).eq('id', docRecord.id);

    if (extractedItems.length === 0) {
      await supabase.from('kb_documents').update({ parse_status: 'parsed' }).eq('id', docRecord.id);
      return { document: { ...docRecord, doc_classification: classification }, items: [], summary };
    }

    // Step 5: Store knowledge items
    const dbItems = await createKnowledgeItems(orgId, extractedItems.map(item => ({
      documentId: docRecord.id,
      domain: item.domain,
      itemType: item.itemType,
      title: item.title,
      content: item.content,
      confidence: item.confidence
    })));

    console.log('[Ingestion] Stored', dbItems.length, 'knowledge items');

    // Step 6: Mark parsed (skip linking for now — done lazily when needed)
    await supabase.from('kb_documents').update({ parse_status: 'parsed' }).eq('id', docRecord.id);

    return {
      document: { ...docRecord, doc_classification: classification },
      items: dbItems,
      summary,
      metadata
    };
  } catch (error) {
    console.error('[Ingestion] Error processing', docRecord.filename, ':', error.message);
    await supabase.from('kb_documents').update({
      parse_status: 'failed',
      parse_error: error.message
    }).eq('id', docRecord.id);
    throw error;
  }
}
