# Topic Threads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add focused conversation threads per training domain to the Content Studio, so admins can work on one topic at a time instead of one monolithic conversation.

**Architecture:** New `studio_topics` table tracks topics per session. `studio_messages` and `program_versions` gain a `topic_id` FK. The interview agent prompt gets topic-scoped instructions. The UI gets a topic selector bar between the top bar and chat. Session creation auto-creates 6 default topics.

**Tech Stack:** Express.js API, React frontend (Vite/Tailwind), Supabase PostgreSQL, Anthropic Claude API.

**Spec:** `docs/superpowers/specs/2026-04-10-topic-threads-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `api/migrations/topic_threads.sql` | New table + column additions |
| `client/src/components/studio/TopicBar.jsx` | Horizontal topic selector bar |

### Modified Files
| File | Change |
|------|--------|
| `api/routes/studio.js` | Add topic CRUD routes, modify session creation to auto-create topics, modify chat routes for topic_id |
| `api/services/interviewAgent.js` | Accept topicId param, inject topic-specific prompt, scope message queries by topic |
| `api/services/contentGenerator.js` | Accept topicId param, filter generation by topic relevance |
| `client/src/pages/studio/ContentStudio.jsx` | Add topic state, TopicBar, pass topicId to chat/preview |
| `client/src/hooks/useStudioChat.js` | Accept topicId, include in fetch/send/upload calls |
| `client/src/components/studio/ChatPanel.jsx` | Minor — receive topicId for display context |

---

## Task 1: Database Migration

**Files:**
- Create: `api/migrations/topic_threads.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Topic threads for Content Studio

CREATE TABLE IF NOT EXISTS studio_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  source TEXT NOT NULL DEFAULT 'default' CHECK (source IN ('default', 'ai_suggested', 'custom')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'interviewing', 'ready', 'generating', 'generated', 'published')),
  interview_context JSONB DEFAULT '{}',
  generated_version_id UUID,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_topics_session ON studio_topics(session_id);
CREATE INDEX idx_studio_topics_org ON studio_topics(organization_id);

-- Add topic_id to messages (nullable — null = session-level/general)
ALTER TABLE studio_messages
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES studio_topics(id) ON DELETE CASCADE;

-- Add topic_id to program versions (nullable — null = batch/full-program)
ALTER TABLE program_versions
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES studio_topics(id) ON DELETE SET NULL;

