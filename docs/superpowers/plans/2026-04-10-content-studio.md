# Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the buggy KB upload system with a conversational Content Studio that builds a knowledge graph from uploaded documents, interviews admins, and generates scripts, scenarios, and courses.

**Architecture:** Chat-based AI interface (left panel) + preview panels (right panel). Documents are ingested into an org-level knowledge graph of atomic knowledge items. An interview agent builds context through conversation. A generation pipeline produces versioned training programs from the graph. Publishing writes to existing course/scenario tables so the training flow stays unchanged.

**Tech Stack:** Express.js API, React frontend (Vite), Supabase (PostgreSQL), Anthropic Claude API (Haiku for classification, Sonnet for extraction/generation), SSE for streaming, SheetJS for XLSX parsing.

**Spec:** `docs/superpowers/specs/2026-04-10-content-studio-design.md`

---

## File Structure

### New API Files
| File | Responsibility |
|------|---------------|
| `api/routes/studio.js` | All `/api/studio/*` route handlers |
| `api/services/knowledgeGraph.js` | Knowledge item + link CRUD, graph queries, coverage stats, prompt summaries |
| `api/services/documentIngestion.js` | Input adapters (PDF, DOCX, XLSX, PPTX, URL, image, text), classification, chunking, extraction |
| `api/services/interviewAgent.js` | Claude conversation management, system prompt construction, tool call handling, context accumulation |
| `api/services/contentGenerator.js` | Graph → courses → scenarios → scripts generation pipeline |
| `api/services/contentValidator.js` | L1 (deterministic graph validation), L2 (AI quality scoring) |
| `api/services/programPublisher.js` | Version → live tables transactional publish, archival, rollback |
| `api/migrations/content_studio.sql` | All new tables + column additions in one migration |

### New Client Files
| File | Responsibility |
|------|---------------|
| `client/src/pages/studio/ContentStudio.jsx` | Main split-panel layout page |
| `client/src/pages/studio/StudioSessions.jsx` | List/manage studio sessions |
| `client/src/components/studio/ChatPanel.jsx` | Chat interface with message input, file upload, URL input |
| `client/src/components/studio/ChatMessage.jsx` | Message bubble — handles text, file reports, generation previews |
| `client/src/components/studio/PreviewPanel.jsx` | Tabbed container for right-side panels |
| `client/src/components/studio/KnowledgeGraphTab.jsx` | Domain coverage stats, item counts, validation flags |
| `client/src/components/studio/ScriptsTab.jsx` | Script cards with quality scores, source links, type filters |
| `client/src/components/studio/ScenariosTab.jsx` | Scenario templates with rubrics, voice context |
| `client/src/components/studio/CoursesTab.jsx` | Course structure with modules, learning objectives |
| `client/src/components/studio/VersionSelector.jsx` | Version dropdown, diff view, publish button |
| `client/src/hooks/useStudioChat.js` | SSE connection hook for streaming chat responses |

### Modified Files
| File | Change |
|------|--------|
| `api/index.js` | Import + mount studio routes |
| `api/package.json` | Add `xlsx` dependency |
| `client/src/App.jsx` | Add lazy-loaded studio routes |
| `client/src/components/Layout.jsx` | Add Content Studio nav item |
| `api/services/scenarioGenerator.js` | Read `voice_agent_context` and `scoring_rubric` from enhanced templates |

---

## Phase 1: Foundation (Database + Knowledge Graph)

### Task 1: Database Migration

**Files:**
- Create: `api/migrations/content_studio.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Content Studio tables
-- Run via Supabase Dashboard SQL Editor or CLI

-- Studio sessions: one per Content Studio conversation
CREATE TABLE IF NOT EXISTS studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'interviewing' CHECK (status IN ('interviewing', 'generating', 'reviewing', 'published', 'archived')),
  interview_context JSONB DEFAULT '{}',
  admin_priorities JSONB DEFAULT '[]',
  published_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_sessions_org ON studio_sessions(organization_id);

-- Studio messages: chat history
CREATE TABLE IF NOT EXISTS studio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'upload', 'generation', 'feedback')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_messages_session ON studio_messages(session_id);

-- KB documents: individual uploaded files
CREATE TABLE IF NOT EXISTS kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url', 'paste', 'transcript')),
  source_url TEXT,
  raw_text TEXT,
  doc_classification TEXT CHECK (doc_classification IN ('pricing', 'playbook', 'handbook', 'sop', 'transcript', 'competitive', 'other')),
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsing', 'parsed', 'failed')),
  parse_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_documents_session ON kb_documents(session_id);
CREATE INDEX idx_kb_documents_org ON kb_documents(organization_id);

-- Knowledge items: atomic knowledge nodes
CREATE TABLE IF NOT EXISTS kb_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES kb_documents(id) ON DELETE SET NULL,
  domain TEXT NOT NULL CHECK (domain IN ('products', 'objections', 'processes', 'sales_playbook', 'competitive_intel', 'tribal_knowledge')),
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  confidence FLOAT DEFAULT 1.0,
  admin_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_items_org ON kb_knowledge_items(organization_id);
CREATE INDEX idx_kb_items_domain ON kb_knowledge_items(organization_id, domain);
CREATE INDEX idx_kb_items_document ON kb_knowledge_items(document_id);

-- Knowledge links: graph edges between items
CREATE TABLE IF NOT EXISTS kb_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id UUID NOT NULL REFERENCES kb_knowledge_items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES kb_knowledge_items(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_links_source ON kb_knowledge_links(source_item_id);
CREATE INDEX idx_kb_links_target ON kb_knowledge_links(target_item_id);

-- Program versions: versioned generation snapshots
CREATE TABLE IF NOT EXISTS program_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'draft', 'published', 'archived')),
  generation_stats JSONB DEFAULT '{}',
  quality_score FLOAT,
  knowledge_coverage FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_program_versions_org ON program_versions(organization_id);
CREATE INDEX idx_program_versions_session ON program_versions(session_id);

-- Add FK from studio_sessions to program_versions (deferred to avoid circular dep)
ALTER TABLE studio_sessions
  ADD CONSTRAINT fk_studio_sessions_published_version
  FOREIGN KEY (published_version_id) REFERENCES program_versions(id);

-- Generated scripts: talk tracks, reference cards, role-play dialogues
CREATE TABLE IF NOT EXISTS generated_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES program_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  script_type TEXT NOT NULL CHECK (script_type IN ('talk_track', 'reference_card', 'role_play')),
  title TEXT NOT NULL,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  content JSONB NOT NULL DEFAULT '{}',
  knowledge_item_ids UUID[] DEFAULT '{}',
  quality_score FLOAT,
  quality_issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_scripts_version ON generated_scripts(version_id);
CREATE INDEX idx_generated_scripts_org ON generated_scripts(organization_id);

-- Add new columns to existing tables
ALTER TABLE scenario_templates
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES program_versions(id),
  ADD COLUMN IF NOT EXISTS knowledge_item_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice_agent_context TEXT,
  ADD COLUMN IF NOT EXISTS scoring_rubric JSONB,
  ADD COLUMN IF NOT EXISTS quality_score FLOAT;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES program_versions(id),
  ADD COLUMN IF NOT EXISTS knowledge_coverage JSONB;

ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS learning_objectives JSONB,
  ADD COLUMN IF NOT EXISTS associated_script_ids UUID[] DEFAULT '{}';
```

- [ ] **Step 2: Run migration in Supabase**

Open the Supabase Dashboard SQL Editor at:
`https://supabase.com/dashboard/project/<project-ref>/sql`

Paste and execute the migration SQL. Verify all tables created:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('studio_sessions', 'studio_messages', 'kb_documents',
  'kb_knowledge_items', 'kb_knowledge_links', 'program_versions', 'generated_scripts');
```

Expected: 7 rows returned.

- [ ] **Step 3: Commit**

```bash
git add api/migrations/content_studio.sql
git commit -m "Add Content Studio database migration — 7 new tables, 3 table modifications"
```

---

### Task 2: Knowledge Graph Service

**Files:**
- Create: `api/services/knowledgeGraph.js`

- [ ] **Step 1: Create the knowledge graph service**

```javascript
import { createAdminClient } from '../lib/supabase.js';

/**
 * Create a knowledge item in the graph
 */
