/**
 * Fix user role - check and update a user's role to super_admin
 *
 * Usage: node api/scripts/fix-user-role.js <email>
 * Example: node api/scripts/fix-user-role.js dennis@example.com
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAdminClient, TABLES } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from api folder
dotenv.config({ path: join(__dirname, '..', '.env') });

async function fixUserRole(email) {
  if (!email) {
    console.error('Error: Email required');
    console.log('\nUsage: node api/scripts/fix-user-role.js <email>');
    console.log('Example: node api/scripts/fix-user-role.js dennis@example.com');
    process.exit(1);
  }

  console.log(`\n=== Checking user: ${email} ===\n`);

  try {
    const adminClient = createAdminClient();

    // Find user by email
    const { data: user, error: findError } = await adminClient
      .from(TABLES.USERS)
      .select('id, email, full_name, role, organization_id, created_at')
      .eq('email', email)
      .single();

    if (findError || !user) {
      console.error('Error: User not found');
      console.log(`No user exists with email: ${email}`);
      process.exit(1);
    }

    console.log('User found:');
    console.log('─'.repeat(50));
    console.log(`  Name:          ${user.full_name}`);
    console.log(`  Email:         ${user.email}`);
    console.log(`  Current Role:  ${user.role}`);
    console.log(`  Organization:  ${user.organization_id}`);
    console.log(`  Created:       ${new Date(user.created_at).toLocaleString()}`);
    console.log('─'.repeat(50));

    // Check if they're the first user in their organization (owner)
    const { data: users, error: usersError } = await adminClient
      .from(TABLES.USERS)
      .select('id, created_at')
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: true });

    if (!usersError && users && users.length > 0) {
      const isFirstUser = users[0].id === user.id;
      console.log(`\n  First user in org: ${isFirstUser ? 'YES' : 'NO'}`);
      console.log(`  Total users in org: ${users.length}`);
    }

    // If already super_admin, no change needed
    if (user.role === 'super_admin') {
      console.log('\n✓ User already has super_admin role. No changes needed.');
      return;
    }

    // Update role to super_admin
    console.log(`\n📝 Updating role from '${user.role}' to 'super_admin'...`);

    const { data: updatedUser, error: updateError } = await adminClient
      .from(TABLES.USERS)
      .update({ role: 'super_admin' })
      .eq('id', user.id)
      .select('id, email, full_name, role')
      .single();

    if (updateError) {
      console.error('\n✗ Failed to update user role:');
      console.error(updateError.message);
      process.exit(1);
    }

    console.log('\n✓ Role updated successfully!');
    console.log('─'.repeat(50));
    console.log(`  Name:         ${updatedUser.full_name}`);
    console.log(`  Email:        ${updatedUser.email}`);
    console.log(`  New Role:     ${updatedUser.role}`);
    console.log('─'.repeat(50));
    console.log('\n✓ Done! User can now invite team members and access all admin features.');

  } catch (error) {
    console.error('\n✗ Unexpected error:');
    console.error(error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
fixUserRole(email);
