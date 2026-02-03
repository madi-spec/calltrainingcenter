/**
 * Run the onboarding_completed column migration
 * This script must be run manually through Supabase SQL Editor
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFile = join(__dirname, '..', 'migrations', 'add_onboarding_completed.sql');

console.log('========================================');
console.log('Onboarding Column Migration');
console.log('========================================\n');

const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('To add the onboarding_completed column to your database:\n');
console.log('1. Open your Supabase Dashboard SQL Editor:');
console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT/sql\n');
console.log('2. Copy and paste the following SQL:\n');
console.log('----------------------------------------');
console.log(sql);
console.log('----------------------------------------\n');
console.log('3. Click "Run" to execute the migration\n');
console.log('4. Verify the column was added:');
console.log('   SELECT column_name, data_type, column_default');
console.log('   FROM information_schema.columns');
console.log('   WHERE table_name = \'users\'');
console.log('   AND column_name = \'onboarding_completed\';\n');
console.log('========================================\n');