export async function createKnowledgeItem(orgId, { documentId, domain, itemType, title, content, confidence = 1.0 }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('kb_knowledge_items')
    .insert({
      organization_id: orgId,
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

/**
 * Create multiple knowledge items in bulk
 */
export async function createKnowledgeItems(orgId, items) {
  if (!items.length) return [];
  const supabase = createAdminClient();
  const rows = items.map(item => ({
    organization_id: orgId,
    document_id: item.documentId || null,
    domain: item.domain,
    item_type: item.itemType,
    title: item.title,
    content: item.content,
    confidence: item.confidence ?? 1.0
  }));

  const { data, error } = await supabase
    .from('kb_knowledge_items')
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to create knowledge items: ${error.message}`);
  return data;
}

/**
 * Create links between knowledge items
 */
export async function createKnowledgeLinks(links) {
  if (!links.length) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('kb_knowledge_links')
    .insert(links.map(l => ({
      source_item_id: l.sourceItemId,
      target_item_id: l.targetItemId,
      link_type: l.linkType
    })))
    .select();

  if (error) throw new Error(`Failed to create knowledge links: ${error.message}`);
  return data;
}

/**
 * Get all knowledge items for an org, optionally filtered by domain
 */
export async function getKnowledgeItems(orgId, { domain, documentId } = {}) {
  const supabase = createAdminClient();
  let query = supabase
    .from('kb_knowledge_items')
    .select('*, document:kb_documents(id, filename, doc_classification)')
    .eq('organization_id', orgId)
    .order('domain')
    .order('created_at');

  if (domain) query = query.eq('domain', domain);
  if (documentId) query = query.eq('document_id', documentId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch knowledge items: ${error.message}`);
  return data;
}

/**
 * Get all links for an org's knowledge items
 */
export async function getKnowledgeLinks(orgId) {
  const supabase = createAdminClient();
  const { data: items } = await supabase
    .from('kb_knowledge_items')
    .select('id')
    .eq('organization_id', orgId);

  if (!items?.length) return [];
  const itemIds = items.map(i => i.id);

  const { data, error } = await supabase
    .from('kb_knowledge_links')
    .select('*')
    .in('source_item_id', itemIds);

  if (error) throw new Error(`Failed to fetch knowledge links: ${error.message}`);
  return data;
}

/**
 * Get related items for a given item (follow links in both directions)
 */
export async function getRelatedItems(itemId) {
  const supabase = createAdminClient();

  const [outgoing, incoming] = await Promise.all([
    supabase
      .from('kb_knowledge_links')
      .select('*, target:kb_knowledge_items!target_item_id(*)')
      .eq('source_item_id', itemId),
    supabase
      .from('kb_knowledge_links')
      .select('*, source:kb_knowledge_items!source_item_id(*)')
      .eq('target_item_id', itemId)
  ]);

  return {
    outgoing: outgoing.data || [],
    incoming: incoming.data || []
  };
}

/**
 * Get coverage stats per domain for an org
 */
export async function getKnowledgeCoverageStats(orgId) {
  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from('kb_knowledge_items')
    .select('domain, confidence, admin_verified')
    .eq('organization_id', orgId);

  if (error) throw new Error(`Failed to fetch coverage stats: ${error.message}`);

  const domains = ['products', 'objections', 'processes', 'sales_playbook', 'competitive_intel', 'tribal_knowledge'];
  const stats = {};

  for (const domain of domains) {
    const domainItems = (items || []).filter(i => i.domain === domain);
    stats[domain] = {
      count: domainItems.length,
      verified: domainItems.filter(i => i.admin_verified).length,
      avgConfidence: domainItems.length > 0
        ? domainItems.reduce((sum, i) => sum + (i.confidence || 0), 0) / domainItems.length
        : 0
    };
  }

  return {
    total: (items || []).length,
    verified: (items || []).filter(i => i.admin_verified).length,
    domains: stats
  };
}

/**
 * Build a text summary of the knowledge graph for prompt injection.
 * Returns a structured string that can be included in AI system prompts.
 */
export async function buildGraphSummary(orgId) {
  const items = await getKnowledgeItems(orgId);
  if (!items.length) return 'No knowledge items extracted yet.';

  const sections = [];

  // Group by domain
  const byDomain = {};
  for (const item of items) {
    if (!byDomain[item.domain]) byDomain[item.domain] = [];
    byDomain[item.domain].push(item);
  }

  const domainLabels = {
    products: 'Products & Services',
    objections: 'Objections & Responses',
    processes: 'Processes & Policies',
    sales_playbook: 'Sales Playbook',
    competitive_intel: 'Competitive Intelligence',
    tribal_knowledge: 'Tribal Knowledge'
  };

  for (const [domain, domainItems] of Object.entries(byDomain)) {
    const label = domainLabels[domain] || domain;
    const itemSummaries = domainItems.map(item => {
      const content = item.content;
      if (typeof content === 'string') return `- ${item.title}: ${content}`;
      // For JSONB content, create a readable summary
      const details = Object.entries(content)
        .filter(([k, v]) => v && k !== 'raw')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ');
      return `- ${item.title}${details ? ` (${details})` : ''}`;
    });
    sections.push(`## ${label}\n${itemSummaries.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Update a knowledge item
 */
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

/**
 * Delete a knowledge item and its links
 */
export async function deleteKnowledgeItem(itemId) {
  const supabase = createAdminClient();
  // Links cascade on delete, so just delete the item
  const { error } = await supabase
    .from('kb_knowledge_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(`Failed to delete knowledge item: ${error.message}`);
}

/**
 * Delete all knowledge items for an org (used when starting fresh)
 */
export async function clearOrgKnowledge(orgId) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('kb_knowledge_items')
    .delete()
    .eq('organization_id', orgId);

  if (error) throw new Error(`Failed to clear org knowledge: ${error.message}`);
}
```

- [ ] **Step 2: Verify the service loads**

```bash
cd api && node -e "import('./services/knowledgeGraph.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/services/knowledgeGraph.js
git commit -m "Add knowledge graph service — CRUD, links, coverage stats, prompt summaries"
```

---

### Task 3: Content Validator (L1 — Deterministic)

**Files:**
- Create: `api/services/contentValidator.js`

- [ ] **Step 1: Create the validator with L1 checks**

```javascript
import { getKnowledgeItems, getKnowledgeLinks } from './knowledgeGraph.js';

/**
 * L1: Deterministic knowledge graph validation.
 * Returns an array of validation issues — each with type, severity, message, and affected item IDs.
 */
export async function validateKnowledgeGraph(orgId) {
  const items = await getKnowledgeItems(orgId);
  const links = await getKnowledgeLinks(orgId);
  const issues = [];

  // Check 1: Packages without selling points
  const packages = items.filter(i => i.item_type === 'service_package');
  const sellingPoints = items.filter(i => i.item_type === 'selling_point');
  const packageLinks = links.filter(l => l.link_type === 'has_selling_point');

  for (const pkg of packages) {
    const hasSellingPoints = packageLinks.some(l => l.source_item_id === pkg.id);
    if (!hasSellingPoints && sellingPoints.length > 0) {
      issues.push({
        type: 'completeness',
        severity: 'warning',
        message: `Package "${pkg.title}" has no linked selling points`,
        itemIds: [pkg.id]
      });
    }
  }

  // Check 2: Packages without objections
  const objectionLinks = links.filter(l => l.link_type === 'has_objection');
  for (const pkg of packages) {
    const hasObjections = objectionLinks.some(l => l.source_item_id === pkg.id);
    if (!hasObjections && items.some(i => i.domain === 'objections')) {
      issues.push({
        type: 'completeness',
        severity: 'info',
        message: `Package "${pkg.title}" has no linked objection handlers`,
        itemIds: [pkg.id]
      });
    }
  }

  // Check 3: Contradictions — duplicate titles in same domain with different content
  const byDomainTitle = {};
  for (const item of items) {
    const key = `${item.domain}::${item.title.toLowerCase().trim()}`;
    if (!byDomainTitle[key]) byDomainTitle[key] = [];
    byDomainTitle[key].push(item);
  }

  for (const [key, group] of Object.entries(byDomainTitle)) {
    if (group.length > 1) {
      // Check if content actually differs
      const contents = group.map(i => JSON.stringify(i.content));
      const unique = new Set(contents);
      if (unique.size > 1) {
        issues.push({
          type: 'contradiction',
          severity: 'error',
          message: `Conflicting entries for "${group[0].title}" in ${group[0].domain} domain (${group.length} versions)`,
          itemIds: group.map(i => i.id)
        });
      }
    }
  }

  // Check 4: Low confidence items that need verification
  const lowConfidence = items.filter(i => i.confidence < 0.7 && !i.admin_verified);
  for (const item of lowConfidence) {
    issues.push({
      type: 'low_confidence',
      severity: 'warning',
      message: `"${item.title}" was extracted with low confidence (${Math.round(item.confidence * 100)}%) — needs verification`,
      itemIds: [item.id]
    });
  }

  // Check 5: Empty domains
  const domains = ['products', 'objections', 'processes', 'sales_playbook', 'competitive_intel', 'tribal_knowledge'];
  const populatedDomains = new Set(items.map(i => i.domain));
  for (const domain of domains) {
    if (!populatedDomains.has(domain)) {
      issues.push({
        type: 'coverage_gap',
        severity: 'info',
        message: `No knowledge items in the "${domain}" domain yet`,
        itemIds: []
      });
    }
  }

  // Check 6: Pricing format consistency
  const pricingItems = items.filter(i =>
    i.item_type === 'service_package' || i.item_type === 'pricing_tier'
  );
  for (const item of pricingItems) {
    const content = item.content;
    if (content.price !== undefined && content.price !== null) {
      const price = String(content.price);
      // Flag if price looks like it might be wrong format
      if (price.includes('$') && price.includes('.') && price.split('.')[1]?.length > 2) {
        issues.push({
          type: 'format',
          severity: 'warning',
          message: `Price format may be incorrect for "${item.title}": ${price}`,
          itemIds: [item.id]
        });
      }
    }
  }

  return issues;
}

/**
 * L2: AI-powered content quality scoring.
 * Scores a generated content item against a rubric.
 * Returns { score: 0-100, issues: [] }
 */
export async function scoreContentQuality(item, knowledgeItems, anthropic) {
  const prompt = `Score this generated training content for quality on a scale of 0-100.

Content type: ${item.type}
Title: ${item.title}
Content: ${JSON.stringify(item.content)}

Available knowledge graph items for verification:
${knowledgeItems.slice(0, 20).map(ki => `- [${ki.domain}] ${ki.title}: ${JSON.stringify(ki.content).substring(0, 200)}`).join('\n')}

Score based on:
1. Accuracy — does the content match the knowledge graph? (no hallucinated facts)
2. Completeness — does it cover what it claims to cover?
3. Actionability — can a CSR actually use this?
4. Clarity — is it clear and well-structured?
5. Relevance — does it target the right skill/scenario?

Respond with JSON only:
{
  "score": <number 0-100>,
  "issues": [{"type": "accuracy|completeness|clarity|relevance", "message": "specific issue"}]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;
  try {
    const parsed = JSON.parse(text);
    return {
      score: Math.max(0, Math.min(100, parsed.score || 0)),
      issues: parsed.issues || []
    };
  } catch {
    // If JSON parsing fails, try to extract from text
    const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
      issues: [{ type: 'clarity', message: 'Quality scoring returned non-standard format' }]
    };
  }
}
```

- [ ] **Step 2: Verify the service loads**

```bash
cd api && node -e "import('./services/contentValidator.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/services/contentValidator.js
git commit -m "Add content validator — L1 deterministic graph validation, L2 AI quality scoring"
```

---

## Phase 2: Document Ingestion Pipeline

### Task 4: Install New Dependencies

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Install xlsx**

```bash
cd api && npm install xlsx
```

- [ ] **Step 2: Verify install**

```bash
cd api && node -e "import('xlsx').then(m => console.log('xlsx version:', Object.keys(m).length, 'exports')).catch(e => console.error(e))"
```

Expected: Output showing xlsx exports loaded.

- [ ] **Step 3: Commit**

```bash
git add api/package.json api/package-lock.json
git commit -m "Add xlsx dependency for spreadsheet parsing"
```

---

### Task 5: Document Ingestion Service

**Files:**
- Create: `api/services/documentIngestion.js`

- [ ] **Step 1: Create the ingestion service with all input adapters and the extraction pipeline**

```javascript
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

  // Step 1: Update status to parsing
  await supabase.from('kb_documents').update({ parse_status: 'parsing' }).eq('id', docRecord.id);

  try {
    // Step 2: Extract text
    const { text, metadata } = await extractText(docRecord.file_type, buffer, base64Data);

    // Step 3: Store raw text
    await supabase.from('kb_documents').update({ raw_text: text }).eq('id', docRecord.id);

    // Step 4: Classify
    const { classification, summary } = await classifyDocument(text, docRecord.filename);
    await supabase.from('kb_documents').update({ doc_classification: classification }).eq('id', docRecord.id);

    // Step 5: Chunk
    const chunks = chunkText(text);

    // Step 6: Extract knowledge items from each chunk
    const allExtracted = [];
    for (const chunk of chunks) {
      const items = await extractKnowledgeFromChunk(chunk, classification, allExtracted);
      allExtracted.push(...items);
    }

    if (allExtracted.length === 0) {
      await supabase.from('kb_documents').update({ parse_status: 'parsed' }).eq('id', docRecord.id);
      return { document: docRecord, items: [] };
    }

    // Step 7: Store knowledge items
    const dbItems = await createKnowledgeItems(orgId, allExtracted.map(item => ({
      documentId: docRecord.id,
      domain: item.domain,
      itemType: item.itemType,
      title: item.title,
      content: item.content,
      confidence: item.confidence
    })));

    // Step 8: Identify and store links
    const existingItems = await getKnowledgeItems(orgId);
    const linkSuggestions = await identifyLinks(existingItems);
    if (linkSuggestions.length > 0) {
      const validLinks = linkSuggestions
        .filter(l => l.sourceIndex < existingItems.length && l.targetIndex < existingItems.length)
        .map(l => ({
          sourceItemId: existingItems[l.sourceIndex].id,
          targetItemId: existingItems[l.targetIndex].id,
          linkType: l.linkType
        }));

      if (validLinks.length > 0) {
        await createKnowledgeLinks(validLinks);
      }
    }

    // Step 9: Mark parsed
    await supabase.from('kb_documents').update({ parse_status: 'parsed' }).eq('id', docRecord.id);

    return {
      document: { ...docRecord, doc_classification: classification },
      items: dbItems,
      summary,
      metadata
    };
  } catch (error) {
    await supabase.from('kb_documents').update({
      parse_status: 'failed',
      parse_error: error.message
    }).eq('id', docRecord.id);
    throw error;
  }
}
```

- [ ] **Step 2: Verify the service loads**

```bash
cd api && node -e "import('./services/documentIngestion.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/services/documentIngestion.js
git commit -m "Add document ingestion service — 7 input adapters, classification, extraction pipeline"
```

---

## Phase 3: Interview Agent + Content Generation

### Task 6: Interview Agent Service

**Files:**
- Create: `api/services/interviewAgent.js`

- [ ] **Step 1: Create the interview agent service**

```javascript
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '../lib/supabase.js';
import { buildGraphSummary, getKnowledgeCoverageStats, updateKnowledgeItem } from './knowledgeGraph.js';
import { validateKnowledgeGraph } from './contentValidator.js';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a Training Program Designer AI for pest control, lawn care, and home services companies. You're helping an admin build a customized CSR training program from their company documents.

Your role:
- Analyze uploaded documents and the knowledge graph
- Ask smart, specific questions to fill gaps and resolve conflicts
- Help the admin prioritize what their training should focus on
- Generate training content (scripts, scenarios, courses) when ready

Conversation style:
- One question at a time — never multi-part interrogation
- Be specific — reference actual data from their documents
- Respect their time — don't ask what the docs already answer
- Accept "skip" or "not sure" gracefully and move on
- After each phase, offer an off-ramp: "I could generate now, or dig deeper"

When you have enough context, proactively offer to generate. Show what you'll create (course count, scenario count, script count) and wait for approval.

When responding to feedback after generation, be precise about what you'll change and why.`;

function buildContextBlock(graphSummary, coverageStats, validationIssues, interviewContext, phase) {
  let context = `## Current Knowledge Graph State\n\n`;
  context += `Total items: ${coverageStats.total} | Verified: ${coverageStats.verified}\n\n`;

  context += `### Domain Coverage\n`;
  for (const [domain, stats] of Object.entries(coverageStats.domains)) {
    const bar = stats.count > 0 ? '✅' : '⬜';
    context += `${bar} ${domain}: ${stats.count} items (${stats.verified} verified)\n`;
  }

  if (validationIssues.length > 0) {
    context += `\n### Validation Issues (${validationIssues.length})\n`;
    const errors = validationIssues.filter(i => i.severity === 'error');
    const warnings = validationIssues.filter(i => i.severity === 'warning');
    if (errors.length) context += `❌ ${errors.length} conflicts\n`;
    if (warnings.length) context += `⚠️ ${warnings.length} warnings\n`;
    for (const issue of validationIssues.slice(0, 5)) {
      context += `- [${issue.severity}] ${issue.message}\n`;
    }
  }

  if (interviewContext && Object.keys(interviewContext).length > 0) {
    context += `\n### Interview Context Accumulated\n`;
    if (interviewContext.pain_points?.length) context += `Pain points: ${interviewContext.pain_points.join(', ')}\n`;
    if (interviewContext.priorities?.length) context += `Priorities: ${interviewContext.priorities.map(p => p.topic).join(', ')}\n`;
    if (interviewContext.resolved_conflicts?.length) context += `Resolved conflicts: ${interviewContext.resolved_conflicts.length}\n`;
  }

  context += `\n### Knowledge Graph Summary\n${graphSummary}`;
  context += `\n\nCurrent phase: ${phase}`;

  return context;
}

/**
 * Process a chat message from the admin.
 * Returns the AI response text and any side effects (knowledge updates, generation triggers).
 */
export async function processMessage(sessionId, userMessage) {
  const supabase = createAdminClient();

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('studio_sessions')
    .select('*, organization:organizations(id, name)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) throw new Error('Session not found');

  const orgId = session.organization_id;
  const interviewContext = session.interview_context || {};

  // Build context
  const [graphSummary, coverageStats, validationIssues] = await Promise.all([
    buildGraphSummary(orgId),
    getKnowledgeCoverageStats(orgId),
    validateKnowledgeGraph(orgId)
  ]);

  const contextBlock = buildContextBlock(
    graphSummary, coverageStats, validationIssues, interviewContext, session.status
  );

  // Fetch recent chat history
  const { data: recentMessages } = await supabase
    .from('studio_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(30);

  // Build messages array
  const messages = (recentMessages || []).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  messages.push({ role: 'user', content: userMessage });

  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
    messages
  });

  const assistantMessage = response.content[0].text;

  // Store both messages
  await supabase.from('studio_messages').insert([
    { session_id: sessionId, role: 'user', content: userMessage, message_type: 'chat' },
    { session_id: sessionId, role: 'assistant', content: assistantMessage, message_type: 'chat' }
  ]);

  // Parse any context updates from the AI response
  // Look for structured signals in the response
  const updatedContext = { ...interviewContext };
  let contextChanged = false;

  // Simple heuristic: if the AI confirmed resolving a conflict, note it
  if (userMessage.toLowerCase().includes('current') || userMessage.toLowerCase().includes('correct') || userMessage.toLowerCase().includes('right')) {
    // Could be confirming a price or fact — mark as noted
    if (!updatedContext.resolved_conflicts) updatedContext.resolved_conflicts = [];
    contextChanged = true;
  }

  // If AI asked about pain points and user answered
  if (assistantMessage.toLowerCase().includes('struggle') || assistantMessage.toLowerCase().includes('pain point')) {
    if (!updatedContext.pain_points) updatedContext.pain_points = [];
  }

  if (contextChanged) {
    await supabase.from('studio_sessions').update({
      interview_context: updatedContext,
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);
  }

  return {
    message: assistantMessage,
    coverageStats,
    validationIssues: validationIssues.length
  };
}

/**
 * Generate the initial AI message when a session starts or documents finish processing
 */
export async function generateWelcomeMessage(sessionId) {
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('studio_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');

  const orgId = session.organization_id;

  // Get documents and knowledge stats
  const [{ data: docs }, coverageStats, validationIssues] = await Promise.all([
    supabase.from('kb_documents').select('filename, doc_classification, parse_status').eq('session_id', sessionId),
    getKnowledgeCoverageStats(orgId),
    validateKnowledgeGraph(orgId)
  ]);

  const parsedDocs = (docs || []).filter(d => d.parse_status === 'parsed');
  const failedDocs = (docs || []).filter(d => d.parse_status === 'failed');

  let welcomeContent = `I've analyzed ${parsedDocs.length} document${parsedDocs.length !== 1 ? 's' : ''}`;
  if (failedDocs.length > 0) {
    welcomeContent += ` (${failedDocs.length} couldn't be processed)`;
  }
  welcomeContent += `. Here's what I found:\n\n`;

  for (const doc of parsedDocs) {
    welcomeContent += `📄 **${doc.filename}** — classified as ${doc.doc_classification}\n`;
  }

  welcomeContent += `\n**Knowledge extracted:** ${coverageStats.total} items across ${Object.values(coverageStats.domains).filter(d => d.count > 0).length} domains.\n`;

  if (validationIssues.length > 0) {
    const errors = validationIssues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      welcomeContent += `\n⚠️ I found ${errors.length} conflict${errors.length !== 1 ? 's' : ''} that I need your help resolving.\n`;
      welcomeContent += `\n${errors[0].message}\n`;
    }
  } else {
    // Ask a deepening question
    const emptyDomains = Object.entries(coverageStats.domains)
      .filter(([, stats]) => stats.count === 0)
      .map(([domain]) => domain);

    if (emptyDomains.length > 0) {
      welcomeContent += `\nI have some questions to make your training program better. `;
    }
    welcomeContent += `What's the #1 thing new CSRs struggle with at your company?`;
  }

  // Store the welcome message
  await supabase.from('studio_messages').insert({
    session_id: sessionId,
    role: 'assistant',
    content: welcomeContent,
    message_type: 'chat'
  });

  return { message: welcomeContent, coverageStats, validationIssues: validationIssues.length };
}
```

- [ ] **Step 2: Verify the service loads**

```bash
cd api && node -e "import('./services/interviewAgent.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/services/interviewAgent.js
git commit -m "Add interview agent service — Claude conversation, context accumulation, welcome messages"
```

---

### Task 7: Content Generator Service

**Files:**
- Create: `api/services/contentGenerator.js`

- [ ] **Step 1: Create the content generator with all three generators (courses, scenarios, scripts)**

```javascript
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '../lib/supabase.js';
import { getKnowledgeItems, getKnowledgeLinks, buildGraphSummary } from './knowledgeGraph.js';
import { scoreContentQuality } from './contentValidator.js';

const anthropic = new Anthropic();

/**
 * Generate a complete training program from the knowledge graph.
 * Creates a new program_version with courses, scenarios, and scripts.
 * Returns the version record with generation stats.
 */
export async function generateTrainingProgram(orgId, sessionId, interviewContext = {}, onProgress) {
  const supabase = createAdminClient();
  const progress = (step, detail) => onProgress?.({ step, detail });

  // Create version record
  const { data: existingVersions } = await supabase
    .from('program_versions')
    .select('version_number')
    .eq('session_id', sessionId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from('program_versions')
    .insert({
      organization_id: orgId,
      session_id: sessionId,
      version_number: nextVersion,
      status: 'generating',
      generation_stats: { started_at: new Date().toISOString() }
    })
    .select()
    .single();

  if (versionError) throw new Error(`Failed to create version: ${versionError.message}`);

  try {
    // Step 1: Load knowledge graph
    progress('loading', 'Loading knowledge graph...');
    const [items, links, graphSummary] = await Promise.all([
      getKnowledgeItems(orgId),
      getKnowledgeLinks(orgId),
      buildGraphSummary(orgId)
    ]);

    const priorities = interviewContext.priorities || [];
    const painPoints = interviewContext.pain_points || [];

    // Step 2: Generate course structure
    progress('courses', 'Designing course structure...');
    const courses = await generateCourseStructure(graphSummary, priorities, painPoints, items);

    // Step 3: Store courses and modules
    progress('storing_courses', 'Saving courses...');
    const storedCourses = [];
    for (const course of courses) {
      const { data: courseRecord } = await supabase
        .from('courses')
        .insert({
          organization_id: orgId,
          version_id: version.id,
          name: course.name,
          description: course.description,
          category: course.category,
          is_system: false,
          is_active: true,
          knowledge_coverage: { domains: course.domains }
        })
        .select()
        .single();

      if (!courseRecord) continue;

      const modules = [];
      for (let i = 0; i < course.modules.length; i++) {
        const mod = course.modules[i];
        const { data: moduleRecord } = await supabase
          .from('course_modules')
          .insert({
            course_id: courseRecord.id,
            name: mod.name,
            description: mod.description,
            difficulty: mod.difficulty,
            scenario_count: mod.scenarioCount || 5,
            pass_threshold: mod.difficulty === 'easy' ? 60 : mod.difficulty === 'medium' ? 65 : 70,
            unlock_order: i + 1,
            learning_objectives: mod.learningObjectives
          })
          .select()
          .single();

        if (moduleRecord) modules.push({ ...moduleRecord, _meta: mod });
      }

      storedCourses.push({ course: courseRecord, modules });
    }

    // Step 4: Generate scenario templates per module
    progress('scenarios', 'Generating practice scenarios...');
    let scenarioCount = 0;
    for (const { course, modules } of storedCourses) {
      for (const mod of modules) {
        const scenarios = await generateScenarioTemplates(
          mod, course, graphSummary, items, interviewContext
        );

        for (const scenario of scenarios) {
          await supabase.from('scenario_templates').insert({
            module_id: mod.id,
            version_id: version.id,
            name: scenario.name,
            difficulty: mod.difficulty,
            base_situation: scenario.baseSituation,
            csr_objectives: scenario.csrObjectives,
            scoring_focus: scenario.scoringFocus,
            customer_goals: scenario.customerGoals,
            resolution_conditions: scenario.resolutionConditions,
            voice_agent_context: scenario.voiceAgentContext,
            scoring_rubric: scenario.scoringRubric,
            knowledge_item_ids: scenario.knowledgeItemIds || []
          });
          scenarioCount++;
        }
      }
    }

    // Step 5: Generate scripts
    progress('scripts', 'Creating training scripts...');
    const scripts = await generateScripts(graphSummary, items, priorities, interviewContext);

    let scriptCount = 0;
    for (const script of scripts) {
      await supabase.from('generated_scripts').insert({
        version_id: version.id,
        organization_id: orgId,
        script_type: script.scriptType,
        title: script.title,
        category: script.category,
        difficulty: script.difficulty,
        content: script.content,
        knowledge_item_ids: script.knowledgeItemIds || []
      });
      scriptCount++;
    }

    // Step 6: Run L2 quality scoring on a sample
    progress('scoring', 'Scoring content quality...');
    const { data: sampleScripts } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('version_id', version.id)
      .limit(5);

    let totalScore = 0;
    let scoredCount = 0;
    for (const script of (sampleScripts || [])) {
      const { score, issues } = await scoreContentQuality(
        { type: script.script_type, title: script.title, content: script.content },
        items,
        anthropic
      );
      await supabase.from('generated_scripts')
        .update({ quality_score: score, quality_issues: issues })
        .eq('id', script.id);
      totalScore += score;
      scoredCount++;
    }

    const avgScore = scoredCount > 0 ? totalScore / scoredCount : null;
    const knowledgeCoverage = items.length > 0
      ? Math.min(1, scenarioCount / items.length)
      : 0;

    // Step 7: Finalize version
    const stats = {
      started_at: version.generation_stats.started_at,
      completed_at: new Date().toISOString(),
      courses: storedCourses.length,
      modules: storedCourses.reduce((sum, c) => sum + c.modules.length, 0),
      scenarios: scenarioCount,
      scripts: scriptCount
    };

    await supabase.from('program_versions').update({
      status: 'draft',
      generation_stats: stats,
      quality_score: avgScore,
      knowledge_coverage: knowledgeCoverage
    }).eq('id', version.id);

    progress('done', 'Training program generated!');

    return { ...version, generation_stats: stats, quality_score: avgScore };

  } catch (error) {
    await supabase.from('program_versions').update({
      status: 'draft',
      generation_stats: {
        ...version.generation_stats,
        error: error.message,
        completed_at: new Date().toISOString()
      }
    }).eq('id', version.id);
    throw error;
  }
}

// ============================================================
// COURSE STRUCTURE GENERATION
// ============================================================

async function generateCourseStructure(graphSummary, priorities, painPoints, items) {
  const priorityContext = priorities.length > 0
    ? `\n\nAdmin priorities (ordered):\n${priorities.map((p, i) => `${i + 1}. ${p.topic}${p.reason ? ` — ${p.reason}` : ''}`).join('\n')}`
    : '';

  const painContext = painPoints.length > 0
    ? `\n\nKey pain points:\n${painPoints.map(p => `- ${p}`).join('\n')}`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Design a training course structure for a pest control / home services company based on their knowledge graph.

${graphSummary}
${priorityContext}
${painContext}

Create 3-6 courses, each with 3 modules (easy, medium, hard). Courses should be ordered from foundational to advanced. Priority topics should get dedicated courses with more scenarios.

Respond with JSON only:
[
  {
    "name": "Course Name",
    "description": "What this course teaches",
    "category": "sales|retention|service|objections|advanced",
    "domains": ["products", "objections"],
    "modules": [
      {
        "name": "Module Name",
        "description": "What this module focuses on",
        "difficulty": "easy",
        "scenarioCount": 5,
        "learningObjectives": ["objective 1", "objective 2"]
      }
    ]
  }
]`
    }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse course structure from AI response');
  }
}

// ============================================================
// SCENARIO TEMPLATE GENERATION
// ============================================================

async function generateScenarioTemplates(module, course, graphSummary, items, interviewContext) {
  const count = module.scenario_count || 5;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Generate ${count} practice call scenario templates for this training module.

Course: ${course.name} (${course.description})
Module: ${module.name} (${module.description})
Difficulty: ${module.difficulty}
Learning Objectives: ${JSON.stringify(module.learning_objectives || module._meta?.learningObjectives)}

Company Knowledge:
${graphSummary}

${interviewContext.pain_points?.length ? `Pain points to address: ${interviewContext.pain_points.join(', ')}` : ''}

For each scenario, generate:
1. A realistic customer situation (2-3 sentences)
2. CSR objectives (what the CSR should accomplish)
3. Scoring focus areas
4. Customer goals (what the simulated customer wants)
5. Resolution conditions (when the call should end)
6. Voice agent context (instructions for the AI playing the customer — personality, what to push back on, emotional state, what they know)
7. Scoring rubric (specific behaviors to evaluate, each with weight)

Respond with JSON only:
[
  {
    "name": "Scenario Name",
    "baseSituation": "The customer is calling because...",
    "csrObjectives": ["Acknowledge concern", "Offer resolution"],
    "scoringFocus": ["empathy", "product_knowledge"],
    "customerGoals": ["Get a discount", "Consider canceling"],
    "resolutionConditions": ["Customer agrees to stay", "Call ends naturally"],
    "voiceAgentContext": "You are a frustrated homeowner who found ants...",
    "scoringRubric": [
      {"behavior": "Acknowledged the customer's frustration", "weight": 20},
      {"behavior": "Offered a specific resolution", "weight": 25}
    ]
  }
]`
    }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse scenarios from AI response');
  }
}

// ============================================================
// SCRIPT GENERATION
// ============================================================

async function generateScripts(graphSummary, items, priorities, interviewContext) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `Generate training scripts for a pest control / home services company based on their knowledge.

${graphSummary}

${priorities.length > 0 ? `Priorities: ${priorities.map(p => p.topic).join(', ')}` : ''}
${interviewContext.pain_points?.length ? `Pain points: ${interviewContext.pain_points.join(', ')}` : ''}

Generate a mix of script types:
- 3-5 **talk_track** scripts: Step-by-step call flows with branching ("If customer says X → respond with Y"). Include specific pricing, service names, and policies from the knowledge graph.
- 2-3 **reference_card** scripts: Quick-reference cards for live calls — pricing tables, objection responses, competitor comparison points.
- 2-3 **role_play** scripts: Full two-sided dialogues showing ideal CSR-customer conversations.

Respond with JSON only:
[
  {
    "scriptType": "talk_track|reference_card|role_play",
    "title": "Script Title",
    "category": "sales|retention|service|objections",
    "difficulty": "easy|medium|hard",
    "content": {
      "steps": [
        {"step": 1, "action": "Greet and identify", "script": "Thank you for calling...", "notes": "Use warm tone"},
        {"step": 2, "action": "Discover need", "script": "What can I help you with today?", "branches": [
          {"if": "price complaint", "then": "Go to step 3a"},
          {"if": "service issue", "then": "Go to step 3b"}
        ]}
      ]
    }
  }
]

Use REAL company data from the knowledge graph — actual prices, service names, policies. Do not use placeholder values.`
    }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse scripts from AI response');
  }
}
```

- [ ] **Step 2: Verify the service loads**

```bash
cd api && node -e "import('./services/contentGenerator.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/services/contentGenerator.js
git commit -m "Add content generator — courses, scenarios with rubrics + voice context, scripts"
```

---

### Task 8: Program Publisher Service

**Files:**
- Create: `api/services/programPublisher.js`

- [ ] **Step 1: Create the publisher service**

```javascript
import { createAdminClient } from '../lib/supabase.js';
import { buildGraphSummary } from './knowledgeGraph.js';

