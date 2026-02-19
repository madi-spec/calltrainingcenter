import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AUN_ORG = '5804f492-4395-4d9d-ae40-983ee29c23bf';

const { data } = await supabase
  .from('courses')
  .select('id, name, category, is_system, organization_id')
  .or(`is_system.eq.true,organization_id.eq.${AUN_ORG}`)
  .order('is_system', { ascending: false });

console.log('Courses visible to AUN org:\n');
for (const c of data) {
  const tag = c.is_system ? 'SYSTEM' : 'AUN';
  console.log(`  [${tag}] ${c.name} (${c.category})`);
}
