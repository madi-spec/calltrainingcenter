import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const AUN_ORG_ID = '5804f492-4395-4d9d-ae40-983ee29c23bf';
const ADMIN_EMAIL = 'ballen@xrailabsteam.com';

async function main() {
  // Check current user
  const { data: user } = await supabase
    .from('users')
    .select('id, email, full_name, role, organization_id, clerk_id')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (!user) {
    console.error('User not found. They need to sign up at selleverycall.com first.');
    process.exit(1);
  }

  console.log(`Found user: ${user.full_name} (${user.email})`);
  console.log(`  Current org: ${user.organization_id}`);
  console.log(`  Clerk ID: ${user.clerk_id}`);

  // Check AUN org
  const { data: aun } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', AUN_ORG_ID)
    .single();

  console.log(`\nTarget org: ${aun.name} (${aun.id})`);

  // Update user to AUN org as super_admin
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      organization_id: AUN_ORG_ID,
      role: 'super_admin'
    })
    .eq('id', user.id);

  if (updateErr) {
    console.error('Failed to update user:', updateErr.message);
    process.exit(1);
  }

  console.log(`\nUpdated ${user.full_name} → All U Need Pest Control (super_admin)`);
  console.log(`\nLogin at: https://www.selleverycall.com`);
  console.log(`Email: ${ADMIN_EMAIL}`);
}

main().catch(err => { console.error(err); process.exit(1); });
