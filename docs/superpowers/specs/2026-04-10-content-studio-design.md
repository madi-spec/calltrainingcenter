# Content Studio — Design Specification

> AI-powered training content generation from company documents. Upload docs → AI interviews admin → generates scripts, scenarios, and courses → admin reviews and publishes.

## Problem

Companies upload training documents (sales playbooks, pricing sheets, handbooks, SOPs, call transcripts) and expect the system to create a complete, customized training program. The current implementation is buggy and underdelivers:

- **Fragile parsing** — regex-based JSON extraction silently fails to empty arrays
- **Shallow generation** — only package name + price make it into scenario prompts; 8 of 10 scenarios are hardcoded fallbacks
- **Destructive regeneration** — deletes all existing org data before regenerating; failure midway = data loss
- **No intelligence** — system parses docs blindly without understanding what matters to the company
- **Limited file support** — only PDF, DOCX, TXT; 5MB max; 3 file limit
- **No versioning** — no way to compare, rollback, or incrementally improve

## Solution: Content Studio

A conversational AI interface where admins upload documents, the AI interviews them to build deep understanding, and then generates a complete training program — scripts, scenarios, and courses — that the admin reviews, gives feedback on, and publishes.

### Architecture: Three Layers

**Ingestion Layer** — accepts any document format, normalizes to text + metadata, extracts atomic knowledge items into a structured knowledge graph.

**Intelligence Layer** — AI interview agent that builds company context through conversation, generates content from the knowledge graph, and processes feedback to iterate.

**Output Layer** — three content types (scripts, scenarios, courses), versioned as program snapshots. Admin compares versions and publishes one.

---

## Knowledge Graph

Inspired by the voice agent knowledge graph architecture. Every piece of extracted knowledge is an atomic node, tagged by domain, linked to its source document, and cross-referenced to related nodes.

### Six Domains

| Domain | Contains | Examples |
|--------|----------|----------|
| **Products & Services** | Packages, pricing, tiers, add-ons, warranties, service frequency | "Quarterly Pest Plan: $199/quarter, includes interior + exterior" |
| **Objections & Responses** | Price objections, competitor comparisons, cancellation saves, rebuttals | "Too expensive → Value frame: breaks down to $2.21/day" |
| **Processes & Policies** | Call procedures, escalation rules, scheduling, refunds, service area | "24-hour callback guarantee for active customers" |
| **Sales Playbook** | Qualification questions, discovery flow, closing techniques, cross-sell triggers | "Qualify: property type → service area → pest ID → package rec" |
| **Competitive Intel** | Competitor names, pricing, differentiators, win-back strategies | "vs Terminix: we include free re-service, they charge $75" |
| **Tribal Knowledge** | Best rep techniques, common personas, seasonal patterns, FAQ answers | "70% of cancellations are about a specific incident, not dissatisfaction" |

### Cross-References (Graph Edges)

Knowledge items link to related items via `kb_knowledge_links`:
- Package → its objections, selling points, qualification questions
- Objection → its rebuttal script, the package it targets
- Process → the scenarios that test it
- Competitor → the differentiators against them
- Technique → the source transcript it came from

### Autonomous Validation Loops

Modeled on the voice agent loop hierarchy — ordered by risk, deterministic first.

**L1: Knowledge Graph Validation** (auto, after every upload/answer)
- No contradictions (two prices for same package)
- Completeness (package with no selling points)
- Cross-reference integrity (scenario references non-existent package)
- Format consistency (pricing formats, phone formats)
- Output: validation flags → feed interview questions

**L2: Content Quality Scoring** (auto, after generation)
- Learning objectives coverage per module
- Difficulty progression (easy → medium → hard actually escalates)
- Knowledge utilization (% of graph used by training program)
- Scenario realism (situations match real call patterns)
- Script accuracy (correct pricing, policies, terminology)
- Output: quality score 0-100 per item + specific issues

**L3: Generation Verification** (gated, after publish)
- Scenario claims match knowledge graph facts (no hallucinated prices)
- Scripts don't contradict company policies
- Course structure has no orphaned modules
- Voice agent prompt context aligns with published knowledge
- Output: flagged issues → admin resolves before go-live

**L4: Training Effectiveness** (future)
- Which scenarios have highest failure rates → flag knowledge gaps
- Which objections CSRs fail to handle → generate targeted drills
- Score trends by knowledge domain → suggest curriculum adjustments