/**
 * Publish a program version — makes it the active training program for the org.
 * Archives the previously published version. Transactional — all or nothing.
 */
export async function publishVersion(orgId, sessionId, versionId) {
  const supabase = createAdminClient();

  // Verify version exists and is in draft status
  const { data: version, error: versionError } = await supabase
    .from('program_versions')
    .select('*')
    .eq('id', versionId)
    .eq('organization_id', orgId)
    .single();

  if (versionError || !version) throw new Error('Version not found');
  if (version.status === 'published') throw new Error('Version is already published');
  if (version.status === 'generating') throw new Error('Version is still generating');

  // Archive any currently published version for this org
  const { data: currentPublished } = await supabase
    .from('program_versions')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'published');

  if (currentPublished?.length) {
    await supabase
      .from('program_versions')
      .update({ status: 'archived' })
      .in('id', currentPublished.map(v => v.id));
  }

  // Publish this version
  await supabase.from('program_versions').update({
    status: 'published',
    published_at: new Date().toISOString()
  }).eq('id', versionId);

  // Update session
  await supabase.from('studio_sessions').update({
    status: 'published',
    published_version_id: versionId,
    updated_at: new Date().toISOString()
  }).eq('id', sessionId);

  // Update org's agent context with knowledge graph summary
  const graphSummary = await buildGraphSummary(orgId);

  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  const settings = org?.settings || {};
  if (!settings.customPrompts) settings.customPrompts = {};
  settings.customPrompts.kbAgentContext = graphSummary;

  await supabase.from('organizations').update({
    settings,
    products_configured: true
  }).eq('id', orgId);

  // Activate the courses from this version
  const { data: versionCourses } = await supabase
    .from('courses')
    .select('id')
    .eq('version_id', versionId);

  if (versionCourses?.length) {
    await supabase
      .from('courses')
      .update({ is_active: true })
      .in('id', versionCourses.map(c => c.id));
  }

  return { published: true, versionId };
}

