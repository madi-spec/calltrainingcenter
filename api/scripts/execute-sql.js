/**
 * Execute SQL migrations against Supabase using postgres client
 *
 * Requires DATABASE_URL environment variable or Supabase connection string
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from api folder
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// Try to get database URL from environment or construct it
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && projectRef) {
  // Supabase pooler connection (requires password from dashboard)
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  console.log('DATABASE_URL not set.');
  console.log('\nTo get your database connection string:');
  console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
  console.log('2. Copy the Connection String (URI) under "Connection string"');
  console.log('3. Set DATABASE_URL in your .env file');
  console.log('\nExample:');
  console.log('DATABASE_URL=postgresql://postgres.[project-ref]:[your-password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres\n');
}

async function executeFile(sql, filePath, description) {
  if (!databaseUrl) {
    console.log(`Skipping ${description} - no DATABASE_URL`);
    return false;
  }

  console.log(`\n=== Executing: ${description} ===`);
  console.log(`File: ${filePath}`);

  try {
    const sqlClient = postgres(databaseUrl, {
      ssl: 'require',
      connection: {
        application_name: 'csr-migration'
      }
    });

    // Execute the entire file as a single transaction
    await sqlClient.unsafe(sql);
    await sqlClient.end();

    console.log(`✓ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed:`);
    console.error(error.message);
    return false;
  }
}

async function runVerification(sql) {
  if (!databaseUrl) {
    console.log('Skipping verification - no DATABASE_URL');
    return;
  }

  console.log('\n=== Running Verification ===');

  try {
    const sqlClient = postgres(databaseUrl, {
      ssl: 'require'
    });

    const result = await sqlClient.unsafe(`
      SELECT 'service_categories' as tbl, COUNT(*)::text as count FROM service_categories
      UNION ALL SELECT 'pest_types', COUNT(*)::text FROM pest_types
      UNION ALL SELECT 'package_templates', COUNT(*)::text FROM package_templates
      UNION ALL SELECT 'objection_templates', COUNT(*)::text FROM objection_templates
      UNION ALL SELECT 'customer_profiles', COUNT(*)::text FROM customer_profiles
      UNION ALL SELECT 'courses', COUNT(*)::text FROM courses
      UNION ALL SELECT 'course_modules', COUNT(*)::text FROM course_modules;
    `);

    await sqlClient.end();

    console.log('\nTable Counts:');
    console.log('─'.repeat(40));
    result.forEach(row => {
      console.log(`  ${row.tbl.padEnd(25)} ${row.count}`);
    });
    console.log('─'.repeat(40));

    // Expected counts
    const expected = {
      service_categories: 9,
      pest_types: 28,
      package_templates: 9,
      objection_templates: 11,
      customer_profiles: 48,
      courses: 6,
      course_modules: 18
    };

    let allMatch = true;
    result.forEach(row => {
      const exp = expected[row.tbl];
      if (exp && parseInt(row.count) < exp) {
        console.log(`  ⚠ ${row.tbl}: expected ${exp}, got ${row.count}`);
        allMatch = false;
      }
    });

    if (allMatch) {
      console.log('\n✓ All seed data verified successfully!');
    }

  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

async function main() {
  console.log('========================================');
  console.log('Running Phase 1 Migrations');
  console.log('========================================');

  const migrationsDir = join(__dirname, '..', '..', 'supabase-migrations');
  const schemaFile = join(migrationsDir, '001_schema.sql');
  const seedFile = join(migrationsDir, '002_seed_data.sql');

  if (!fs.existsSync(schemaFile)) {
    console.error('\nMigration files not found. Run migrate-phase1.js first.');
    process.exit(1);
  }

  if (!databaseUrl) {
    console.log('\n========================================');
    console.log('DATABASE_URL Required');
    console.log('========================================\n');
    console.log('Add DATABASE_URL to api/.env to run migrations automatically.');
    console.log('\nAlternatively, run the SQL manually:');
    console.log(`1. Open: https://supabase.com/dashboard/project/${projectRef}/sql`);
    console.log(`2. Paste contents of: ${schemaFile}`);
    console.log(`3. Paste contents of: ${seedFile}`);
    return;
  }

  const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
  const seedSQL = fs.readFileSync(seedFile, 'utf8');

  // Run schema
  const schemaOk = await executeFile(schemaSQL, schemaFile, 'Schema Migration');
  if (!schemaOk) {
    console.log('\nSchema migration failed. Please fix errors and retry.');
    return;
  }

  // Run seed data
  const seedOk = await executeFile(seedSQL, seedFile, 'Seed Data');
  if (!seedOk) {
    console.log('\nSeed data insertion failed. Some data may have been inserted.');
  }

  // Verify
  await runVerification();

  console.log('\n========================================');
  console.log('Phase 1 Migration Complete');
  console.log('========================================\n');
}

main().catch(console.error);
