import Anthropic from '@anthropic-ai/sdk';
import { getKnowledgeItems, getKnowledgeLinks } from './knowledgeGraph.js';

const DOMAINS = ['products', 'objections', 'processes', 'sales_playbook', 'competitive_intel', 'tribal_knowledge'];

export async function validateKnowledgeGraph(orgId) {
  const [items, links] = await Promise.all([
    getKnowledgeItems(orgId),
    getKnowledgeLinks(orgId)
  ]);

  const issues = [];

  // 1. Packages without selling points
  const packages = items.filter(i => i.item_type === 'service_package');
  const sellingPointLinks = new Set(
    links.filter(l => l.link_type === 'has_selling_point').map(l => l.source_item_id)
  );
  const packagesWithoutSellingPoints = packages.filter(p => !sellingPointLinks.has(p.id));
  if (packagesWithoutSellingPoints.length > 0) {
    issues.push({
      type: 'missing_selling_points',
      severity: 'warning',
      message: `${packagesWithoutSellingPoints.length} service package(s) have no selling points defined`,
      itemIds: packagesWithoutSellingPoints.map(p => p.id)
    });
  }

  // 2. Packages without objections
  const objectionLinks = new Set(
    links.filter(l => l.link_type === 'has_objection').map(l => l.source_item_id)
  );
  const packagesWithoutObjections = packages.filter(p => !objectionLinks.has(p.id));
  if (packagesWithoutObjections.length > 0) {
    issues.push({
      type: 'missing_objections',
      severity: 'info',
      message: `${packagesWithoutObjections.length} service package(s) have no objection handlers defined`,
      itemIds: packagesWithoutObjections.map(p => p.id)
    });
  }

  // 3. Contradictions — same domain::title but different content
  const grouped = new Map();
  for (const item of items) {
    const key = `${item.domain}::${item.title.toLowerCase().trim()}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  for (const [key, group] of grouped) {
    if (group.length > 1) {
      const contents = group.map(i => JSON.stringify(i.content));
      const unique = new Set(contents);
      if (unique.size > 1) {
        issues.push({
          type: 'contradiction',
          severity: 'error',
          message: `Contradicting items found for "${key}" — ${group.length} items with differing content`,
          itemIds: group.map(i => i.id)
        });
      }
    }
  }

  // 4. Low confidence unverified items
  const lowConfidence = items.filter(i => i.confidence < 0.7 && i.admin_verified === false);
  if (lowConfidence.length > 0) {
    issues.push({
      type: 'low_confidence',
      severity: 'warning',
      message: `${lowConfidence.length} item(s) have low confidence and are not admin-verified`,
      itemIds: lowConfidence.map(i => i.id)
    });
  }

  // 5. Empty domains
  const domainCounts = new Map(DOMAINS.map(d => [d, 0]));
  for (const item of items) {
    if (domainCounts.has(item.domain)) {
      domainCounts.set(item.domain, domainCounts.get(item.domain) + 1);
    }
  }
  for (const [domain, count] of domainCounts) {
    if (count === 0) {
      issues.push({
        type: 'coverage_gap',
        severity: 'info',
        message: `Domain "${domain}" has no knowledge items`,
        itemIds: []
      });
    }
  }

  // 6. Suspicious pricing format (more than 2 decimal places after $)
  const pricingTypes = ['service_package', 'pricing_tier'];
  const pricingItems = items.filter(i => pricingTypes.includes(i.item_type));
  const badPricing = pricingItems.filter(i => {
    const price = i.content?.price;
    if (!price) return false;
    const match = String(price).match(/\$?(\d+\.\d+)/);
    if (!match) return false;
    const decimals = match[1].split('.')[1];
    return decimals && decimals.length > 2;
  });
  if (badPricing.length > 0) {
    issues.push({
      type: 'pricing_format',
      severity: 'warning',
      message: `${badPricing.length} item(s) have suspicious price formatting (more than 2 decimal places)`,
      itemIds: badPricing.map(i => i.id)
    });
  }

  return issues;
}

export async function scoreContentQuality(item, knowledgeItems, anthropic) {
  const knowledgeSummary = knowledgeItems.slice(0, 20).map(k =>
    `[${k.domain}] ${k.title}: ${JSON.stringify(k.content).slice(0, 200)}`
  ).join('\n');

  const prompt = `You are evaluating training content quality for a customer service representative training simulator.

Content item to evaluate:
Type: ${item.type}
Title: ${item.title}
Content: ${JSON.stringify(item.content)}

Reference knowledge items:
${knowledgeSummary}

Score this content 0-100 based on:
- Accuracy: Does it align with the reference knowledge?
- Completeness: Does it cover what's needed?
- Actionability: Can a CSR act on this guidance?
- Clarity: Is it easy to understand?
- Relevance: Is it appropriate for CSR training?

Respond with JSON only:
{"score": <0-100>, "issues": [{"type": "<issue_type>", "message": "<description>"}]}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0]?.text ?? '';

    try {
      const parsed = JSON.parse(text);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
        issues: Array.isArray(parsed.issues) ? parsed.issues : []
      };
    } catch {
      const match = text.match(/"score"\s*:\s*(\d+)/);
      const score = match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 0;
      return { score, issues: [] };
    }
  } catch {
    return { score: 0, issues: [] };
  }
}