**L5: Cross-Org Pattern Discovery** (future)
- Which course structures produce fastest skill improvement across 300+ clients
- Which objection-handling approaches have highest success rates

---

## Content Studio UI

Split-panel layout: chat on left, preview panels on right.

### Left Panel: Chat

The conversational interface where admins interact with the Training Designer AI. Supports:
- Text messages (interview Q&A, feedback)
- File uploads via drag-drop or paperclip button (triggers ingestion pipeline)
- URL input via link button (triggers scraping + ingestion)
- Pasted text (AI distinguishes chat from content)

### Right Panel: Tabbed Preview

Four tabs showing generated content:
- **Knowledge Graph** — domain coverage stats, item counts, validation status
- **Scripts** — generated talk tracks, reference cards, role-play dialogues with quality scores and source traceability
- **Scenarios** — scenario templates with customer profiles, scoring rubrics, voice agent context
- **Courses** — course structure with modules, learning objectives, associated scenarios and scripts

Version selector in tab header allows switching between v1, v2, v3 for comparison.

### Key UI Behaviors

- **Upload anywhere in chat** — no separate upload page
- **Live panel updates** — panels refresh as AI generates content
- **Plain English feedback** — "make the cancellation script more aggressive" adjusts specific content
- **Quality scores visible** — every item shows L2 score; low scores show specific issues
- **Source traceability** — every generated item links back to source documents and knowledge nodes
- **Version comparison** — diff view between versions highlights changes

---

## Ingestion Pipeline

### Input Adapters

Every input type normalizes to a `kb_document` record with extracted text + metadata. One extraction pipeline, many input adapters.

| Format | Library | Notes |
|--------|---------|-------|
| **PDF** | `pdf-parse` (existing) + Claude Vision fallback | Text-based extraction; falls back to Vision API for scanned/image PDFs |
| **DOCX** | `mammoth` (existing) | Text with heading structure preserved |
| **XLSX / CSV** | `xlsx` (SheetJS) — new | Auto-detects pricing sheets by column headers; converts to markdown tables |
| **PPTX** | `pptx-parser` — new | Extracts slide text + speaker notes |
| **URL** | `cheerio` (existing) | Single page or crawl mode (max 20 pages within same domain) |
| **Images** | Claude Vision API | OCR for photos of whiteboards, printed materials, competitor flyers |
| **Plain text** | None | Direct input in chat |
| **Transcripts** | None | Accepts pre-transcribed text (SRT, VTT, TXT); no raw audio |

Max file size: 25MB (up from 5MB). No file count limit per session.

### 5-Step Extraction Pipeline

1. **Classify document** — Haiku call, ~0.5s. Input: first 2000 chars + filename. Output: classification (pricing, playbook, handbook, sop, transcript, competitive, other) + summary.

2. **Chunk & extract** — Intelligent chunking (respects section boundaries). Each chunk processed by Sonnet with a classification-specific extraction prompt. A pricing sheet gets a pricing extraction prompt; a playbook gets a sales technique extraction prompt. Schema-validated structured output via tool_use (replaces fragile regex JSON matching).

3. **Schema validation** — Every extracted item validated against type-specific schemas. Failed validation triggers retry with error context (up to 2 retries). No silent failures to empty arrays.

4. **Deduplicate & link** — Sonnet scans all extracted items for duplicates, conflicts, and cross-references. Creates `kb_knowledge_links` records. Flags conflicts for interview.

5. **L1 validation** — Deterministic checks: completeness, format consistency, cross-reference integrity. Validation issues become interview questions.

### Incremental Upload

When admin uploads a new document to an existing session:
1. New doc goes through the same 5-step pipeline
2. L1 validation runs on the full graph — detects new, updated, and conflicting knowledge
3. AI reports changes in chat
4. Admin can regenerate to create a new program version incorporating new knowledge

### Error Handling

No silent failures. Every problem surfaces in the chat:
- File parse fails → "I couldn't read pages 3-5, want me to try OCR?"
- Low confidence extraction → "I found $299/quarter for Premium Pest — is that right?"
- Schema validation fails → retry with error, then flag what was missed
- Unsupported file → "I can't process .pages files — could you export as PDF?"

---

## Interview Agent

Single Claude conversation thread with accumulated context. The AI interviews the admin to build understanding that documents alone can't provide.

### Four Phases