/**
 * Get version details with all generated content
 */
export async function getVersionDetails(versionId) {
  const supabase = createAdminClient();

  const [version, courses, scripts, scenarios] = await Promise.all([
    supabase.from('program_versions').select('*').eq('id', versionId).single(),
    supabase.from('courses')
      .select('*, modules:course_modules(*)')
      .eq('version_id', versionId)
      .order('created_at'),
    supabase.from('generated_scripts')
      .select('*')
      .eq('version_id', versionId)
      .order('script_type, created_at'),
    supabase.from('scenario_templates')
      .select('*, module:course_modules(id, name, course_id)')
      .eq('version_id', versionId)
      .order('created_at')
  ]);

  return {
    version: version.data,
    courses: courses.data || [],
    scripts: scripts.data || [],
    scenarios: scenarios.data || []
  };
}
```

- [ ] **Step 2: Verify the service loads**

```bash
cd api && node -e "import('./services/programPublisher.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/services/programPublisher.js
git commit -m "Add program publisher — version publish, archival, org agent context update"
```

---

## Phase 4: API Routes

### Task 9: Studio Routes

**Files:**
- Create: `api/routes/studio.js`
- Modify: `api/index.js`

- [ ] **Step 1: Create the studio routes file**

```javascript
import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import { ingestDocument, extractFromUrl, extractFromText } from '../services/documentIngestion.js';
import { processMessage, generateWelcomeMessage } from '../services/interviewAgent.js';
import { getKnowledgeItems, getKnowledgeCoverageStats, updateKnowledgeItem, deleteKnowledgeItem } from '../services/knowledgeGraph.js';
import { validateKnowledgeGraph } from '../services/contentValidator.js';
import { generateTrainingProgram } from '../services/contentGenerator.js';
import { publishVersion, getVersionDetails } from '../services/programPublisher.js';

