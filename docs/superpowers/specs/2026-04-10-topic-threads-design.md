# Topic Threads — Design Specification

> Adds focused conversation threads per training domain to the Content Studio. Admins work on one topic at a time (Sales, Retention, etc.) with independent interview context and generation, instead of one monolithic conversation.

## Problem

The current Content Studio is a single conversation that tries to cover all training topics at once. This is overwhelming — admins don't want to answer 20 questions spanning sales, retention, service, and competitive intel in one sitting. They want to work on retention today, sales tomorrow, and come back to fill in gaps later.

## Solution: Topic Threads

Each studio session gets multiple topic threads. Each thread has its own chat history, interview context, and generation status. Topics share the org-level knowledge graph but scope their generated output (courses, scenarios, scripts) to the topic domain.

---

## Default Topics

Six default topics created with every new session:
1. **Sales & Qualification** — discovery flow, qualification questions, closing techniques
2. **Objection Handling** — price objections, competitor comparisons, rebuttals
3. **Retention & Cancellation Saves** — save techniques, discount policies, re-service guarantees
4. **Customer Service & De-escalation** — complaint handling, empathy, escalation rules
5. **Product Knowledge** — service packages, pricing, warranties, service areas
6. **Competitive Intel** — competitor positioning, differentiators, win-back strategies

## AI-Suggested Topics

After document upload, the AI analyzes the knowledge graph and suggests additional topics based on content clusters. Examples: "Termite Services" (if heavy termite content), "Commercial Accounts" (if commercial procedures found), "Seasonal Pest Protocols" (if seasonal content detected).

Admins can also create custom topics manually.

---

## Data Model

### New Table: `studio_topics`

```
studio_topics
  id UUID PRIMARY KEY
  session_id UUID NOT NULL FK → studio_sessions
  organization_id UUID NOT NULL FK → organizations
  name TEXT NOT NULL
  description TEXT
  icon TEXT (emoji or lucide icon name)
  source TEXT NOT NULL CHECK (default | ai_suggested | custom)
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (not_started | interviewing | ready | generating | generated | published)
  interview_context JSONB DEFAULT '{}'
  generated_version_id UUID FK → program_versions (nullable)
  display_order INTEGER NOT NULL DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

Indexes: session_id, organization_id.

### Modified Tables

**studio_messages** — add column:
- `topic_id UUID FK → studio_topics (nullable)`
- Messages with null topic_id are session-level (uploads, general conversation)
- Messages with a topic_id belong to that topic's thread

**program_versions** — add column:
- `topic_id UUID FK → studio_topics (nullable)`
- Versions can be topic-scoped (single topic generation) or session-wide (batch generation)

---

## Topic Status Flow

```
not_started → interviewing → ready → generating → generated → published
                ↑                                      |
                └──────── (feedback loop) ─────────────┘
```

- **not_started** — topic exists but admin hasn't started working on it
- **interviewing** — admin is actively chatting in this thread
- **ready** — admin marked it ready for generation (or AI suggested it's ready)
- **generating** — generation in progress
- **generated** — content created, awaiting review
- **published** — content published to live training

Admin can move back from `generated` to `interviewing` to give feedback and regenerate.

---

## Interview Agent Changes

When a topic is active, the system prompt gets topic-specific instructions injected:

```
You are currently interviewing about: RETENTION & CANCELLATION SAVES

Focus your questions on:
- Why customers cancel at this company
- What save techniques work best
- Discount/credit policies CSRs can offer
- Re-service guarantees and processes
- Common cancellation objections and rebuttals

You can see the full knowledge graph for context, but keep your questions focused on this topic. Don't ask about sales techniques or competitive intel — those have their own threads.

When you have enough context for this topic specifically, offer to mark it as ready for generation.
```

The AI sees the full knowledge graph summary (for cross-referencing) but scopes its questions and generation to the active topic.

---

## Generation Changes

### Per-Topic Generation
When generating for a single topic:
- Filter knowledge items by relevance to the topic
- Generate 1 course with 3 modules (easy/medium/hard)
- Generate scenario templates scoped to the topic's skill domain
- Generate scripts relevant to the topic
- Create a topic-scoped `program_version` with `topic_id` set
- Quality score the generated content

### Batch Generation
When generating all ready topics:
- Generate per-topic content for each ready topic
- Optionally create combined courses (admin choice)
- Create a session-wide `program_version` with `topic_id` null

### Combined Courses
After individual topics are generated, admin can combine topics into multi-topic courses. A "CSR Fundamentals" course could pull modules from Sales, Service, and Product Knowledge topics.

---

## UI Changes

### Topic Selector Bar
Horizontal bar between the top bar and chat panel. Shows topic cards in a scrollable row:

```
[📊 General] [💰 Sales ●] [🛡️ Objections] [🔄 Retention ✓] [🎧 Service] [📦 Products] [⚔️ Competitive]
```

- Each card shows: icon, name, status indicator
- Status indicators: ● = interviewing, ✓ = ready, ⚡ = generating, ✅ = generated
- "General" thread always exists — for uploads and cross-cutting conversation
- Click to switch threads
- "+ Add Topic" button at the end

### Chat Panel
- Loads messages filtered by the active topic_id
- When on "General", shows session-level messages (topic_id = null)
- Chat input sends messages tagged with the active topic_id

### Preview Panels
- When a topic is selected, filter displayed content by that topic's generated version
- When "General" is selected, show the full knowledge graph and all generated content
- Scripts/Scenarios/Courses tabs show topic-scoped content

### Generate Controls
- Per-topic: "Generate" button appears on a topic card when status = ready
- Batch: "Generate All Ready" button in the top bar when 2+ topics are ready
- "Combine into Course" option appears after multiple topics have generated content

---

## API Changes

### New Endpoints

```
GET    /api/studio/sessions/:id/topics          — list topics for session
POST   /api/studio/sessions/:id/topics          — create custom topic
PATCH  /api/studio/sessions/:id/topics/:tid     — update topic (name, status, order)
DELETE /api/studio/sessions/:id/topics/:tid      — delete custom topic
POST   /api/studio/sessions/:id/topics/:tid/generate  — generate for single topic
POST   /api/studio/sessions/:id/generate-batch   — generate all ready topics
```

### Modified Endpoints

```
POST /api/studio/sessions/:id/chat      — add topic_id to request body
GET  /api/studio/sessions/:id/chat      — add ?topic_id= filter param
POST /api/studio/sessions              — auto-create default topics on session creation
```

---

## Topic Suggestion Logic

After document ingestion, analyze knowledge items for topic suggestions:

1. Check which default topics have strong coverage (5+ items) — these get status badges
2. Look for content clusters outside the 6 defaults — group by item_type or content keywords
3. If a cluster has 3+ items and doesn't map cleanly to a default topic, suggest it as a new topic
4. Present suggestions in the General thread: "Based on your documents, I'd suggest adding these topics: [Termite Services] [Commercial Accounts]. Want me to add them?"

---

## What Stays the Same

- Knowledge graph is org-level (no changes)
- Document upload flow (no changes)
- Supabase Storage upload (no changes)
- Existing studio_sessions, kb_documents, kb_knowledge_items tables (no changes)
- The interview agent's core behavior — just gets topic scoping added to the prompt

## Out of Scope

- Drag-and-drop topic reordering (use display_order field, implement later)
- Real-time collaboration (multiple admins on different topics simultaneously)
- Topic templates per industry (future — could pre-fill topics based on industry)
