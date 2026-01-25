/**
 * Implementation Verification Script
 *
 * Verifies that all components from the 12-phase implementation are properly set up.
 * Run with: node api/scripts/verify-implementation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

console.log('\n========================================');
console.log('CSR Training Simulator - Implementation Verification');
console.log('========================================\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function check(name, condition, optional = false) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    results.passed++;
    return true;
  } else if (optional) {
    console.log(`  ⚠️  ${name} (optional)`);
    results.warnings++;
    return false;
  } else {
    console.log(`  ❌ ${name}`);
    results.failed++;
    return false;
  }
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function fileContains(relativePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
    return content.includes(searchString);
  } catch {
    return false;
  }
}

// ============ Phase 1: Database Schema ============
console.log('Phase 1: Database Schema & Seed Data');
check('Migration script exists', fileExists('api/scripts/migrate-phase1.js'));
check('Supabase migrations folder exists', fileExists('supabase-migrations'));

// ============ Phase 2: Product Configuration API ============
console.log('\nPhase 2: Product Configuration API');
check('Products route exists', fileExists('api/routes/products.js'));
check('Products route mounted', fileContains('api/index.js', "app.use('/api/products'"));

// ============ Phase 3: Teams API ============
console.log('\nPhase 3: Teams API');
check('Teams route exists', fileExists('api/routes/teams.js'));
check('Teams route mounted', fileContains('api/index.js', "app.use('/api/teams'"));

// ============ Phase 4: Courses & Modules API ============
console.log('\nPhase 4: Courses & Modules API');
check('Courses route exists', fileExists('api/routes/courses.js'));
check('Modules route exists', fileExists('api/routes/modules.js'));
check('Courses route mounted', fileContains('api/index.js', "app.use('/api/courses'"));
check('Modules route mounted', fileContains('api/index.js', "app.use('/api/modules'"));

// ============ Phase 5: Scenario Generator Service ============
console.log('\nPhase 5: Scenario Generator Service');
check('Scenario generator service exists', fileExists('api/services/scenarioGenerator.js'));
check('Service exports generateScenariosForModule', fileContains('api/services/scenarioGenerator.js', 'export async function generateScenariosForModule'));

// ============ Phase 6: Practice Requirements API ============
console.log('\nPhase 6: Practice Requirements API');
check('Practice route exists', fileExists('api/routes/practice.js'));
check('Practice route mounted', fileContains('api/index.js', "app.use('/api/practice'"));
check('Compliance overview endpoint', fileContains('api/routes/practice.js', 'compliance-overview'));

// ============ Phase 7: Agent Dashboard Frontend ============
console.log('\nPhase 7: Agent Dashboard Frontend');
check('Dashboard component exists', fileExists('client/src/pages/dashboard/Dashboard.jsx'));
check('Dashboard has practice tracking', fileContains('client/src/pages/dashboard/Dashboard.jsx', 'practiceToday'));
check('Dashboard has courses section', fileContains('client/src/pages/dashboard/Dashboard.jsx', 'courses'));

// ============ Phase 8: Manager Dashboard Frontend ============
console.log('\nPhase 8: Manager Dashboard Frontend');
check('Manager dashboard component exists', fileExists('client/src/pages/dashboard/ManagerDashboard.jsx'));
check('Compliance grid in manager dashboard', fileContains('client/src/pages/dashboard/ManagerDashboard.jsx', 'compliance'));
check('Team recent sessions endpoint', fileContains('api/routes/training.js', 'team-recent'));

// ============ Phase 9: Setup Wizard Frontend ============
console.log('\nPhase 9: Setup Wizard Frontend');
check('Setup wizard exists', fileExists('client/src/pages/setup/SetupWizard.jsx'));
check('Company info step exists', fileExists('client/src/pages/setup/steps/CompanyInfoStep.jsx'));
check('Packages step exists', fileExists('client/src/pages/setup/steps/PackagesStep.jsx'));
check('Competitors step exists', fileExists('client/src/pages/setup/steps/CompetitorsStep.jsx'));
check('Team setup step exists', fileExists('client/src/pages/setup/steps/TeamSetupStep.jsx'));
check('Organizations route exists', fileExists('api/routes/organizations.js'));
check('Invitations route exists', fileExists('api/routes/invitations.js'));

// ============ Phase 10: Course & Module UI ============
console.log('\nPhase 10: Course & Module UI');
check('Courses page exists', fileExists('client/src/pages/courses/Courses.jsx'));
check('Course detail page exists', fileExists('client/src/pages/courses/CourseDetail.jsx'));
check('Module detail page exists', fileExists('client/src/pages/modules/ModuleDetail.jsx'));
check('Courses route in App.jsx', fileContains('client/src/App.jsx', "path=\"/courses\""));
check('Course detail route in App.jsx', fileContains('client/src/App.jsx', "path=\"/courses/:id\""));
check('Module detail route in App.jsx', fileContains('client/src/App.jsx', "path=\"/modules/:id\""));

// ============ Phase 11: Coaching Analysis ============
console.log('\nPhase 11: Update Coaching Analysis');
check('Product context in coaching', fileContains('api/index.js', 'getProductContext'));
check('Coaching includes packages', fileContains('api/index.js', 'Service Packages'));
check('Coaching includes objections', fileContains('api/index.js', 'Objection Responses'));
check('Coaching includes competitors', fileContains('api/index.js', 'Competitor Information'));

// ============ General Checks ============
console.log('\nGeneral Structure');
check('Supabase client exists', fileExists('api/lib/supabase.js'));
check('Auth middleware exists', fileExists('api/lib/auth.js'));
check('Main API index exists', fileExists('api/index.js'));
check('Client App.jsx exists', fileExists('client/src/App.jsx'));
check('AuthContext exists', fileExists('client/src/context/AuthContext.jsx'));
check('OrganizationContext exists', fileExists('client/src/context/OrganizationContext.jsx'));

// ============ Summary ============
console.log('\n========================================');
console.log('Verification Summary');
console.log('========================================');
console.log(`  ✅ Passed: ${results.passed}`);
console.log(`  ⚠️  Warnings: ${results.warnings}`);
console.log(`  ❌ Failed: ${results.failed}`);
console.log('');

if (results.failed === 0) {
  console.log('🎉 All checks passed! Implementation is complete.');
} else {
  console.log(`⚠️  ${results.failed} check(s) failed. Please review the issues above.`);
}

console.log('\n========================================');
console.log('Next Steps');
console.log('========================================');
console.log('1. Ensure database migrations have been run in Supabase');
console.log('2. Configure environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)');
console.log('3. Start the API server: npm run dev (in api folder)');
console.log('4. Start the client: npm run dev (in client folder)');
console.log('5. Test the application at http://localhost:5173');
console.log('');

process.exit(results.failed > 0 ? 1 : 0);
