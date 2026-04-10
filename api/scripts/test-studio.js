import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Test org — pick a real one from the DB
let TEST_ORG_ID;
let TEST_USER_ID;
let SESSION_ID;

const TEST_DOCUMENT_TEXT = `
# GreenShield Pest Control - Pricing & Services Guide 2024

## Service Packages

### Essential Pest Protection - $149/quarter
- Interior & exterior perimeter treatment
- Common pests: ants, spiders, roaches, silverfish
- Free re-treatments between services
- 30-day money-back guarantee

### Premium Pest Protection - $199/quarter
- Everything in Essential, PLUS:
- Mosquito & tick yard treatment
- Rodent monitoring stations (4)
- Termite visual inspection (annual)
- Priority scheduling

### Ultimate Home Shield - $299/quarter
- Everything in Premium, PLUS:
- Termite baiting system
- Bed bug inspection (annual)
- Wildlife exclusion assessment
- Dedicated account manager
- Same-day emergency service

## Common Objections & Responses

### "That's too expensive"
Response: "I understand price is a concern. Let me show you what you're actually getting — our Essential plan breaks down to about $1.63/day for year-round protection. Most customers who try DIY end up spending more on store products that don't solve the root problem."

### "I already have another pest company"
Response: "That's great that you're already taking pest control seriously! Many of our current customers switched from other providers. May I ask what prompted you to look into other options? Often we can address whatever gap you're experiencing."

### "I want to think about it"
Response: "Of course, take the time you need. Just so you know, we're running our seasonal promotion through Friday — 20% off the first treatment. I can hold that rate for you for 48 hours if you'd like."

## Call Procedures

### New Customer Inquiry
1. Greet warmly: "Thank you for calling GreenShield Pest Control, this is [name], how can I help you today?"
2. Identify the pest concern
3. Ask about property type (house, apartment, commercial)
4. Confirm service area (we cover a 50-mile radius from our office)
5. Present relevant package options
6. Schedule initial inspection (free for Premium and Ultimate)

### Cancellation Call
1. Express understanding: "I'm sorry to hear that. Can you share what's prompting the cancellation?"
2. Listen fully — do NOT interrupt
3. Address the specific concern
4. Offer retention options: free re-treatment, temporary pause, downgrade
5. If proceeding: process cancellation, offer 10% comeback discount for 90 days
`;

async function step(name, fn) {
  process.stdout.write(`\n${'='.repeat(60)}\n[TEST] ${name}\n${'='.repeat(60)}\n`);
  try {
    const result = await fn();
    console.log('[PASS]', name);
    return result;
  } catch (err) {
    console.error('[FAIL]', name);
    console.error(err.stack || err.message || err);
    return null;
  }
}

// ============================================================
// STEP 0: Find a real org and user to test with
// ============================================================
await step('Find test org and user', async () => {
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1);

  if (error) throw new Error(`Orgs query failed: ${error.message}`);
  if (!orgs?.length) throw new Error('No organizations in DB');

  TEST_ORG_ID = orgs[0].id;
  console.log('  Using org:', orgs[0].name, '(', TEST_ORG_ID, ')');

  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('organization_id', TEST_ORG_ID)
    .limit(1);

  if (userErr) throw new Error(`Users query failed: ${userErr.message}`);
  if (!users?.length) throw new Error('No users in this org');

  TEST_USER_ID = users[0].id;
  console.log('  Using user:', users[0].email, '(', TEST_USER_ID, ')');
});

if (!TEST_ORG_ID || !TEST_USER_ID) {
  console.error('\nCannot proceed without org and user. Exiting.');
  process.exit(1);
}

// ============================================================
// STEP 1: Import all services
// ============================================================
let documentIngestion, knowledgeGraph, contentValidator, interviewAgent, contentGenerator, programPublisher;

await step('Import all services', async () => {
  documentIngestion = await import('../services/documentIngestion.js');
  console.log('  documentIngestion exports:', Object.keys(documentIngestion));

  knowledgeGraph = await import('../services/knowledgeGraph.js');
  console.log('  knowledgeGraph exports:', Object.keys(knowledgeGraph));

  contentValidator = await import('../services/contentValidator.js');
  console.log('  contentValidator exports:', Object.keys(contentValidator));

  interviewAgent = await import('../services/interviewAgent.js');
  console.log('  interviewAgent exports:', Object.keys(interviewAgent));

  contentGenerator = await import('../services/contentGenerator.js');
  console.log('  contentGenerator exports:', Object.keys(contentGenerator));

  programPublisher = await import('../services/programPublisher.js');
  console.log('  programPublisher exports:', Object.keys(programPublisher));
});

// ============================================================
// STEP 2: Create a studio session
// ============================================================
await step('Create studio session', async () => {
  const { data, error } = await supabase
    .from('studio_sessions')
    .insert({
      organization_id: TEST_ORG_ID,
      created_by: TEST_USER_ID
    })
    .select()
    .single();

  if (error) throw new Error(`Insert failed: ${error.message}`);
  SESSION_ID = data.id;
  console.log('  Session ID:', SESSION_ID);
  console.log('  Status:', data.status);
});

if (!SESSION_ID) {
  console.error('\nCannot proceed without session. Exiting.');
  process.exit(1);
}

// ============================================================
// STEP 3: Create a kb_documents record and run ingestion
// ============================================================
let docRecord;
let ingestionResult;