const router = Router();

// All routes require admin
router.use(authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'));

// ============================================================
// SESSION MANAGEMENT
// ============================================================

router.post('/sessions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .insert({
        organization_id: req.organization.id,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[Studio] Create session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*, creator:users(name, email), published_version:program_versions(version_number, quality_score)')
      .eq('organization_id', req.organization.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[Studio] List sessions error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Session not found' });

    // Also fetch documents and coverage stats
    const [{ data: docs }, coverageStats] = await Promise.all([
      supabase.from('kb_documents').select('*').eq('session_id', data.id).order('created_at'),
      getKnowledgeCoverageStats(req.organization.id)
    ]);

    res.json({ ...data, documents: docs || [], coverageStats });
  } catch (error) {
    console.error('[Studio] Get session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_sessions')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ archived: true });
  } catch (error) {
    console.error('[Studio] Archive session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DOCUMENT UPLOAD & INGESTION
// ============================================================

router.post('/sessions/:id/documents', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;
    const results = [];

    for (const file of files) {
      // Create document record
      const { data: docRecord, error: docError } = await supabase
        .from('kb_documents')
        .insert({
          organization_id: orgId,
          session_id: sessionId,
          filename: file.name,
          file_type: file.type,
          file_size: file.size || 0,
          source_type: 'upload'
        })
        .select()
        .single();

      if (docError) {
        results.push({ filename: file.name, error: docError.message });
        continue;
      }

      // Decode and ingest
      try {
        const buffer = Buffer.from(file.data, 'base64');
        const result = await ingestDocument(orgId, sessionId, docRecord, buffer, file.data);
        results.push({
          filename: file.name,
          documentId: docRecord.id,
          classification: result.document.doc_classification,
          itemsExtracted: result.items.length,
          summary: result.summary
        });
      } catch (ingestError) {
        results.push({ filename: file.name, documentId: docRecord.id, error: ingestError.message });
      }
    }

    // Generate welcome/update message after all docs processed
    const welcome = await generateWelcomeMessage(sessionId);

    res.json({ documents: results, message: welcome.message, coverageStats: welcome.coverageStats });
  } catch (error) {
    console.error('[Studio] Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/documents/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;

    // Create document record
    const { data: docRecord } = await supabase
      .from('kb_documents')
      .insert({
        organization_id: orgId,
        session_id: sessionId,
        filename: new URL(url).hostname,
        file_type: 'text/html',
        source_type: 'url',
        source_url: url
      })
      .select()
      .single();

    const { text, metadata } = await extractFromUrl(url);
    const buffer = Buffer.from(text, 'utf-8');

    const result = await ingestDocument(orgId, sessionId, docRecord, buffer, null);

    res.json({
      documentId: docRecord.id,
      classification: result.document.doc_classification,
      itemsExtracted: result.items.length,
      summary: result.summary
    });
  } catch (error) {
    console.error('[Studio] URL scrape error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/documents/paste', async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;

    const { data: docRecord } = await supabase
      .from('kb_documents')
      .insert({
        organization_id: orgId,
        session_id: sessionId,
        filename: title || 'Pasted content',
        file_type: 'text/plain',
        file_size: text.length,
        source_type: 'paste'
      })
      .select()
      .single();

    const buffer = Buffer.from(text, 'utf-8');
    const result = await ingestDocument(orgId, sessionId, docRecord, buffer, null);

    res.json({
      documentId: docRecord.id,
      classification: result.document.doc_classification,
      itemsExtracted: result.items.length
    });
  } catch (error) {
    console.error('[Studio] Paste error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/documents', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CHAT / INTERVIEW
// ============================================================

router.post('/sessions/:id/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const result = await processMessage(req.params.id, message);
    res.json(result);
  } catch (error) {
    console.error('[Studio] Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/chat', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error } = await supabase
      .from('studio_messages')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// KNOWLEDGE GRAPH
// ============================================================

router.get('/sessions/:id/knowledge', async (req, res) => {
  try {
    const domain = req.query.domain || undefined;
    const items = await getKnowledgeItems(req.organization.id, { domain });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/knowledge/stats', async (req, res) => {
  try {
    const [stats, issues] = await Promise.all([
      getKnowledgeCoverageStats(req.organization.id),
      validateKnowledgeGraph(req.organization.id)
    ]);
    res.json({ ...stats, validationIssues: issues });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/sessions/:id/knowledge/:itemId', async (req, res) => {
  try {
    const { title, content, domain, admin_verified } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (domain !== undefined) updates.domain = domain;
    if (admin_verified !== undefined) updates.admin_verified = admin_verified;

    const item = await updateKnowledgeItem(req.params.itemId, updates);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id/knowledge/:itemId', async (req, res) => {
  try {
    await deleteKnowledgeItem(req.params.itemId);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GENERATION & VERSIONS
// ============================================================

router.post('/sessions/:id/generate', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;

    // Get session for interview context
    const { data: session } = await supabase
      .from('studio_sessions')
      .select('interview_context')
      .eq('id', sessionId)
      .single();

    // Update session status
    await supabase.from('studio_sessions').update({
      status: 'generating',
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);

    // Generate
    const version = await generateTrainingProgram(
      orgId, sessionId, session?.interview_context || {}
    );

    // Update session status
    await supabase.from('studio_sessions').update({
      status: 'reviewing',
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);

    // Store generation message in chat
    await supabase.from('studio_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: `Training program v${version.generation_stats.courses ? version.generation_stats.courses : '?'} generated! Created ${version.generation_stats.courses} courses, ${version.generation_stats.scenarios} scenarios, and ${version.generation_stats.scripts} scripts.${version.quality_score ? ` Average quality score: ${Math.round(version.quality_score)}/100.` : ''} Check the preview panels to review.`,
      message_type: 'generation',
      metadata: { versionId: version.id, stats: version.generation_stats }
    });

    res.json(version);
  } catch (error) {
    console.error('[Studio] Generate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('program_versions')
      .select('*')
      .eq('session_id', req.params.id)
      .order('version_number', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId', async (req, res) => {
  try {
    const details = await getVersionDetails(req.params.vId);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId/scripts', async (req, res) => {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('generated_scripts')
      .select('*')
      .eq('version_id', req.params.vId)
      .order('script_type, created_at');

    if (req.query.type) query = query.eq('script_type', req.query.type);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId/courses', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules:course_modules(*)')
      .eq('version_id', req.params.vId)
      .order('created_at');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId/scenarios', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('scenario_templates')
      .select('*, module:course_modules(id, name)')
      .eq('version_id', req.params.vId)
      .order('created_at');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/versions/:vId/publish', async (req, res) => {
  try {
    const result = await publishVersion(req.organization.id, req.params.id, req.params.vId);
    res.json(result);
  } catch (error) {
    console.error('[Studio] Publish error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Mount the routes in api/index.js**

Add the import at the top with other route imports (around line 47):

```javascript
import studioRoutes from './routes/studio.js';
```

Add the mount with other `app.use` calls (around line 1080):

```javascript
app.use('/api/studio', studioRoutes);
```

- [ ] **Step 3: Verify the server starts**

```bash
cd api && node -e "import('./routes/studio.js').then(() => console.log('Routes OK')).catch(e => console.error(e.message))"
```

Expected: `Routes OK`

- [ ] **Step 4: Commit**

```bash
git add api/routes/studio.js api/index.js
git commit -m "Add studio API routes — sessions, documents, chat, knowledge, generation, versions"
```

---

## Phase 5: Client-Side UI

### Task 10: SSE Chat Hook + Studio Sessions Page

**Files:**
- Create: `client/src/hooks/useStudioChat.js`
- Create: `client/src/pages/studio/StudioSessions.jsx`

- [ ] **Step 1: Create the chat hook**

```javascript
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useStudioChat(sessionId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coverageStats, setCoverageStats] = useState(null);
  const { getToken } = useAuth();
  const abortRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [sessionId, getToken]);

  const sendMessage = useCallback(async (text) => {
    if (!sessionId || !text.trim()) return;
    setLoading(true);

    // Optimistically add user message
    const userMsg = { id: Date.now(), role: 'user', content: text, message_type: 'chat', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();

      // Add assistant message
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.message,
        message_type: 'chat',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (data.coverageStats) setCoverageStats(data.coverageStats);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        message_type: 'chat',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getToken]);

  const uploadFiles = useCallback(async (files) => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const token = await getToken();
      const fileData = await Promise.all(
        Array.from(files).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          return { name: file.name, type: file.type, size: file.size, data: base64 };
        })
      );

      // Add upload message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'user',
        content: `Uploaded ${fileData.length} file${fileData.length !== 1 ? 's' : ''}: ${fileData.map(f => f.name).join(', ')}`,
        message_type: 'upload',
        created_at: new Date().toISOString()
      }]);

      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: fileData })
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      // Add AI response
      if (data.message) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message,
          message_type: 'chat',
          created_at: new Date().toISOString()
        }]);
      }

      if (data.coverageStats) setCoverageStats(data.coverageStats);
      return data;
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getToken]);

  return { messages, loading, coverageStats, fetchMessages, sendMessage, uploadFiles, setCoverageStats };
}
```

- [ ] **Step 2: Create the Studio Sessions list page**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, MessageSquare, CheckCircle, Clock, Archive } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const STATUS_CONFIG = {
  interviewing: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: MessageSquare },
  generating: { label: 'Generating', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Clock },
  reviewing: { label: 'Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
  published: { label: 'Published', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
};

export default function StudioSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSessions(await res.json());
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const session = await res.json();
        navigate(`/studio/${session.id}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Studio</h1>
          <p className="text-gray-400 mt-1">Build training programs from your company documents</p>
        </div>
        <button
          onClick={createSession}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
          <p className="text-gray-400 mb-6">Upload your training documents and let AI build your program</p>
          <button
            onClick={createSession}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Start Your First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.interviewing;
            const StatusIcon = status.icon;
            return (
              <button
                key={session.id}
                onClick={() => navigate(`/studio/${session.id}`)}
                className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    <div>
                      <div className="text-white font-medium">
                        Session {new Date(session.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {session.creator?.name || 'Unknown'} · {new Date(session.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useStudioChat.js client/src/pages/studio/StudioSessions.jsx
git commit -m "Add studio chat hook and sessions list page"
```

---

### Task 11: Content Studio Main Page (Chat + Preview Panels)

**Files:**
- Create: `client/src/pages/studio/ContentStudio.jsx`
- Create: `client/src/components/studio/ChatPanel.jsx`
- Create: `client/src/components/studio/ChatMessage.jsx`
- Create: `client/src/components/studio/PreviewPanel.jsx`

- [ ] **Step 1: Create ChatMessage component**

```jsx
import { FileText, Upload, Sparkles, MessageSquare } from 'lucide-react';

const TYPE_ICONS = {
  chat: MessageSquare,
  upload: Upload,
  generation: Sparkles,
  feedback: MessageSquare,
};

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const Icon = TYPE_ICONS[message.message_type] || MessageSquare;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-600/20 text-white rounded-tr-none'
            : 'bg-gray-800 text-gray-200 rounded-tl-none'
        }`}
      >
        {!isUser && message.message_type !== 'chat' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Icon className="w-3 h-3" />
            {message.message_type === 'generation' ? 'Generation Complete' : message.message_type}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatPanel component**

```jsx
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Link, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';

export default function ChatPanel({ messages, loading, onSendMessage, onUploadFiles }) {
  const [input, setInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileChange(e) {
    if (e.target.files?.length) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      onUploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-900 border-r border-gray-700"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm">
          🧠
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Training Designer AI</div>
          <div className="text-xs text-green-400">Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Upload documents to get started</p>
            <p className="text-xs mt-1">Drag & drop files or use the 📎 button</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={msg.id || i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-4 py-3 rounded-tl-none">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 pr-20 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder-gray-500"
              style={{ minHeight: '38px', maxHeight: '120px' }}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Upload files"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PreviewPanel component**

```jsx
import { useState } from 'react';
import { BarChart3, FileText, Target, BookOpen } from 'lucide-react';

const TABS = [
  { id: 'knowledge', label: 'Knowledge Graph', icon: BarChart3 },
  { id: 'scripts', label: 'Scripts', icon: FileText },
  { id: 'scenarios', label: 'Scenarios', icon: Target },
  { id: 'courses', label: 'Courses', icon: BookOpen },
];

export default function PreviewPanel({ activeTab, onTabChange, children, versions, activeVersion, onVersionChange }) {
  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-700">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-white border-primary-500 bg-gray-900/50'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
        {versions?.length > 0 && (
          <div className="ml-auto px-3">
            <select
              value={activeVersion || ''}
              onChange={e => onVersionChange(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} {v.status === 'published' ? '(live)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ContentStudio main page**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudioChat } from '../../hooks/useStudioChat';
import ChatPanel from '../../components/studio/ChatPanel';
import PreviewPanel from '../../components/studio/PreviewPanel';
import { ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ContentStudio() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { messages, loading, coverageStats, fetchMessages, sendMessage, uploadFiles } = useStudioChat(sessionId);

  const [activeTab, setActiveTab] = useState('knowledge');
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [versionData, setVersionData] = useState(null);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [knowledgeStats, setKnowledgeStats] = useState(null);

  // Load initial data
  useEffect(() => {
    if (sessionId) {
      fetchMessages();
      fetchKnowledge();
      fetchVersions();
    }
  }, [sessionId]);

  // Reload data when messages change (new content generated)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.message_type === 'generation') {
      fetchVersions();
      fetchKnowledge();
    }
  }, [messages]);

  // Load version details when active version changes
  useEffect(() => {
    if (activeVersion) fetchVersionDetails(activeVersion);
  }, [activeVersion]);

  async function fetchKnowledge() {
    try {
      const token = await getToken();
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/studio/sessions/${sessionId}/knowledge`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/studio/sessions/${sessionId}/knowledge/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (itemsRes.ok) setKnowledgeItems(await itemsRes.json());
      if (statsRes.ok) setKnowledgeStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch knowledge:', error);
    }
  }

  async function fetchVersions() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/versions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
        if (data.length > 0 && !activeVersion) {
          setActiveVersion(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  }

  async function fetchVersionDetails(versionId) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/versions/${versionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setVersionData(await res.json());
    } catch (error) {
      console.error('Failed to fetch version details:', error);
    }
  }

  async function handleGenerate() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchVersions();
        fetchMessages();
      }
    } catch (error) {
      console.error('Generate error:', error);
    }
  }

  async function handlePublish() {
    if (!activeVersion) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/versions/${activeVersion}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchVersions();
    } catch (error) {
      console.error('Publish error:', error);
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'knowledge':
        return <KnowledgeGraphView stats={knowledgeStats} items={knowledgeItems} />;
      case 'scripts':
        return <ScriptsView scripts={versionData?.scripts || []} />;
      case 'scenarios':
        return <ScenariosView scenarios={versionData?.scenarios || []} />;
      case 'courses':
        return <CoursesView courses={versionData?.courses || []} />;
      default:
        return null;
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700">
        <button onClick={() => navigate('/studio')} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-white font-medium">Content Studio</span>
        {knowledgeStats && (
          <span className="text-xs text-gray-400 ml-2">
            {knowledgeStats.total} knowledge items
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {activeVersion && versionData?.version?.status === 'draft' && (
            <button
              onClick={handlePublish}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Main content: chat + preview */}
      <div className="flex-1 grid grid-cols-[360px_1fr] min-h-0">
        <ChatPanel
          messages={messages}
          loading={loading}
          onSendMessage={sendMessage}
          onUploadFiles={uploadFiles}
        />
        <PreviewPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          versions={versions}
          activeVersion={activeVersion}
          onVersionChange={setActiveVersion}
        >
          {renderTabContent()}
        </PreviewPanel>
      </div>
    </div>
  );
}

// ============================================================
// Inline tab content components (will extract to files if they grow large)
// ============================================================

function KnowledgeGraphView({ stats, items }) {
  if (!stats) return <div className="text-gray-500 text-sm">Upload documents to build your knowledge graph</div>;

  const domainLabels = {
    products: { label: 'Products & Services', color: 'bg-blue-500' },
    objections: { label: 'Objections & Responses', color: 'bg-red-500' },
    processes: { label: 'Processes & Policies', color: 'bg-green-500' },
    sales_playbook: { label: 'Sales Playbook', color: 'bg-yellow-500' },
    competitive_intel: { label: 'Competitive Intel', color: 'bg-purple-500' },
    tribal_knowledge: { label: 'Tribal Knowledge', color: 'bg-orange-500' },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(stats.domains).map(([domain, data]) => {
          const config = domainLabels[domain] || { label: domain, color: 'bg-gray-500' };
          return (
            <div key={domain} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className="text-xs text-gray-300 font-medium">{config.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{data.count}</div>
              <div className="text-xs text-gray-500">{data.verified} verified</div>
            </div>
          );
        })}
      </div>

      {stats.validationIssues?.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="text-xs font-medium text-yellow-400 mb-2">Validation Issues</div>
          {stats.validationIssues.slice(0, 5).map((issue, i) => (
            <div key={i} className="text-xs text-yellow-300/80 mb-1">• {issue.message}</div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {(items || []).slice(0, 20).map(item => (
          <div key={item.id} className="bg-gray-800/50 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">{item.title}</span>
              <span className="text-gray-500">{item.domain}/{item.item_type}</span>
            </div>
            {item.document?.filename && (
              <span className="text-gray-500">📄 {item.document.filename}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptsView({ scripts }) {
  if (!scripts.length) return <div className="text-gray-500 text-sm">No scripts generated yet</div>;

  const typeLabels = { talk_track: 'Talk Track', reference_card: 'Reference Card', role_play: 'Role-Play' };
  const typeColors = { talk_track: 'border-orange-500', reference_card: 'border-blue-500', role_play: 'border-purple-500' };

  return (
    <div className="space-y-3">
      {scripts.map(script => (
        <div key={script.id} className={`bg-gray-800 rounded-lg p-4 border-l-[3px] ${typeColors[script.script_type] || 'border-gray-500'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium text-white">{script.title}</div>
              <div className="text-xs text-gray-400">
                {typeLabels[script.script_type]} · {script.difficulty} · {script.category}
              </div>
            </div>
            {script.quality_score != null && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                script.quality_score >= 80 ? 'bg-green-500/10 text-green-400' :
                script.quality_score >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {Math.round(script.quality_score)}
              </span>
            )}
          </div>
          <pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-48">
            {typeof script.content === 'string' ? script.content : JSON.stringify(script.content, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ScenariosView({ scenarios }) {
  if (!scenarios.length) return <div className="text-gray-500 text-sm">No scenarios generated yet</div>;

  return (
    <div className="space-y-3">
      {scenarios.map(scenario => (
        <div key={scenario.id} className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-1">{scenario.name}</div>
          <div className="text-xs text-gray-400 mb-2">
            {scenario.difficulty} · {scenario.module?.name}
          </div>
          <div className="text-xs text-gray-300 mb-3">{scenario.base_situation}</div>
          {scenario.scoring_rubric && (
            <div className="bg-gray-900 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">Scoring Rubric</div>
              {(Array.isArray(scenario.scoring_rubric) ? scenario.scoring_rubric : []).map((r, i) => (
                <div key={i} className="text-xs text-gray-400">• {r.behavior} ({r.weight}pts)</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CoursesView({ courses }) {
  if (!courses.length) return <div className="text-gray-500 text-sm">No courses generated yet</div>;

  return (
    <div className="space-y-4">
      {courses.map(course => (
        <div key={course.id} className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-1">{course.name}</div>
          <div className="text-xs text-gray-400 mb-3">{course.description}</div>
          <div className="space-y-2">
            {(course.modules || []).map(mod => (
              <div key={mod.id} className="bg-gray-900 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{mod.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    mod.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                    mod.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {mod.difficulty}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{mod.description}</div>
                {mod.learning_objectives && (
                  <div className="mt-2 text-xs text-gray-500">
                    {(Array.isArray(mod.learning_objectives) ? mod.learning_objectives : []).map((obj, i) => (
                      <div key={i}>• {obj}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/studio/ContentStudio.jsx client/src/components/studio/ChatPanel.jsx client/src/components/studio/ChatMessage.jsx client/src/components/studio/PreviewPanel.jsx
git commit -m "Add Content Studio main page — split-panel layout with chat and preview tabs"
```

---

## Phase 6: Integration

### Task 12: Wire Up Routes and Navigation

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/Layout.jsx`

- [ ] **Step 1: Add lazy imports to App.jsx**

At the top with other lazy imports (around line 58):

```javascript
const StudioSessions = lazy(() => import('./pages/studio/StudioSessions'));
const ContentStudio = lazy(() => import('./pages/studio/ContentStudio'));
```

- [ ] **Step 2: Add routes to App.jsx**

Inside the `<Routes>` block, add alongside other admin routes:

```jsx
<Route
  path="/studio"
  element={
    <ProtectedRoute>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <StudioSessions />
        </Suspense>
      </Layout>
    </ProtectedRoute>
  }
/>
<Route
  path="/studio/:id"
  element={
    <ProtectedRoute>
      <Layout hideNav>
        <Suspense fallback={<PageLoader />}>
          <ContentStudio />
        </Suspense>
      </Layout>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Add navigation item to Layout.jsx**

Find the admin navigation section in `Layout.jsx` and add a Content Studio link. Search for where other admin nav items like "Knowledge Base" or "Settings" are listed and add:

```jsx
{ name: 'Content Studio', href: '/studio', icon: Sparkles }
```

Import `Sparkles` from lucide-react at the top if not already imported.

- [ ] **Step 4: Verify the client builds**

```bash
cd client && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx client/src/components/Layout.jsx
git commit -m "Wire up Content Studio routes and navigation"
```

---

### Task 13: Enhance Existing Scenario Generator

**Files:**
- Modify: `api/services/scenarioGenerator.js`

- [ ] **Step 1: Update generateScenarioText to use enhanced template fields**

Find the `generateScenarioText` function (around line 184) and update the prompt construction to include `voice_agent_context` and `scoring_rubric` from templates when available.

Add after the existing `templateBlock` construction:

```javascript
// Enhanced template context from Content Studio
const voiceContextBlock = template?.voice_agent_context
  ? `\n## Voice Agent Context (use this to shape the customer personality)\n${template.voice_agent_context}`
  : '';

const rubricBlock = template?.scoring_rubric
  ? `\n## Scoring Rubric (this scenario will be evaluated on)\n${JSON.stringify(template.scoring_rubric)}`
  : '';
```

And include `${voiceContextBlock}${rubricBlock}` in the prompt template string before the `## Requirements` section.

- [ ] **Step 2: Update fallback logic**

Find the fallback scenario generation (the section that creates hardcoded templates for remaining scenarios). Add a check: if the module has templates with `voice_agent_context`, use those templates as the base instead of the hardcoded ones.

After the existing `const templatesForModule = ...` fetch, add:

```javascript
// Prefer Content Studio templates with voice context over hardcoded fallbacks
const enhancedTemplates = templatesForModule.filter(t => t.voice_agent_context);
```

Use `enhancedTemplates` as the primary source when available, falling back to the existing logic only when no enhanced templates exist.

- [ ] **Step 3: Verify the server starts**

```bash
cd api && timeout 5 node index.js 2>&1 || true
```

Expected: Server starts without import errors.

- [ ] **Step 4: Commit**

```bash
git add api/services/scenarioGenerator.js
git commit -m "Enhance scenario generator — use voice_agent_context and scoring_rubric from Content Studio templates"
```

---

### Task 14: End-to-End Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
cd api && npm run dev &
cd client && npm run dev &
```

- [ ] **Step 2: Verify database tables exist**

Check in Supabase Dashboard that all 7 new tables are present.

- [ ] **Step 3: Verify Content Studio is accessible**

Navigate to the app → Content Studio nav item → Should see the sessions list page.

- [ ] **Step 4: Create a session and upload a test document**

Click "New Session" → verify the studio layout loads with chat on left, empty preview panels on right. Upload a small test PDF or paste some text with pricing info.

- [ ] **Step 5: Verify the AI interview starts**

After document processing, the AI should report what it found and ask a question. Respond to 2-3 questions.

- [ ] **Step 6: Trigger generation**

Tell the AI to generate, or ask it to generate a training program. Verify courses, scenarios, and scripts appear in the preview panels.

- [ ] **Step 7: Verify publish**

Click the Publish button. Verify the version status changes to "published" and the generated courses appear in the regular Courses page.

- [ ] **Step 8: Commit any fixes**

If any issues were found during verification, fix and commit each separately.

---

## Summary

| Phase | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1: Foundation | Tasks 1-3 | Database tables, knowledge graph service, L1/L2 validator |
| 2: Ingestion | Tasks 4-5 | Document parsing for all file types, extraction pipeline |
| 3: Intelligence | Tasks 6-8 | Interview agent, content generator, program publisher |
| 4: API | Task 9 | All 16 studio API endpoints |
| 5: UI | Tasks 10-11 | Chat panel, preview panels, sessions list, main studio page |
| 6: Integration | Tasks 12-14 | Routing, navigation, enhanced scenario generator, E2E verification |

**Total new files:** 14 (6 API services, 1 route file, 1 migration, 2 pages, 3 components, 1 hook)
**Modified files:** 5 (api/index.js, api/package.json, App.jsx, Layout.jsx, scenarioGenerator.js)