-- Add FK for generated_version_id (deferred)
ALTER TABLE studio_topics
  ADD CONSTRAINT fk_studio_topics_generated_version
  FOREIGN KEY (generated_version_id) REFERENCES program_versions(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Run the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with project_id `eeejffbynrowrykbhqfc`, name `topic_threads`, and the SQL above.

- [ ] **Step 3: Verify**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'studio_topics';
-- Expected: 1 row

SELECT column_name FROM information_schema.columns
WHERE table_name = 'studio_messages' AND column_name = 'topic_id';
-- Expected: 1 row
```

- [ ] **Step 4: Commit**

```bash
git add api/migrations/topic_threads.sql
git commit -m "Add topic threads migration — studio_topics table, topic_id on messages and versions"
```

---

## Task 2: Topic CRUD Routes + Auto-Create on Session Creation

**Files:**
- Modify: `api/routes/studio.js`

- [ ] **Step 1: Add the DEFAULT_TOPICS constant at the top of the file (after the imports)**

```javascript
const DEFAULT_TOPICS = [
  { name: 'Sales & Qualification', description: 'Discovery flow, qualification questions, closing techniques', icon: '💰', display_order: 1 },
  { name: 'Objection Handling', description: 'Price objections, competitor comparisons, rebuttals', icon: '🛡️', display_order: 2 },
  { name: 'Retention & Cancellation Saves', description: 'Save techniques, discount policies, re-service guarantees', icon: '🔄', display_order: 3 },
  { name: 'Customer Service & De-escalation', description: 'Complaint handling, empathy, escalation rules', icon: '🎧', display_order: 4 },
  { name: 'Product Knowledge', description: 'Service packages, pricing, warranties, service areas', icon: '📦', display_order: 5 },
  { name: 'Competitive Intel', description: 'Competitor positioning, differentiators, win-back strategies', icon: '⚔️', display_order: 6 },
];
```

- [ ] **Step 2: Modify the POST /sessions route to auto-create default topics after session creation**

After the session is created (`const { data, error } = await supabase.from('studio_sessions')...`), add:

```javascript
    // Auto-create default topics
    if (data) {
      await supabase.from('studio_topics').insert(
        DEFAULT_TOPICS.map(t => ({
          session_id: data.id,
          organization_id: req.organization.id,
          name: t.name,
          description: t.description,
          icon: t.icon,
          source: 'default',
          display_order: t.display_order
        }))
      );
    }
```

- [ ] **Step 3: Add topic CRUD routes (before the document routes section)**

```javascript
// ============================================================
// TOPIC MANAGEMENT
// ============================================================

router.get('/sessions/:id/topics', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_topics')
      .select('*')
      .eq('session_id', req.params.id)
      .order('display_order');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[Studio] List topics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/topics', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Topic name required' });

    const supabase = createAdminClient();

    // Get next display_order
    const { data: existing } = await supabase
      .from('studio_topics')
      .select('display_order')
      .eq('session_id', req.params.id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('studio_topics')
      .insert({
        session_id: req.params.id,
        organization_id: req.organization.id,
        name,
        description: description || '',
        icon: icon || '📝',
        source: 'custom',
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[Studio] Create topic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/sessions/:id/topics/:tid', async (req, res) => {
  try {
    const { name, description, icon, status, display_order } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;
    if (display_order !== undefined) updates.display_order = display_order;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_topics')
      .update(updates)
      .eq('id', req.params.tid)
      .eq('session_id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[Studio] Update topic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id/topics/:tid', async (req, res) => {
  try {
    const supabase = createAdminClient();
    // Only allow deleting custom topics
    const { data: topic } = await supabase
      .from('studio_topics')
      .select('source')
      .eq('id', req.params.tid)
      .single();

    if (topic?.source === 'default') {
      return res.status(400).json({ error: 'Cannot delete default topics' });
    }

    const { error } = await supabase
      .from('studio_topics')
      .delete()
      .eq('id', req.params.tid)
      .eq('session_id', req.params.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (error) {
    console.error('[Studio] Delete topic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/topics/:tid/generate', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const topicId = req.params.tid;
    const orgId = req.organization.id;

    // Get topic and its interview context
    const { data: topic } = await supabase
      .from('studio_topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    // Update topic status
    await supabase.from('studio_topics').update({ status: 'generating', updated_at: new Date().toISOString() }).eq('id', topicId);

    // Generate with topic context
    const version = await generateTrainingProgram(
      orgId, sessionId, topic.interview_context || {}, null, topicId, topic.name
    );

    // Link version to topic
    await supabase.from('studio_topics').update({
      status: 'generated',
      generated_version_id: version.id,
      updated_at: new Date().toISOString()
    }).eq('id', topicId);

    // Store generation message in topic thread
    await supabase.from('studio_messages').insert({
      session_id: sessionId,
      topic_id: topicId,
      role: 'assistant',
      content: `Training content for "${topic.name}" generated! Created ${version.generation_stats.courses} course, ${version.generation_stats.scenarios} scenarios, and ${version.generation_stats.scripts} scripts. Check the preview panels to review.`,
      message_type: 'generation',
      metadata: { versionId: version.id, stats: version.generation_stats }
    });

    res.json(version);
  } catch (error) {
    console.error('[Studio] Topic generate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 4: Modify the chat routes to support topic_id**

Update `POST /sessions/:id/chat`:
- Read `topic_id` from `req.body` alongside `message`
- Pass `topicId` to `processMessage(req.params.id, message, topicId)`

Update `GET /sessions/:id/chat`:
- Read `topic_id` from `req.query`
- Add `.eq('topic_id', topic_id)` filter when topic_id is provided
- When topic_id is `'general'` or not provided, filter for `.is('topic_id', null)`

- [ ] **Step 5: Add topics to GET /sessions/:id response**

In the `GET /sessions/:id` route handler, also fetch topics alongside documents and coverage stats:

```javascript
    const [{ data: docs }, { data: topics }, coverageStats] = await Promise.all([
      supabase.from('kb_documents').select('*').eq('session_id', data.id).order('created_at'),
      supabase.from('studio_topics').select('*').eq('session_id', data.id).order('display_order'),
      getKnowledgeCoverageStats(req.organization.id)
    ]);

    res.json({ ...data, documents: docs || [], topics: topics || [], coverageStats });
```

- [ ] **Step 6: Test locally with the test script**

```bash
cd api && node -e "
import dotenv from 'dotenv'; dotenv.config();
import { createAdminClient } from './lib/supabase.js';
const supabase = createAdminClient();

// Create a test session
const { data: session } = await supabase.from('studio_sessions').insert({
  organization_id: '4ef03747-d84f-4f6d-bd00-0030235af6cc',
  created_by: '00000000-0000-0000-0000-000000000000'
}).select().single();
console.log('Session:', session.id);

// Check topics were NOT auto-created (that's via the route, not DB trigger)
const { data: topics } = await supabase.from('studio_topics').select('*').eq('session_id', session.id);
console.log('Topics (should be 0 — auto-create is in route):', topics.length);

// Clean up
await supabase.from('studio_sessions').delete().eq('id', session.id);
console.log('Cleaned up');
"
```

- [ ] **Step 7: Commit**

```bash
git add api/routes/studio.js
git commit -m "Add topic CRUD routes, auto-create defaults on session creation"
```

---

## Task 3: Interview Agent Topic Scoping

**Files:**
- Modify: `api/services/interviewAgent.js`

- [ ] **Step 1: Add topic prompt templates**

Add after the existing `SYSTEM_PROMPT` constant:

```javascript
const TOPIC_PROMPTS = {
  'Sales & Qualification': 'Focus on: discovery flow, qualification questions, how to identify customer needs, presenting solutions, closing techniques, upselling/cross-selling triggers. Don\'t ask about retention, complaints, or competitor details — those have their own threads.',
  'Objection Handling': 'Focus on: common price objections, competitor comparison rebuttals, "I need to think about it" responses, timing objections, value framing techniques. Don\'t ask about general sales flow or complaint handling — those have their own threads.',
  'Retention & Cancellation Saves': 'Focus on: why customers cancel, save techniques that work, discount/credit policies CSRs can offer, re-service guarantees, the difference between a complaint and a true cancellation intent. Don\'t ask about new customer sales — that has its own thread.',
  'Customer Service & De-escalation': 'Focus on: complaint handling procedures, empathy techniques, de-escalation language, when to escalate to supervisor, service recovery after a bad experience. Don\'t ask about sales techniques or pricing — those have their own threads.',
  'Product Knowledge': 'Focus on: service packages and what\'s included, pricing tiers, warranties and guarantees, service frequency, add-on options, service area boundaries. Don\'t ask about sales techniques or competitor comparisons — those have their own threads.',
  'Competitive Intel': 'Focus on: which competitors operate in the same area, how your services compare, pricing differences, unique differentiators, what to say when a customer mentions a competitor, win-back strategies. Don\'t ask about internal processes — those have their own threads.',
};

function getTopicPromptSection(topicName) {
  const specific = TOPIC_PROMPTS[topicName];
  if (!specific) return `\n\nYou are currently interviewing about: ${topicName}\nKeep your questions focused on this topic.`;
  return `\n\nYou are currently interviewing about: ${topicName}\n${specific}\n\nWhen you have enough context for this topic specifically, offer to mark it as ready for generation.`;
}
```

- [ ] **Step 2: Modify processMessage to accept and use topicId**

Change the function signature:
```javascript
export async function processMessage(sessionId, userMessage, topicId = null) {
```

After fetching the session, if topicId is provided, fetch the topic and use its interview_context:

```javascript
  let interviewContext = session.interview_context || {};
  let topicName = null;

  if (topicId) {
    const { data: topic } = await supabase
      .from('studio_topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (topic) {
      interviewContext = topic.interview_context || {};
      topicName = topic.name;

      // Update topic status to interviewing if not_started
      if (topic.status === 'not_started') {
        await supabase.from('studio_topics')
          .update({ status: 'interviewing', updated_at: new Date().toISOString() })
          .eq('id', topicId);
      }
    }
  }
```

Modify the system prompt to include topic scoping:
```javascript
  const topicSection = topicName ? getTopicPromptSection(topicName) : '';
  // In the messages.create call:
  system: `${SYSTEM_PROMPT}${topicSection}\n\n${contextBlock}`,
```

Modify the message fetch to filter by topic:
```javascript
  let messageQuery = supabase
    .from('studio_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(30);

  if (topicId) {
    messageQuery = messageQuery.eq('topic_id', topicId);
  } else {
    messageQuery = messageQuery.is('topic_id', null);
  }

  const { data: recentMessages } = await messageQuery;
```

Modify the message insert to include topic_id:
```javascript
  await supabase.from('studio_messages').insert([
    { session_id: sessionId, topic_id: topicId, role: 'user', content: userMessage, message_type: 'chat' },
    { session_id: sessionId, topic_id: topicId, role: 'assistant', content: assistantMessage, message_type: 'chat' }
  ]);
```

Update the interview_context on the topic (not the session) when topicId is set:
```javascript
  if (contextChanged) {
    if (topicId) {
      await supabase.from('studio_topics').update({
        interview_context: updatedContext,
        updated_at: new Date().toISOString()
      }).eq('id', topicId);
    } else {
      await supabase.from('studio_sessions').update({
        interview_context: updatedContext,
        updated_at: new Date().toISOString()
      }).eq('id', sessionId);
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add api/services/interviewAgent.js
git commit -m "Add topic scoping to interview agent — per-topic prompts and message filtering"
```

---

## Task 4: Content Generator Topic Scoping

**Files:**
- Modify: `api/services/contentGenerator.js`

- [ ] **Step 1: Update generateTrainingProgram signature and version creation**

Change the function signature:
```javascript
export async function generateTrainingProgram(orgId, sessionId, interviewContext = {}, onProgress, topicId = null, topicName = null) {
```

When creating the program_versions record, include topic_id:
```javascript
  const { data: version, error: versionError } = await supabase
    .from('program_versions')
    .insert({
      organization_id: orgId,
      session_id: sessionId,
      topic_id: topicId,
      version_number: nextVersion,
      status: 'generating',
      generation_stats: { started_at: new Date().toISOString() }
    })
    .select()
    .single();
```

- [ ] **Step 2: Add topic context to generation prompts**

When topicName is provided, modify the course generation call to scope it:
- Instead of "Create 3-6 courses", say "Create 1 course focused on [topicName] with 3 modules (easy, medium, hard)"
- Add topicName to the scenario and script generation prompts as a focus constraint

In `generateCourseStructure`, add a `topicName` parameter and modify the prompt:
```javascript
async function generateCourseStructure(graphSummary, priorities, painPoints, items, topicName = null) {
  const scopeInstruction = topicName
    ? `Create exactly 1 course focused on "${topicName}" with 3 modules (easy, medium, hard). The course should thoroughly cover this topic using the relevant knowledge from the graph.`
    : `Create 3-6 courses, each with 3 modules (easy, medium, hard). Courses should be ordered from foundational to advanced.`;
```

Pass `topicName` through to `generateScenarioTemplates` and `generateScripts` so they also scope their output.

- [ ] **Step 3: Commit**

```bash
git add api/services/contentGenerator.js
git commit -m "Add topic scoping to content generator — single-topic and batch generation"
```

---

## Task 5: Topic Bar UI Component

**Files:**
- Create: `client/src/components/studio/TopicBar.jsx`

- [ ] **Step 1: Create the TopicBar component**

```jsx
import { Plus } from 'lucide-react';

const STATUS_INDICATORS = {
  not_started: '',
  interviewing: '●',
  ready: '✓',
  generating: '⚡',
  generated: '✅',
  published: '🚀',
};

const STATUS_COLORS = {
  not_started: 'text-gray-500',
  interviewing: 'text-blue-400',
  ready: 'text-yellow-400',
  generating: 'text-purple-400',
  generated: 'text-green-400',
  published: 'text-green-300',
};

export default function TopicBar({ topics, activeTopic, onSelectTopic, onAddTopic }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border-b border-gray-700 overflow-x-auto">
      {/* General thread */}
      <button
        onClick={() => onSelectTopic(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
          activeTopic === null
            ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30'
            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
        }`}
      >
        📊 General
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Topic threads */}
      {topics.map(topic => {
        const isActive = activeTopic === topic.id;
        const indicator = STATUS_INDICATORS[topic.status] || '';
        const indicatorColor = STATUS_COLORS[topic.status] || 'text-gray-500';

        return (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{topic.icon || '📝'}</span>
            <span>{topic.name}</span>
            {indicator && <span className={`text-[10px] ${indicatorColor}`}>{indicator}</span>}
          </button>
        );
      })}

      {/* Add topic button */}
      <button
        onClick={onAddTopic}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors whitespace-nowrap"
      >
        <Plus className="w-3 h-3" />
        Add Topic
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/studio/TopicBar.jsx
git commit -m "Add TopicBar component — topic selector with status indicators"
```

---

## Task 6: Wire Topics into ContentStudio Page and Chat Hook

**Files:**
- Modify: `client/src/pages/studio/ContentStudio.jsx`
- Modify: `client/src/hooks/useStudioChat.js`

- [ ] **Step 1: Update useStudioChat to accept and pass topicId**

Change the hook signature to accept topicId:
```javascript
export function useStudioChat(sessionId, topicId) {
```

Update `fetchMessages` to include topic_id query param:
```javascript
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = await getToken();
      const topicParam = topicId ? `?topic_id=${topicId}` : '?topic_id=general';
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/chat${topicParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
```

Update `sendMessage` to include topic_id in the POST body:
```javascript
      body: JSON.stringify({ message: text, topic_id: topicId || null })
```

Update `uploadFiles` — uploads are always session-level (no topic_id), keep as-is.

Add `topicId` to the dependency arrays of `fetchMessages` and `sendMessage` useCallback hooks.

- [ ] **Step 2: Update ContentStudio to manage topic state**

Add imports:
```javascript
import TopicBar from '../../components/studio/TopicBar';
```

Add state:
```javascript
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null); // null = General
```

Update the useStudioChat call to pass activeTopic:
```javascript
  const { messages, setMessages, loading, coverageStats, fetchMessages, sendMessage, uploadFiles } = useStudioChat(sessionId, activeTopic);
```

Add topic fetching:
```javascript
  async function fetchTopics() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTopics(await res.json());
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  }
```

Add fetchTopics to the initial load effect:
```javascript
  useEffect(() => {
    if (sessionId) {
      fetchMessages();
      fetchTopics();
      fetchKnowledge();
      fetchVersions();
    }
  }, [sessionId]);
```

Re-fetch messages when activeTopic changes:
```javascript
  useEffect(() => {
    fetchMessages();
  }, [activeTopic]);
```

Add handleAddTopic:
```javascript
  async function handleAddTopic() {
    const name = prompt('Topic name:');
    if (!name) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/studio/sessions/${sessionId}/topics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      fetchTopics();
    } catch (error) {
      console.error('Failed to add topic:', error);
    }
  }
```

Add handleTopicGenerate:
```javascript
  async function handleTopicGenerate(topicId) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/topics/${topicId}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTopics();
        fetchVersions();
        fetchMessages();
      }
    } catch (error) {
      console.error('Topic generate error:', error);
    }
  }
```

- [ ] **Step 3: Add TopicBar to the layout**

Insert TopicBar between the top bar and the chat/preview area:

```jsx
      {/* Topic selector */}
      <TopicBar
        topics={topics}
        activeTopic={activeTopic}
        onSelectTopic={setActiveTopic}
        onAddTopic={handleAddTopic}
      />

      {/* Main content: chat on top, preview below */}
```

- [ ] **Step 4: Update the nudge message to be topic-aware**

In the effect that shows the nudge when knowledge exists:
```javascript
  useEffect(() => {
    if (messages.length === 0 && knowledgeStats?.total > 0 && !loading) {
      const nudge = activeTopic
        ? {
            id: 'system-nudge',
            role: 'assistant',
            content: `Let's work on this topic. I can see the knowledge graph has ${knowledgeStats.total} items. Type a message to start the interview for this topic, or say "generate" if you're ready.`,
            message_type: 'chat',
            created_at: new Date().toISOString()
          }
        : {
            id: 'system-nudge',
            role: 'assistant',
            content: `I have ${knowledgeStats.total} knowledge items from your uploads. Select a topic above to start a focused interview, or upload more documents here.`,
            message_type: 'chat',
            created_at: new Date().toISOString()
          };
      setMessages([nudge]);
    }
  }, [knowledgeStats, messages.length, loading, activeTopic]);
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/studio/ContentStudio.jsx client/src/hooks/useStudioChat.js
git commit -m "Wire topics into ContentStudio — topic state, TopicBar, topic-scoped chat"
```

---

## Task 7: End-to-End Test

**Files:**
- Modify: `api/scripts/test-studio.js`

- [ ] **Step 1: Add topic thread tests to the existing test script**

Add tests that:
1. Create a session via the DB
2. Verify 6 default topics are NOT created (that's the route's job)
3. Insert topics manually
4. Call processMessage with a topicId
5. Verify the message was stored with the correct topic_id
6. Verify messages for a different topic don't cross-contaminate
7. Call generateTrainingProgram with a topicId and topicName
8. Verify the version has topic_id set
9. Clean up

- [ ] **Step 2: Run the test and fix any issues**

```bash
cd api && node scripts/test-studio.js
```

Fix any column name mismatches, missing parameters, or logic errors found during testing. Re-run until all steps pass.

- [ ] **Step 3: Commit all fixes**

```bash
git add -A
git commit -m "Topic threads E2E test — verify scoped messages, topic generation"
```

---

## Task 8: Push and Verify in Production

- [ ] **Step 1: Push all changes**

```bash
git push origin master
```

- [ ] **Step 2: Run the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` to create the studio_topics table and add topic_id columns.

- [ ] **Step 3: Verify in production**

Navigate to Content Studio, create a new session, verify:
- 6 default topic cards appear in the topic bar
- Clicking a topic loads that thread (empty initially)
- Typing in a topic thread gets a topic-scoped AI response
- Switching topics loads different message histories
- General thread shows upload-related messages

---

## Summary

| Task | Files | What It Delivers |
|------|-------|-----------------|
| 1: Migration | 1 new SQL file | studio_topics table, topic_id columns |
| 2: Topic routes | studio.js modified | CRUD endpoints, auto-create on session, per-topic generate |
| 3: Agent scoping | interviewAgent.js modified | Topic-specific prompts, scoped message queries |
| 4: Generator scoping | contentGenerator.js modified | Single-topic generation |
| 5: TopicBar UI | 1 new component | Topic selector with status indicators |
| 6: Wire up | ContentStudio.jsx + useStudioChat.js modified | Full topic flow in UI |
| 7: E2E test | test-studio.js modified | Verify everything works |
| 8: Deploy | Push + migration | Live in production |
