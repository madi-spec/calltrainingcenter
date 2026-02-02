/**
 * Create invitations table in Supabase
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAdminClient } from '../lib/supabase.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function createInvitationsTable() {
  console.log('\n=== Creating Invitations Table ===\n');

  try {
    const adminClient = createAdminClient();

    // Read the migration file
    const migrationPath = join(__dirname, '..', '..', 'supabase-migrations', '020_invitations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration...\n');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;

      try {
        const { error } = await adminClient.rpc('exec_sql', { sql: statement + ';' });

        if (error) {
          // Try direct SQL execution via supabase
          const { error: error2 } = await adminClient.from('_sql').select('*').single();

          if (error2) {
            console.error('Error executing statement:', statement.substring(0, 100) + '...');
            console.error('Error:', error.message);
          }
        }
      } catch (err) {
        // Ignore errors, will show summary at end
      }
    }

    // Verify table was created
    const { data, error } = await adminClient
      .from('invitations')
      .select('count')
      .limit(1);

    if (error) {
      console.error('\n❌ Table creation failed!');
      console.error('Error:', error.message);
      console.log('\n=== Manual Steps Required ===\n');
      console.log('1. Go to your Supabase Dashboard SQL Editor');
      console.log('2. Copy and paste the contents of:');
      console.log(`   ${migrationPath}`);
      console.log('3. Click "Run" to execute the migration\n');
      process.exit(1);
    }

    console.log('✅ Invitations table created successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n=== Manual Steps Required ===\n');
    console.log('1. Go to your Supabase Dashboard SQL Editor');
    console.log('2. Copy and paste the contents of:');
    const migrationPath = join(__dirname, '..', '..', 'supabase-migrations', '020_invitations.sql');
    console.log(`   ${migrationPath}`);
    console.log('3. Click "Run" to execute the migration\n');
    process.exit(1);
  }
}

createInvitationsTable();
