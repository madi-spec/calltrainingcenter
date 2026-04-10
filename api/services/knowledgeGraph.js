import { createAdminClient } from '../lib/supabase.js';

const DOMAINS = ['products', 'objections', 'processes', 'sales_playbook', 'competitive_intel', 'tribal_knowledge'];

export async function createKnowledgeItem(orgId, { documentId, domain, itemType, title, content, confidence }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('kb_knowledge_items')
    .insert({
      org_id: orgId,
      document_id: documentId,
      domain,
      item_type: itemType,
      title,
      content,
      confidence
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create knowledge item: ${error.message}`);
  return data;
}

export async function createKnowledgeItems(orgId, items) {
  if (!items.length) return [];
  const supabase = createAdminClient();
  const rows = items.map(({ documentId, domain, itemType, title, content, confidence }) => ({
    org_id: orgId,
    document_id: documentId,
    domain,
    item_type: itemType,
    title,
    content,
    confidence
  }));

  const { data, error } = await supabase
    .from('kb_knowledge_items')
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to bulk create knowledge items: ${error.message}`);
  return data;
}

export async function createKnowledgeLinks(links) {
  if (!links.length) return [];
  const supabase = createAdminClient();
  const rows = links.map(({ sourceItemId, targetItemId, linkType }) => ({
    source_item_id: sourceItemId,
    target_item_id: targetItemId,
    link_type: linkType
  }));

  const { data, error } = await supabase
    .from('kb_knowledge_links')
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to create knowledge links: ${error.message}`);
  return data;
}

export async function getKnowledgeItems(orgId, { domain, documentId } = {}) {
  const supabase = createAdminClient();
  let query = supabase
    .from('kb_knowledge_items')
    .select('*, document:kb_documents(id, filename, doc_classification)')
    .eq('org_id', orgId)
    .order('domain')
    .order('created_at');

  if (domain) query = query.eq('domain', domain);
  if (documentId) query = query.eq('document_id', documentId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get knowledge items: ${error.message}`);
  return data;
}

export async function getKnowledgeLinks(orgId) {
  const supabase = createAdminClient();

  const { data: items, error: itemsError } = await supabase
    .from('kb_knowledge_items')
    .select('id')
    .eq('org_id', orgId);

  if (itemsError) throw new Error(`Failed to fetch item IDs: ${itemsError.message}`);
  if (!items.length) return [];

  const itemIds = items.map(i => i.id);

  const { data, error } = await supabase
    .from('kb_knowledge_links')
    .select('*')
    .in('source_item_id', itemIds);

  if (error) throw new Error(`Failed to get knowledge links: ${error.message}`);
  return data;
}

export async function getRelatedItems(itemId) {
  const supabase = createAdminClient();

  const [outgoingResult, incomingResult] = await Promise.all([
    supabase
      .from('kb_knowledge_links')
      .select('*, item:kb_knowledge_items!target_item_id(*)')
      .eq('source_item_id', itemId),
    supabase
      .from('kb_knowledge_links')
      .select('*, item:kb_knowledge_items!source_item_id(*)')
      .eq('target_item_id', itemId)
  ]);

  if (outgoingResult.error) throw new Error(`Failed to get outgoing links: ${outgoingResult.error.message}`);
  if (incomingResult.error) throw new Error(`Failed to get incoming links: ${incomingResult.error.message}`);

  return {
    outgoing: outgoingResult.data,
    incoming: incomingResult.data
  };
}

export async function getKnowledgeCoverageStats(orgId) {
  const supabase = createAdminClient();

  const { data: items, error } = await supabase
    .from('kb_knowledge_items')
    .select('domain, confidence, verified')
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to get coverage stats: ${error.message}`);

  const total = items.length;
  const verified = items.filter(i => i.verified).length;

  const byDomain = {};
  for (const domain of DOMAINS) {
    const domainItems = items.filter(i => i.domain === domain);
    const domainVerified = domainItems.filter(i => i.verified).length;
    const avgConfidence = domainItems.length
      ? domainItems.reduce((sum, i) => sum + (i.confidence || 0), 0) / domainItems.length
      : 0;

    byDomain[domain] = {
      count: domainItems.length,
      verified: domainVerified,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }

  return { total, verified, byDomain };
}

export async function buildGraphSummary(orgId) {
  const items = await getKnowledgeItems(orgId);
  if (!items.length) return 'No knowledge items extracted yet.';

  const grouped = {};
  for (const domain of DOMAINS) {
    grouped[domain] = items.filter(i => i.domain === domain);
  }

  const sections = [];
  for (const domain of DOMAINS) {
    const domainItems = grouped[domain];
    if (!domainItems.length) continue;

    const label = domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const lines = domainItems.map(item => `- ${item.title}: ${item.content}`);
    sections.push(`## ${label}\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

export async function updateKnowledgeItem(itemId, updates) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('kb_knowledge_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update knowledge item: ${error.message}`);
  return data;
}

export async function deleteKnowledgeItem(itemId) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('kb_knowledge_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(`Failed to delete knowledge item: ${error.message}`);
}

export async function clearOrgKnowledge(orgId) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('kb_knowledge_items')
    .delete()
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to clear org knowledge: ${error.message}`);
}

export default {
  createKnowledgeItem,
  createKnowledgeItems,
  createKnowledgeLinks,
  getKnowledgeItems,
  getKnowledgeLinks,
  getRelatedItems,
  getKnowledgeCoverageStats,
  buildGraphSummary,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  clearOrgKnowledge
};