**Phase 1: Acknowledge & Resolve** — triggered after document ingestion. AI reports what it found, resolves L1 validation conflicts. Evidence-driven questions: "Your pricing sheet says $199 but playbook says $179 — which is current?"

**Phase 2: Deepen Understanding** — triggered after Phase 1. Questions docs never answer, driven by knowledge graph gap analysis. "What's the #1 reason customers cancel?" "What do new hires get wrong first?" "Is there a competitor you lose the most to?"

**Phase 3: Prioritize & Focus** — triggered after sufficient understanding. AI summarizes knowledge, proposes priority order. Admin adjusts. Priorities directly shape generation weighting.

**Phase 4: Propose & Generate** — triggered after priorities confirmed. AI previews what it'll generate (X courses, Y scenarios, Z scripts), waits for "go," then generates with results streaming into preview panels.

### Pacing Guardrails (Not Hard Limits)

No fixed question count. Instead, smart pacing:
- **Off-ramps after each phase** — "I could generate now, or dig deeper into [thin areas]. Your call."
- **Progress transparency** — "Strong coverage on products and pricing. Lighter on: competitive intel and retention. Want to keep going?"
- **Admin controls the pace** — can say "that's enough, generate" at any point
- **Diminishing returns signal** — if answers confirm what docs already said, AI flags it

### Context Accumulation

Every answer updates `studio_sessions.interview_context` (JSONB):
```json
{
  "company_context": "...",
  "pain_points": ["cancellation freezing", ...],
  "priorities": [{"topic": "...", "weight": 1, "reason": "..."}],
  "resolved_conflicts": [{"field": "...", "resolution": "..."}],
  "tribal_knowledge": ["70% of cancels are incident-based", ...],
  "admin_preferences": ["aggressive retention", ...]
}
```

This context is injected into every generation call.

### Post-Generation Feedback

Same chat handles feedback after generation. Admin reviews content in right panels, gives feedback naturally:
- "The cancellation script is too soft — our culture is more direct"
- "Add a scenario where the customer is comparing us to ABC Pest"
- "The pricing in scenario 3 is wrong — Premium is $349 not $299"

Each feedback updates the graph, adjusts content, creates a new version.

### Under the Hood

The interview agent is a Claude conversation with:
- **System prompt**: role definition (training designer for pest control / home services), phase instructions, question generation rules, output format
- **Injected context per turn**: knowledge graph summary, L1 flags, interview_context, current phase
- **Tool calls**: `update_knowledge_item`, `resolve_conflict`, `set_priority`, `trigger_generation`, `update_content`

---

## Generation Pipeline

Generation is knowledge-graph-driven. The AI reads structured, validated, cross-referenced knowledge nodes — not raw documents.

### Three Content Generators

**Script Generator** — produces three script types:
- **Talk tracks**: step-by-step call flows with branching ("if customer says X → respond with Y"). Built from sales playbook + process + objection nodes.
- **Reference cards**: quick-glance for live calls — pricing, objection responses, competitor comparisons. Built from product + objection + competitive intel nodes.
- **Role-play dialogues**: full two-sided conversations showing ideal handling. Built from tribal knowledge + process + best-rep technique nodes.