await step('Create doc record + run ingestDocument', async () => {
  const { data, error } = await supabase
    .from('kb_documents')
    .insert({
      organization_id: TEST_ORG_ID,
      session_id: SESSION_ID,
      filename: 'greenshield-pricing-2024.txt',
      file_type: 'text/plain',
      file_size: TEST_DOCUMENT_TEXT.length,
      source_type: 'upload'
    })
    .select()
    .single();

  if (error) throw new Error(`Doc insert failed: ${error.message}`);
  docRecord = data;
  console.log('  Doc ID:', docRecord.id);

  const buffer = Buffer.from(TEST_DOCUMENT_TEXT, 'utf-8');
  console.log('  Running ingestDocument...');
  ingestionResult = await documentIngestion.ingestDocument(
    TEST_ORG_ID, SESSION_ID, docRecord, buffer, null
  );
  console.log('  Classification:', ingestionResult.document.doc_classification);
  console.log('  Items extracted:', ingestionResult.items.length);
  console.log('  Summary:', ingestionResult.summary);
  if (ingestionResult.items.length > 0) {
    console.log('  Sample items:');
    for (const item of ingestionResult.items.slice(0, 3)) {
      console.log(`    - [${item.domain}/${item.item_type}] ${item.title}`);
    }
  }
});

// ============================================================
// STEP 4: Check knowledge items via knowledgeGraph service
// ============================================================
await step('Get knowledge items', async () => {
  const items = await knowledgeGraph.getKnowledgeItems(TEST_ORG_ID);
  console.log('  Total items in org:', items.length);
  for (const item of items.slice(0, 5)) {
    console.log(`    - [${item.domain}/${item.item_type}] ${item.title} (conf: ${item.confidence})`);
  }
});

// ============================================================
// STEP 5: Coverage stats
// ============================================================
await step('Get knowledge coverage stats', async () => {
  const stats = await knowledgeGraph.getKnowledgeCoverageStats(TEST_ORG_ID);
  console.log('  Total:', stats.total);
  console.log('  Verified:', stats.verified);
  console.log('  By domain:');
  for (const [domain, info] of Object.entries(stats.byDomain)) {
    console.log(`    ${domain}: ${info.count} items, ${info.verified} verified, avg confidence ${info.avgConfidence}`);
  }
});

// ============================================================
// STEP 6: Validate knowledge graph
// ============================================================
await step('Validate knowledge graph', async () => {
  const issues = await contentValidator.validateKnowledgeGraph(TEST_ORG_ID);
  console.log('  Issues found:', issues.length);
  for (const issue of issues) {
    console.log(`    [${issue.severity}] ${issue.type}: ${issue.message}`);
  }
});

// ============================================================
// STEP 7: Chat (processMessage)
// ============================================================
await step('Process chat message', async () => {
  const result = await interviewAgent.processMessage(
    SESSION_ID,
    'We mostly struggle with cancellation calls. Our new hires give up too easily when customers say they want to cancel.'
  );
  console.log('  AI response (first 200 chars):', result.message.substring(0, 200));
  console.log('  Coverage stats total:', result.coverageStats.total);
  console.log('  Validation issues:', result.validationIssues);
});

// ============================================================
// STEP 8: Generate training program
// ============================================================
let generatedVersion;

await step('Generate training program', async () => {
  console.log('  This will take a while (multiple Claude calls)...');
  generatedVersion = await contentGenerator.generateTrainingProgram(
    TEST_ORG_ID,
    SESSION_ID,
    { pain_points: ['Cancellation calls', 'New hires giving up too easily'] },
    (progress) => console.log(`  [Progress] ${progress.step}: ${progress.detail}`)
  );
  console.log('  Version ID:', generatedVersion.id);
  console.log('  Stats:', JSON.stringify(generatedVersion.generation_stats, null, 2));
  console.log('  Quality score:', generatedVersion.quality_score);
});

// ============================================================
// STEP 9: Get version details
// ============================================================
if (generatedVersion) {
  await step('Get version details', async () => {
    const details = await programPublisher.getVersionDetails(generatedVersion.id);
    console.log('  Courses:', details.courses.length);
    console.log('  Scripts:', details.scripts.length);
    console.log('  Scenarios:', details.scenarios.length);
    for (const c of details.courses) {
      console.log(`    Course: ${c.name} (${c.course_modules?.length || 0} modules)`);
    }
  });
}

// ============================================================
// CLEANUP
// ============================================================
await step('Cleanup test data', async () => {
  // Delete knowledge items for this session's documents
  const { data: docs } = await supabase
    .from('kb_documents')
    .select('id')
    .eq('session_id', SESSION_ID);

  for (const doc of (docs || [])) {
    await supabase.from('kb_knowledge_items').delete().eq('document_id', doc.id);
  }

  // Delete generated content if version exists
  if (generatedVersion) {
    await supabase.from('generated_scripts').delete().eq('version_id', generatedVersion.id);
    await supabase.from('scenario_templates').delete().eq('version_id', generatedVersion.id);

    // Delete courses and their modules
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('version_id', generatedVersion.id);

    for (const c of (courses || [])) {
      await supabase.from('course_modules').delete().eq('course_id', c.id);
    }
    await supabase.from('courses').delete().eq('version_id', generatedVersion.id);
    await supabase.from('program_versions').delete().eq('id', generatedVersion.id);
  }

  // Delete messages, docs, session
  await supabase.from('studio_messages').delete().eq('session_id', SESSION_ID);
  await supabase.from('kb_documents').delete().eq('session_id', SESSION_ID);
  await supabase.from('studio_sessions').delete().eq('id', SESSION_ID);
  console.log('  Cleaned up session', SESSION_ID);
});

console.log('\n' + '='.repeat(60));
console.log('ALL TESTS COMPLETE');
console.log('='.repeat(60));
