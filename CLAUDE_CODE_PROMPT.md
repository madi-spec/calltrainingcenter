# Claude Code Implementation Prompt

## Your Mission

You are tasked with completing a major upgrade to the CSR Training Simulator, a SaaS platform for training pest control customer service representatives. You will work autonomously through all phases, implementing features, testing them, and moving on without human intervention.

**CRITICAL**: Reference the `IMPLEMENTATION_GUIDE.md` file constantly. It contains complete specifications for everything you need to build.

---

## Project Context

### Current Repository Structure
```
csr-training-simulator/
├── api/                    # Express API (Vercel Serverless)
│   ├── index.js            # Main API entry
│   ├── lib/                # Auth, permissions, stripe, supabase
│   └── routes/             # Existing route handlers
├── client/                 # React Frontend
│   └── src/
│       ├── components/     # UI components
│       ├── context/        # React contexts
│       ├── hooks/          # Custom hooks
│       └── pages/          # Page components
├── server/                 # Additional services
│   └── services/           # Claude, Retell, prompts
└── docs/
```

### Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Express.js on Vercel
- Database: Supabase (PostgreSQL)
- Auth: Clerk
- Voice: Retell AI
- AI: Claude (Anthropic)
- Payments: Stripe

---

## Implementation Phases

Execute in this exact order. Complete each phase fully before proceeding.

### PHASE 1: Database Schema & Seed Data
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 1

Tasks:
1. Run all CREATE TABLE statements
2. Run ALTER TABLE statements for existing tables
3. Create all indexes
4. Enable RLS and create policies
5. Run ALL seed data scripts:
   - service_categories (9 rows)
   - pest_types (~45 rows)
   - package_templates (~15 rows)
   - objection_templates (~25 rows)
   - customer_profiles (50 rows)
   - courses (6 rows)
   - course_modules (18 rows)

Verification:
```sql
SELECT 'service_categories' as tbl, COUNT(*) FROM service_categories
UNION ALL SELECT 'pest_types', COUNT(*) FROM pest_types
UNION ALL SELECT 'package_templates', COUNT(*) FROM package_templates
UNION ALL SELECT 'objection_templates', COUNT(*) FROM objection_templates
UNION ALL SELECT 'customer_profiles', COUNT(*) FROM customer_profiles
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'course_modules', COUNT(*) FROM course_modules;
```

### PHASE 2: Product Configuration API
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 2

Tasks:
1. Create `api/routes/products.js` with ALL endpoints
2. Register in `api/index.js`
3. Test each endpoint category:
   - Reference data (GET categories, pests, templates)
   - Service lines CRUD
   - Packages CRUD (including from-template)
   - Selling points CRUD
   - Objections CRUD
   - Competitors CRUD
   - Sales guidelines CRUD
   - Product context endpoint

### PHASE 3: Teams API
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 3

Tasks:
1. Create `api/routes/teams.js`
2. Register routes
3. Test: create team, add members, get stats, compare teams

### PHASE 4: Courses & Modules API
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 4

Tasks:
1. Create `api/routes/courses.js`
2. Create `api/routes/modules.js`
3. Test: list courses, start course, get module, start module

### PHASE 5: Scenario Generator Service
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 5

Tasks:
1. Create `api/services/scenarioGenerator.js`
2. Implement profile randomization logic
3. Implement scenario text generation with Claude
4. Test: generate scenarios for a module

### PHASE 6: Practice Requirements API
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 9

Tasks:
1. Create `api/routes/practice.js`
2. Test: log practice, get today/week, team compliance

### PHASE 7: Agent Dashboard Frontend
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 6

Tasks:
1. Create `client/src/pages/AgentDashboard.jsx`
2. Create supporting components:
   - PracticeCard
   - CourseCard
   - BadgeIcon
3. Update routing to use new dashboard
4. Test: view renders, data loads, navigation works

### PHASE 8: Manager Dashboard Frontend
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 7

Tasks:
1. Create `client/src/pages/ManagerDashboard.jsx`
2. Create supporting components:
   - StatCard
   - PracticeRow
   - SessionRow
3. Test: team data loads, compliance displays

### PHASE 9: Setup Wizard Frontend
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 8

Tasks:
1. Create `client/src/pages/SetupWizard.jsx`
2. Create step components in `client/src/components/setup/`:
   - CompanyBasicsStep
   - TeamSetupStep
   - ServiceLinesStep
   - PackagesStep
   - ObjectionsStep
   - ReviewStep
3. Create `api/routes/setup.js` for completion endpoint
4. Test: can navigate all steps, saves data

### PHASE 10: Course & Module UI
Tasks:
1. Create `client/src/pages/CourseList.jsx`
2. Create `client/src/pages/CourseDetail.jsx`
3. Create `client/src/pages/ModuleDetail.jsx`
4. Integrate with existing training call flow
5. Test: can start course, complete scenarios, earn badges

### PHASE 11: Update Coaching Analysis
**Reference**: IMPLEMENTATION_GUIDE.md → Phase 10

Tasks:
1. Update `server/services/claude.js` to include product context
2. Update coaching prompts to reference company-specific data
3. Test: coaching mentions specific packages when configured

### PHASE 12: Integration Testing
Run through complete user flows:
1. New org setup wizard → configure products
2. Create team → add members
3. Agent starts course → completes scenarios → earns badge
4. Manager views team compliance
5. Practice tracking works correctly

---

## Key Files to Reference

From the IMPLEMENTATION_GUIDE.md:
- SQL migrations and seed data
- Complete API route code
- Complete frontend component code
- Testing checklist

From the existing codebase:
- `api/lib/auth.js` - Authentication middleware
- `api/lib/supabase.js` - Database client
- `client/src/context/AuthContext.jsx` - Auth context
- `server/services/claude.js` - Existing Claude integration

---

## Testing Strategy

For each phase:
1. **Unit test** the new code in isolation
2. **Integration test** with related components
3. **Verify** database state is correct
4. **Check** no regressions in existing features

Use these verification methods:
- API: Use curl or the existing frontend
- Database: Run SQL queries in Supabase
- Frontend: Manual testing in browser

---

## Error Handling

If you encounter errors:
1. Read the full error message
2. Check the IMPLEMENTATION_GUIDE.md for the correct specification
3. Fix the issue
4. Re-test before proceeding

Common issues:
- Missing foreign key references → Check table creation order
- RLS blocking queries → Verify policies are correct
- Import errors → Check file paths and exports
- Type errors → Verify request/response shapes

---

## Completion Criteria

The project is complete when:
1. All database tables exist with seed data
2. All API endpoints return correct data
3. Agent dashboard shows practice progress
4. Manager dashboard shows team compliance
5. Setup wizard can configure products
6. Courses can be started and completed
7. Badges are awarded on course completion
8. Practice requirements are tracked
9. Coaching includes product-specific feedback
10. All tests in TESTING_CHECKLIST.md pass

---

## Begin Implementation

Start with Phase 1: Database Schema & Seed Data.

Read the IMPLEMENTATION_GUIDE.md file first, then execute the SQL migrations in Supabase.
