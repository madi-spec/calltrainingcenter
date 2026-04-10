import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Dynamic imports so dotenv is loaded before modules read process.env
const { createAdminClient } = await import('../lib/supabase.js');
const { processMessage } = await import('../services/interviewAgent.js');

const supabase = createAdminClient();

let testSessionId = null;
let testTopicIds = [];
let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

async function cleanup() {
  if (!testSessionId) return;
  console.log('\nCleaning up...');
  await supabase.from('studio_messages').delete().eq('session_id', testSessionId);
  await supabase.from('studio_topics').delete().eq('session_id', testSessionId);
  const { error } = await supabase.from('studio_sessions').delete().eq('id', testSessionId);
  if (error) console.log('  Cleanup error:', error.message);
  else console.log('  Cleaned up test session', testSessionId);
}

async function run() {
  try {
    // ================================================================
    // Step 1: Verify imports loaded
    // ================================================================
    console.log('\n[1] Verify imports');
    assert(typeof createAdminClient === 'function', 'createAdminClient imported');
    assert(typeof processMessage === 'function', 'processMessage imported');

    const cg = await import('../services/contentGenerator.js');
    assert(typeof cg.generateTrainingProgram === 'function', 'generateTrainingProgram imported');
    assert(cg.generateTrainingProgram.length >= 2, `generateTrainingProgram accepts ${cg.generateTrainingProgram.length} params (expect >=2)`);

    // ================================================================
    // Step 2: Look up existing org + user, create test data
    // ================================================================
    console.log('\n[2] Create test data');

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();
    if (orgErr) throw new Error('Could not find an organization: ' + orgErr.message);
    console.log(`  Using org: ${org.name} (${org.id})`);

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('organization_id', org.id)
      .limit(1)
      .single();
    if (userErr) throw new Error('Could not find a user: ' + userErr.message);
    console.log(`  Using user: ${user.email} (${user.id})`);

    // Create studio session
    const { data: session, error: sessErr } = await supabase
      .from('studio_sessions')
      .insert({ organization_id: org.id, created_by: user.id })
      .select()
      .single();
    if (sessErr) throw new Error('Failed to create studio_session: ' + JSON.stringify(sessErr));
    testSessionId = session.id;
    console.log(`  Created session: ${testSessionId}`);

    // Insert 6 default topics
    const DEFAULT_TOPICS = [
      { name: 'Sales & Qualification', description: 'Discovery flow, qualification questions, closing techniques', icon: '💰', display_order: 1 },
      { name: 'Objection Handling', description: 'Price objections, competitor comparisons, rebuttals', icon: '🛡️', display_order: 2 },
      { name: 'Retention & Cancellation Saves', description: 'Save techniques, discount policies, re-service guarantees', icon: '🔄', display_order: 3 },
      { name: 'Customer Service & De-escalation', description: 'Complaint handling, empathy, escalation rules', icon: '🎧', display_order: 4 },
      { name: 'Product Knowledge', description: 'Service packages, pricing, warranties, service areas', icon: '📦', display_order: 5 },
      { name: 'Competitive Intel', description: 'Competitor positioning, differentiators, win-back strategies', icon: '⚔️', display_order: 6 },
    ];

    const { data: topics, error: topicErr } = await supabase
      .from('studio_topics')
      .insert(DEFAULT_TOPICS.map(t => ({
        session_id: testSessionId,
        organization_id: org.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        source: 'default',
        display_order: t.display_order,
      })))
      .select();

    if (topicErr) throw new Error('Failed to insert topics: ' + JSON.stringify(topicErr));
    testTopicIds = topics.map(t => t.id);
    assert(topics.length === 6, `Inserted ${topics.length} topics (expect 6)`);

    // ================================================================
    // Step 3: Test topic queries
    // ================================================================
    console.log('\n[3] Test topic queries');

    const { data: fetched, error: fetchErr } = await supabase
      .from('studio_topics')
      .select('*')
      .eq('session_id', testSessionId)
      .order('display_order');

    if (fetchErr) throw new Error('Fetch topics failed: ' + JSON.stringify(fetchErr));
    assert(fetched.length === 6, `Fetched ${fetched.length} topics (expect 6)`);

    const requiredCols = ['id', 'session_id', 'organization_id', 'name', 'status', 'source'];
    for (const col of requiredCols) {
      const allHave = fetched.every(t => t[col] !== undefined);
      assert(allHave, `All topics have column '${col}'`, allHave ? '' : `Missing in: ${fetched.filter(t => t[col] === undefined).map(t => t.name).join(', ')}`);
    }

    const allNotStarted = fetched.every(t => t.status === 'not_started');
    assert(allNotStarted, `All topics status='not_started'`, allNotStarted ? '' : fetched.map(t => `${t.name}: ${t.status}`).join(', '));

    const allDefault = fetched.every(t => t.source === 'default');
    assert(allDefault, `All topics source='default'`);

    // ================================================================
    // Step 4: Test scoped messages via processMessage
    // ================================================================
    console.log('\n[4] Test scoped messages (calls Claude API -- may take ~10s)');

    const targetTopicId = testTopicIds[0]; // Sales & Qualification
    const otherTopicId = testTopicIds[1];  // Objection Handling

    const result = await processMessage(testSessionId, 'Tell me about retention', targetTopicId);
    assert(!!result.message, 'processMessage returned a message');
    assert(typeof result.message === 'string' && result.message.length > 10, `Response length: ${result.message.length} chars`);

    // Verify messages stored with correct topic_id
    const { data: topicMsgs, error: tmErr } = await supabase
      .from('studio_messages')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('topic_id', targetTopicId);

    if (tmErr) throw new Error('Fetch scoped messages failed: ' + JSON.stringify(tmErr));
    assert(topicMsgs.length === 2, `Messages for target topic: ${topicMsgs.length} (expect 2 -- user + assistant)`);

    const hasUser = topicMsgs.some(m => m.role === 'user' && m.content === 'Tell me about retention');
    assert(hasUser, 'User message stored with correct topic_id and content');

    const hasAssistant = topicMsgs.some(m => m.role === 'assistant');
    assert(hasAssistant, 'Assistant message stored with correct topic_id');

    // Verify OTHER topic has no messages
    const { data: otherMsgs } = await supabase
      .from('studio_messages')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('topic_id', otherTopicId);

    assert(otherMsgs.length === 0, `Messages for other topic: ${otherMsgs.length} (expect 0)`);

    // Verify general messages (topic_id = null) also empty
    const { data: generalMsgs } = await supabase
      .from('studio_messages')
      .select('*')
      .eq('session_id', testSessionId)
      .is('topic_id', null);

    assert(generalMsgs.length === 0, `General messages (topic_id=null): ${generalMsgs.length} (expect 0)`);

    // ================================================================
    // Step 5: Test topic status update
    // ================================================================
    console.log('\n[5] Test topic status update');

    const { data: updatedTopic, error: utErr } = await supabase
      .from('studio_topics')
      .select('status')
      .eq('id', targetTopicId)
      .single();

    if (utErr) throw new Error('Fetch updated topic failed: ' + JSON.stringify(utErr));
    assert(
      updatedTopic.status === 'interviewing',
      `Topic status after message: '${updatedTopic.status}' (expect 'interviewing')`
    );

    // ================================================================
    // Done
    // ================================================================
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

  } catch (err) {
    console.error('\nFatal error:', err.message);
    console.error(err.stack);
    failed++;
  } finally {
    await cleanup();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
