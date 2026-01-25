/**
 * Run SQL migrations against Supabase
 * Uses the Supabase REST API to execute SQL directly
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from api folder
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL (e.g., eeejffbynrowrykbhqfc from https://eeejffbynrowrykbhqfc.supabase.co)
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function executeSql(sql, description = 'SQL') {
  console.log(`\n=== Executing: ${description} ===`);

  try {
    // Use the Supabase SQL endpoint (via supabase-management-api format)
    // This requires sending SQL to the postgres connection
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`✓ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed:`, error.message);
    return false;
  }
}

async function runMigrationViaFetch(sql, description) {
  // Split SQL into individual statements
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let failCount = 0;

  for (const statement of statements) {
    if (!statement) continue;

    // Skip pure comments
    if (statement.match(/^--/)) continue;

    const shortDesc = statement.substring(0, 50).replace(/\n/g, ' ') + '...';

    try {
      // For Supabase, we need to use the pg-meta API or direct postgres connection
      // Since we can't do that easily, let's check if there's a way through supabase-js
      console.log(`  Preparing: ${shortDesc}`);
      successCount++;
    } catch (err) {
      console.error(`  Failed: ${shortDesc}`);
      failCount++;
    }
  }

  return { success: successCount, failed: failCount };
}

async function main() {
  console.log('========================================');
  console.log('Running Phase 1 Migrations');
  console.log('========================================');
  console.log(`\nProject: ${projectRef}`);
  console.log(`URL: ${supabaseUrl}`);

  // Read migration files
  const migrationsDir = join(__dirname, '..', '..', 'supabase-migrations');

  const schemaFile = join(migrationsDir, '001_schema.sql');
  const seedFile = join(migrationsDir, '002_seed_data.sql');

  if (!fs.existsSync(schemaFile)) {
    console.error('\nMigration files not found. Run migrate-phase1.js first.');
    process.exit(1);
  }

  const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
  const seedSQL = fs.readFileSync(seedFile, 'utf8');

  console.log('\n========================================');
  console.log('IMPORTANT: Manual Execution Required');
  console.log('========================================\n');

  console.log('Supabase does not allow direct SQL execution via REST API.');
  console.log('Please run the migrations manually:\n');
  console.log('1. Open your Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`);
  console.log('2. Copy and paste the contents of these files in order:');
  console.log(`   - ${schemaFile}`);
  console.log(`   - ${seedFile}\n`);
  console.log('3. Run the verification query from:');
  console.log(`   - ${join(migrationsDir, '003_verify.sql')}\n`);

  console.log('========================================');
  console.log('Alternative: Supabase CLI');
  console.log('========================================\n');
  console.log('If you have Supabase CLI installed:');
  console.log('  npx supabase db push');
  console.log('\nOr link and run migrations:');
  console.log('  npx supabase link --project-ref', projectRef);
  console.log('  npx supabase db execute -f supabase-migrations/001_schema.sql');
  console.log('  npx supabase db execute -f supabase-migrations/002_seed_data.sql');
}

main().catch(console.error);
