/**
 * Clean up test user created during invitation testing
 * Usage: node api/scripts/cleanup-test-user.js <email>
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function cleanupTestUser(email) {
  if (!email) {
    console.error('Usage: node api/scripts/cleanup-test-user.js <email>');
    process.exit(1);
  }

  console.log(`\n=== Cleaning up test user: ${email} ===\n`);

  try {
    const adminClient = createAdminClient();

    // Find user in database
    const { data: users, error: fetchError } = await adminClient
      .from(TABLES.USERS)
      .select('*')
      .eq('email', email.toLowerCase());

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('✓ No users found with that email in database');
      console.log('✓ Database is clean\n');
    } else {
      console.log(`Found ${users.length} user(s) in database:`);
      users.forEach((user, i) => {
        console.log(`\n  User ${i + 1}:`);
        console.log(`    ID: ${user.id}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Name: ${user.full_name}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    Organization ID: ${user.organization_id}`);
        console.log(`    Clerk ID: ${user.clerk_id || 'NONE'}`);
        console.log(`    Created: ${user.created_at}`);
      });

      // Delete users from database
      const { error: deleteError } = await adminClient
        .from(TABLES.USERS)
        .delete()
        .eq('email', email.toLowerCase());

      if (deleteError) {
        console.error('\n❌ Error deleting from database:', deleteError);
        process.exit(1);
      }

      console.log(`\n✅ Deleted ${users.length} user(s) from database`);
    }

    // Try to clean up from Clerk
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const clerkClient = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY
        });

        const clerkUsers = await clerkClient.users.getUserList({
          emailAddress: [email.toLowerCase()]
        });

        if (clerkUsers.data && clerkUsers.data.length > 0) {
          console.log(`\nFound ${clerkUsers.data.length} user(s) in Clerk:`);

          for (const clerkUser of clerkUsers.data) {
            console.log(`\n  Clerk User:`);
            console.log(`    ID: ${clerkUser.id}`);
            console.log(`    Email: ${clerkUser.emailAddresses[0]?.emailAddress}`);
            console.log(`    Name: ${clerkUser.firstName} ${clerkUser.lastName}`);
            console.log(`    Created: ${new Date(clerkUser.createdAt).toISOString()}`);

            // Delete from Clerk
            await clerkClient.users.deleteUser(clerkUser.id);
            console.log(`    ✅ Deleted from Clerk`);
          }

          console.log(`\n✅ Cleaned up ${clerkUsers.data.length} user(s) from Clerk`);
        } else {
          console.log('\n✓ No users found in Clerk');
        }
      } catch (clerkError) {
        console.log('\n⚠️  Could not clean up Clerk (not critical):', clerkError.message);
      }
    } else {
      console.log('\n⚠️  CLERK_SECRET_KEY not set, skipping Clerk cleanup');
    }

    console.log('\n✅ Cleanup complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
cleanupTestUser(email);
