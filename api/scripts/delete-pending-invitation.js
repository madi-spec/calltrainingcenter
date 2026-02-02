/**
 * Delete pending invitation by email
 * Usage: node api/scripts/delete-pending-invitation.js <email>
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createAdminClient } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function deletePendingInvitation(email) {
  if (!email) {
    console.error('Usage: node api/scripts/delete-pending-invitation.js <email>');
    process.exit(1);
  }

  console.log(`\n=== Deleting pending invitation for: ${email} ===\n`);

  try {
    const adminClient = createAdminClient();

    // Find pending invitations
    const { data: invitations, error: fetchError } = await adminClient
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching invitations:', fetchError);
      process.exit(1);
    }

    if (!invitations || invitations.length === 0) {
      console.log('✓ No pending invitations found');
      process.exit(0);
    }

    console.log(`Found ${invitations.length} pending invitation(s):`);
    invitations.forEach((inv, i) => {
      console.log(`\n  Invitation ${i + 1}:`);
      console.log(`    ID: ${inv.id}`);
      console.log(`    Email: ${inv.email}`);
      console.log(`    Role: ${inv.role}`);
      console.log(`    Organization ID: ${inv.organization_id}`);
      console.log(`    Created: ${inv.created_at}`);
      console.log(`    Expires: ${inv.expires_at}`);
    });

    // Delete invitations
    const { error: deleteError } = await adminClient
      .from('invitations')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('status', 'pending');

    if (deleteError) {
      console.error('\n❌ Error deleting:', deleteError);
      process.exit(1);
    }

    console.log(`\n✅ Deleted ${invitations.length} pending invitation(s)\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
deletePendingInvitation(email);