**Scenario Generator** — every scenario gets:
- Full knowledge graph context (products with selling points, objections with rebuttals, competitor data, processes)
- Custom voice agent prompt for Retell AI (personality, what they know, what they'll push back on)
- Scoring rubric tied to specific learning objectives
- All scenarios fully AI-generated — no hardcoded fallbacks

**Course Generator** — custom-built from knowledge coverage analysis:
- Courses organized by skill domain, weighted by admin priorities
- Each module defines learning objectives mapped to graph nodes
- Scenarios assigned to modules based on learning objective alignment
- Smart sequencing: foundational skills before advanced

### Generation Sequence

1. **Analyze knowledge graph coverage** — map nodes by domain, identify clusters, factor in admin priorities
2. **Generate course structure** — courses and modules first (the skeleton everything else hangs on)
3. **Generate scenario templates** — per module, testing specific learning objectives, with voice agent context and scoring rubrics
4. **Generate scripts** — last, so they can reference course structure and scenarios
5. **Run L2 quality scoring** — score every item, flag low-confidence, check graph coverage gaps

---

## Data Model

### New Tables

**`studio_sessions`** — central entity. One per Content Studio conversation.
- id, organization_id, created_by
- status (interviewing → generating → reviewing → published)
- interview_context (JSONB — accumulated AI context)
- admin_priorities (JSONB)
- published_version_id (FK → program_versions)
- created_at, updated_at

**`studio_messages`** — chat history.
- id, session_id (FK)
- role (user | assistant | system)
- content (TEXT)
- message_type (chat | upload | generation | feedback)
- metadata (JSONB — attached files, generation stats)
- created_at

**`kb_documents`** — individual uploaded files. Replaces JSONB blob.
- id, organization_id, session_id
- filename, file_type, file_size
- source_type (upload | url | paste | transcript)
- source_url (nullable)
- raw_text (TEXT)
- doc_classification (pricing | playbook | handbook | sop | transcript | competitive | other)
- parse_status (pending → parsed → failed)
- created_at

**`kb_knowledge_items`** — atomic knowledge nodes.
- id, organization_id
- document_id (FK → kb_documents)
- domain (products | objections | processes | sales_playbook | competitive_intel | tribal_knowledge)
- item_type (service_package | pricing_tier | selling_point | objection_response | call_procedure | escalation_rule | qualification_question | closing_technique | competitor_comparison | faq | ...)
- title (TEXT)
- content (JSONB — structured data, shape varies by type)
- confidence (FLOAT 0-1)
- admin_verified (BOOLEAN)
- created_at, updated_at

**`kb_knowledge_links`** — graph edges.
- id
- source_item_id (FK → kb_knowledge_items)
- target_item_id (FK → kb_knowledge_items)
- link_type (has_objection | has_selling_point | competes_with | requires_process | tested_by_scenario | ...)
- created_at

**`program_versions`** — versioned generation snapshots.
- id, organization_id, session_id
- version_number (INTEGER)
- status (generating → draft → published → archived)
- generation_stats (JSONB)
- quality_score (FLOAT — L2 aggregate)
- knowledge_coverage (FLOAT — % of graph used)
- created_at, published_at

**`generated_scripts`** — new content type.
- id, version_id, organization_id
- script_type (talk_track | reference_card | role_play)
- title, category, difficulty
- content (JSONB — steps, dialogue, etc.)
- knowledge_item_ids (UUID[] — source nodes)
- quality_score (FLOAT)
- quality_issues (JSONB[])
- created_at

### Modified Tables

**`scenario_templates`** — new columns:
- version_id (FK → program_versions)
- knowledge_item_ids (UUID[] — graph nodes tested)
- voice_agent_context (TEXT — Retell prompt)
- scoring_rubric (JSONB — custom rubric)
- quality_score (FLOAT)

**`courses`** — new columns:
- version_id (FK → program_versions)
- knowledge_coverage (JSONB — which domains covered)

**`course_modules`** — new columns:
- learning_objectives (JSONB — mapped to graph nodes)
- associated_script_ids (UUID[])

### Deprecated Tables (Keep, Stop Writing To)

- **`kb_uploads`** — replaced by `kb_documents` + `studio_sessions`
- **`service_packages`** (KB-generated) — product knowledge moves to `kb_knowledge_items`
- **`sales_guidelines`** (KB-generated) — moves to `kb_knowledge_items`

Deprecated tables stay in database. Existing data remains accessible. Clean cutover per org when they publish their first program version.

### Knowledge Graph Scoping

The knowledge graph is **org-level**, not session-level. `kb_knowledge_items` belong to the organization, not a specific studio session. Documents belong to sessions (via `session_id`), but the knowledge extracted from them belongs to the org. This means:
- Session 2 can see and use knowledge created in session 1
- Incremental uploads in a new session add to the same org-level graph
- The graph is the org's accumulated knowledge asset, growing over time
- Publishing a version snapshots the graph state at that point

### Migration Strategy

New tables sit alongside existing ones. No big-bang migration. The Content Studio writes to new tables that feed into the existing training flow via the publish step. Old and new coexist until cutover.

---

## API Architecture

### New Routes: `/api/studio/*`

All routes require `authMiddleware`, `tenantMiddleware`, `requireRole('admin', 'super_admin')`.

**Session Management**
- `POST /api/studio/sessions` — create new studio session
- `GET /api/studio/sessions` — list org's sessions
- `GET /api/studio/sessions/:id` — get session with latest state
- `DELETE /api/studio/sessions/:id` — archive (soft delete)

**Document Upload & Ingestion**
- `POST /api/studio/sessions/:id/documents` — upload files (multipart)
- `POST /api/studio/sessions/:id/documents/url` — scrape URL
- `POST /api/studio/sessions/:id/documents/paste` — paste text
- `GET /api/studio/sessions/:id/documents` — list documents with parse status
- `GET /api/studio/sessions/:id/documents/:docId` — document detail + extracted items

**Chat / Interview**
- `POST /api/studio/sessions/:id/chat` — send message → stream AI response (SSE)
- `GET /api/studio/sessions/:id/chat` — get chat history (paginated)

**Knowledge Graph**
- `GET /api/studio/sessions/:id/knowledge` — full graph (filterable by domain)
- `GET /api/studio/sessions/:id/knowledge/stats` — coverage stats
- `PATCH /api/studio/sessions/:id/knowledge/:itemId` — edit knowledge item
- `DELETE /api/studio/sessions/:id/knowledge/:itemId` — remove knowledge item

**Generation & Versions**
- `POST /api/studio/sessions/:id/generate` — trigger generation (SSE progress)
- `GET /api/studio/sessions/:id/versions` — list versions
- `GET /api/studio/sessions/:id/versions/:vId` — version detail
- `GET /api/studio/sessions/:id/versions/:vId/scripts` — scripts (filterable)
- `GET /api/studio/sessions/:id/versions/:vId/courses` — courses + modules
- `GET /api/studio/sessions/:id/versions/:vId/scenarios` — scenario templates
- `POST /api/studio/sessions/:id/versions/:vId/publish` — publish version

### New Services: `api/services/`

| Service | Replaces | Responsibility |
|---------|----------|---------------|
| `documentIngestion.js` | `kbParser.js` | Input adapters, classification, chunking, extraction, schema validation |
| `interviewAgent.js` | New | System prompt, message handling, tool calls, context accumulation, SSE |
| `contentGenerator.js` | `scenarioGenerator.js` (for KB) | Graph → courses → scenarios → scripts generation pipeline |
| `contentValidator.js` | New | L1/L2/L3 autonomous validation loops |
| `programPublisher.js` | KB generation in `knowledgeBase.js` | Transactional publish, archival, rollback |
| `knowledgeGraph.js` | New | CRUD, graph queries, coverage stats, prompt injection summaries |

### Client-Side

**New Pages**
- `pages/studio/ContentStudio.jsx` — main split-panel layout
- `pages/studio/StudioSessions.jsx` — list/manage sessions

**New Components** (in `components/studio/`)
- `ChatPanel.jsx` — chat interface with file upload, URL input
- `ChatMessage.jsx` — message bubble with embedded content (file reports, generation previews)
- `PreviewPanel.jsx` — tabbed preview container
- `KnowledgeGraphTab.jsx` — graph visualization + domain coverage stats
- `ScriptsTab.jsx` — script cards with quality scores and source traceability
- `ScenariosTab.jsx` — scenario templates with rubrics and voice agent context
- `CoursesTab.jsx` — course structure with modules and learning objectives
- `VersionSelector.jsx` — version comparison + diff view + publish button

### Integration With Existing System

**Publish → existing tables**: `programPublisher.js` writes courses/modules to `courses`/`course_modules`, scenario templates to `scenario_templates`. Existing training flow works unchanged.

**Enhanced scenario generation**: `scenarioGenerator.js` updated to read `voice_agent_context` and `scoring_rubric` from enhanced scenario_templates. Richer prompts, no hardcoded fallbacks. Backward compatible.

**Richer coaching analysis**: `asyncAnalysis.js` can reference knowledge graph for ground-truth feedback ("You quoted $199 but correct price is $249 for Premium").

---

## New Dependencies

| Package | Purpose | Used By |
|---------|---------|---------|
| `xlsx` (SheetJS) | XLSX/CSV parsing | documentIngestion.js |
| `pptx-parser` or similar | PPTX text extraction | documentIngestion.js |

All other capabilities use existing dependencies (pdf-parse, mammoth, cheerio, @anthropic-ai/sdk).

---

## Industry Focus

Optimized for pest control, lawn care, and home services. The interview agent has built-in knowledge of the industry — common service types, seasonal patterns, typical objection categories, standard call flows. Not designed to be industry-agnostic.

---

## Out of Scope

- Raw audio/video processing (accept pre-transcribed text only)
- Real-time collaboration (single admin per session)
- L4/L5 autonomous loops (future — requires training outcome data)
- Script rendering during live calls (future — scripts are review/training content for now)
