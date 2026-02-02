/**
 * Test the invite endpoint with Dennis Foster's credentials
 * This simulates what happens when Dennis tries to invite someone
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { hasPermission } from '../lib/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function testInvitePermissions() {
  console.log('\n=== Testing Invite Permissions for Dennis Foster ===\n');

  try {
    const adminClient = createAdminClient();

    // Get Dennis Foster's user record
    const { data: user, error } = await adminClient
      .from(TABLES.USERS)
      .select('id, email, full_name, role, organization_id')
      .eq('email', 'dennisf@go-forth.com')
      .single();

    if (error || !user) {
      console.error('❌ Could not find user');
      process.exit(1);
    }

    console.log('✓ User found:');
    console.log(`  Name: ${user.full_name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Org ID: ${user.organization_id}`);

    // Test permission check (what the API does)
    const canInvite = hasPermission(user.role, 'users:invite');
    console.log(`\n✓ Permission check: hasPermission('${user.role}', 'users:invite') = ${canInvite}`);

    if (!canInvite) {
      console.error('\n❌ PROBLEM: User does not have users:invite permission!');
      console.error('   This is why Dennis cannot invite users.');
      process.exit(1);
    }

    console.log('\n✅ Dennis Foster CAN invite users (permission check passed)');
    console.log('\n=== Next Steps ===');
    console.log('1. API server needs to restart to load new permissions');
    console.log('2. Dennis needs to hard refresh browser (Ctrl+Shift+R)');
    console.log('3. Try inviting again\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testInvitePermissions();
