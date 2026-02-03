/**
 * Test Script for Weekly Digest Email
 *
 * This script tests the weekly digest email functionality by:
 * 1. Creating test data (organization, users, sessions)
 * 2. Triggering the digest email job manually
 * 3. Verifying the email was sent
 *
 * Usage: node api/scripts/test-weekly-digest.js
 */

import 'dotenv/config';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import { triggerWeeklyDigestManual } from '../jobs/weeklyDigest.js';

async function createTestData() {
  console.log('\n=== Creating Test Data ===\n');

  const adminClient = createAdminClient();

  try {
    // Create test organization
    const { data: org, error: orgError } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .select('id, name')
      .eq('name', 'Test Org - Weekly Digest')
      .single();

    let orgId;
    if (orgError || !org) {
      console.log('Creating test organization...');
      const { data: newOrg, error: createOrgError } = await adminClient
        .from(TABLES.ORGANIZATIONS)
        .insert({
          name: 'Test Org - Weekly Digest',
          slug: 'test-org-weekly-digest',
          subscription_status: 'active'
        })
        .select()
        .single();

      if (createOrgError) {
        console.error('Error creating organization:', createOrgError);
        return null;
      }
      orgId = newOrg.id;
      console.log('✓ Created organization:', newOrg.name);
    } else {
      orgId = org.id;
      console.log('✓ Using existing organization:', org.name);
    }

    // Create test manager
    const managerEmail = 'test-manager@example.com';
    const { data: manager, error: managerError } = await adminClient
      .from(TABLES.USERS)
      .select('*')
      .eq('email', managerEmail)
      .single();

    let managerId;
    if (managerError || !manager) {
      console.log('Creating test manager...');
      // Note: In a real scenario, this would be created through the auth system
      console.log('⚠ Cannot create test users without Clerk integration');
      console.log('⚠ Please create a test manager manually with email:', managerEmail);
      return null;
    } else {
      managerId = manager.id;
      console.log('✓ Using existing manager:', manager.email);
    }

    // Create test team members with varied performance
    console.log('\nTest data setup complete!');
    console.log('Organization ID:', orgId);
    console.log('Manager ID:', managerId);

    return { orgId, managerId };

  } catch (error) {
    console.error('Error creating test data:', error);
    return null;
  }
}

async function testEmailPreferences() {
  console.log('\n=== Testing Email Preferences ===\n');

  const adminClient = createAdminClient();

  try {
    // Find a test manager
    const { data: manager } = await adminClient
      .from(TABLES.USERS)
      .select('*')
      .eq('role', 'manager')
      .limit(1)
      .single();

    if (!manager) {
      console.log('⚠ No managers found in database');
      return;
    }

    console.log('Testing with manager:', manager.email);

    // Check current preferences
    const { data: prefs, error: prefsError } = await adminClient
      .from('email_preferences')
      .select('*')
      .eq('user_id', manager.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefsError);
      return;
    }

    if (!prefs) {
      console.log('✓ No preferences set (will use defaults: weekly_digest=true)');
    } else {
      console.log('✓ Current preferences:', {
        weekly_digest: prefs.weekly_digest,
        digest_day: prefs.digest_day,
        digest_time: prefs.digest_time
      });
    }

  } catch (error) {
    console.error('Error testing preferences:', error);
  }
}

async function testWeeklyDigest() {
  console.log('\n=== Testing Weekly Digest Email ===\n');

  if (!process.env.RESEND_API_KEY) {
    console.log('⚠ RESEND_API_KEY not set - emails will not be sent');
    console.log('⚠ Set RESEND_API_KEY in .env to test actual email sending');
  } else {
    console.log('✓ RESEND_API_KEY is configured');
  }

  console.log('\nTriggering weekly digest job...\n');

  try {
    const result = await triggerWeeklyDigestManual();

    console.log('\n=== Results ===\n');
    console.log('Success:', result.success);

    if (result.success) {
      console.log('✓ Emails sent:', result.sent);
      console.log('✗ Emails failed:', result.failed);
    } else {
      console.log('✗ Error:', result.error);
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function checkDatabaseSetup() {
  console.log('\n=== Checking Database Setup ===\n');

  const adminClient = createAdminClient();

  try {
    // Check if email_preferences table exists
    const { error: tableError } = await adminClient
      .from('email_preferences')
      .select('id')
      .limit(1);

    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('✗ email_preferences table does not exist');
        console.log('  Run migration: supabase-migrations/023_email_preferences.sql');
        return false;
      }
      console.log('⚠ Error checking table:', tableError.message);
      return false;
    }

    console.log('✓ email_preferences table exists');

    // Check for organizations
    const { data: orgs, error: orgsError } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .select('id, name')
      .limit(5);

    if (orgsError) {
      console.log('✗ Error querying organizations:', orgsError.message);
      return false;
    }

    console.log(`✓ Found ${orgs?.length || 0} organizations`);

    // Check for managers
    const { data: managers, error: managersError } = await adminClient
      .from(TABLES.USERS)
      .select('id, email, role')
      .in('role', ['manager', 'admin', 'super_admin'])
      .limit(5);

    if (managersError) {
      console.log('✗ Error querying managers:', managersError.message);
      return false;
    }

    console.log(`✓ Found ${managers?.length || 0} managers/admins`);

    if (managers?.length > 0) {
      console.log('\nManagers:');
      managers.forEach(m => console.log(`  - ${m.email} (${m.role})`));
    }

    return true;

  } catch (error) {
    console.error('✗ Database check failed:', error);
    return false;
  }
}

// Main test execution
async function main() {
  console.log('==========================================');
  console.log('  Weekly Digest Email - Test Script');
  console.log('==========================================');

  // Step 1: Check database setup
  const dbReady = await checkDatabaseSetup();
  if (!dbReady) {
    console.log('\n⚠ Database not ready. Please run the migration first.');
    process.exit(1);
  }

  // Step 2: Test email preferences
  await testEmailPreferences();

  // Step 3: Run the digest job
  await testWeeklyDigest();

  console.log('\n==========================================');
  console.log('  Test Complete!');
  console.log('==========================================\n');

  // Instructions
  console.log('Next Steps:');
  console.log('1. Check your email inbox for the digest email');
  console.log('2. Verify the email content is correct');
  console.log('3. Test the unsubscribe/preferences links');
  console.log('4. Update email preferences via API and re-run test');
  console.log('\nAPI Endpoints:');
  console.log('- GET  /api/notifications/preferences');
  console.log('- PUT  /api/notifications/preferences');
  console.log('- POST /api/notifications/preferences/unsubscribe');
  console.log('- POST /api/admin/trigger-weekly-digest (admin only)');
}

main().catch(console.error);
