import Anthropic from '@anthropic-ai/sdk';

let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Extract text from a file buffer based on MIME type
 */
export async function extractText(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback
  return buffer.toString('utf-8');
}

/**
 * Split text into chunks of approximately maxChars characters
 * Tries to split on paragraph boundaries
 */
export function chunkText(text, maxChars = 32000) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (paragraph boundary)
    let breakPoint = remaining.lastIndexOf('\n\n', maxChars);
    if (breakPoint < maxChars * 0.5) {
      breakPoint = remaining.lastIndexOf('\n', maxChars);
    }
    if (breakPoint < maxChars * 0.5) {
      breakPoint = remaining.lastIndexOf('. ', maxChars);
    }
    if (breakPoint < maxChars * 0.5) {
      breakPoint = maxChars;
    }

    chunks.push(remaining.slice(0, breakPoint + 1));
    remaining = remaining.slice(breakPoint + 1);
  }

  return chunks;
}

/**
 * Parse a single chunk of text with Claude to extract structured data
 */
export async function parseChunk(chunkText, chunkIndex, totalChunks, existingData) {
  const existingSummary = [];
  if (existingData?.packages?.length) existingSummary.push(`${existingData.packages.length} packages`);
  if (existingData?.guidelines?.length) existingSummary.push(`${existingData.guidelines.length} guidelines`);
  if (existingData?.training_topics?.length) existingSummary.push(`${existingData.training_topics.length} training topics`);

  const alreadyExtracted = existingSummary.length > 0
    ? `Already extracted: ${existingSummary.join(', ')}.`
    : 'No data extracted yet.';

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Extract structured training data from this pest/home services company document.
Chunk ${chunkIndex + 1} of ${totalChunks}. ${alreadyExtracted}

Categories to extract:
1. SERVICE PACKAGES: name, description, pricing (initial_price, recurring_price, service_frequency), included_services (array), selling_points (array of strings), objections (array of {objection, response})
2. SALES GUIDELINES: guideline_type (one of: pricing_rule, qualification, process, communication, referral), title, content, examples (array of strings)
3. TRAINING TOPICS: distinct CSR skill areas that should be trained (title, description)

Only extract data that is clearly present in the text. Do not fabricate or assume.

TEXT:
${chunkText}

Respond with JSON only:
{
  "packages": [{"name":"","description":"","initial_price":null,"recurring_price":null,"service_frequency":"","included_services":[],"selling_points":[],"objections":[{"objection":"","response":""}]}],
  "guidelines": [{"guideline_type":"","title":"","content":"","examples":[]}],
  "training_topics": [{"title":"","description":""}]
}`
    }]
  });

  const content = response.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { packages: [], guidelines: [], training_topics: [] };
}

/**
 * Synthesize all accumulated chunk data into organized courses/modules/scenarios
 */
export async function synthesizeParsedData(accumulatedData, rawText) {
  const totalTextLength = Object.values(rawText).join(' ').length;
  const textPreview = Object.values(rawText).join(' ').slice(0, 2000);

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `You are organizing training content for a pest/home services company CSR training platform.

I have extracted the following raw data from ${totalTextLength} characters of company documents:
- ${accumulatedData.packages?.length || 0} service packages
- ${accumulatedData.guidelines?.length || 0} sales guidelines
- ${accumulatedData.training_topics?.length || 0} training topics

RAW EXTRACTED DATA:
${JSON.stringify(accumulatedData, null, 2)}

DOCUMENT PREVIEW (first 2000 chars):
${textPreview}

TASKS:
1. DEDUPLICATE packages — merge entries that describe the same service
2. DEDUPLICATE guidelines — merge similar rules
3. ORGANIZE training topics into 4-7 COURSES, each with 3-6 MODULES
4. For each module, create 2-5 SCENARIO TEMPLATES with:
   - base_situation: A specific customer situation (2-3 sentences)
   - csr_objectives: What the CSR should accomplish (array of strings)
   - scoring_focus: Key scoring areas (array of strings)
   - customer_goals: What the customer wants
   - resolution_conditions: When the scenario is resolved
   - difficulty: easy/medium/hard

Respond with JSON only:
{
  "packages": [{"name":"","description":"","initial_price":null,"recurring_price":null,"service_frequency":"","included_services":[],"selling_points":[],"objections":[{"objection":"","response":""}]}],
  "guidelines": [{"guideline_type":"","title":"","content":"","examples":[]}],
  "courses": [{
    "name":"",
    "description":"",
    "category":"",
    "icon":"",
    "modules":[{
      "name":"",
      "description":"",
      "difficulty":"medium",
      "scenario_count":10,
      "scenarios":[{
        "base_situation":"",
        "csr_objectives":[],
        "scoring_focus":[],
        "customer_goals":"",
        "resolution_conditions":"",
        "difficulty":"medium"
      }]
    }]
  }]
}`
    }]
  });

  const content = response.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse synthesis response');
}

/**
 * Generate AI voice agent prompt from parsed KB content
 */
export function generateAgentPrompt(parsedData, orgSettings) {
  const packages = parsedData.packages || [];
  const guidelines = parsedData.guidelines || [];

  const packageSection = packages.length > 0
    ? packages.map(pkg => {
        let price = '';
        if (pkg.recurring_price) {
          price = `$${pkg.recurring_price}/${pkg.service_frequency || 'month'}`;
          if (pkg.initial_price) price = `$${pkg.initial_price} initial + ${price}`;
        } else if (pkg.initial_price) {
          price = `$${pkg.initial_price} one-time`;
        }
        const points = pkg.selling_points?.length
          ? `\n  Key selling points: ${pkg.selling_points.join(', ')}`
          : '';
        return `- ${pkg.name}: ${pkg.description || 'No description'} ${price ? `(${price})` : ''}${points}`;
      }).join('\n')
    : 'Standard service packages available';

  const guidelineSection = guidelines.length > 0
    ? guidelines.map(g => `- [${g.guideline_type}] ${g.title}: ${g.content}`).join('\n')
    : '';

  return `## Service Packages Available
${packageSection}

${guidelineSection ? `## Sales Guidelines & Policies\n${guidelineSection}` : ''}

## Pricing Information
${packages.filter(p => p.recurring_price).map(p =>
  `- ${p.name}: $${p.recurring_price}/${p.service_frequency || 'month'}${p.initial_price ? ` (initial: $${p.initial_price})` : ''}`
).join('\n') || 'Contact for pricing'}`;
}

export default {
  extractText,
  chunkText,
  parseChunk,
  synthesizeParsedData,
  generateAgentPrompt
};
