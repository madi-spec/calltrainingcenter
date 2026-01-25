# CSR Training Simulator - Gap Analysis

## Summary

**Last Updated:** January 25, 2026

Comparing the IMPLEMENTATION_GUIDE.md requirements against the current codebase. Most features are now working after running database migrations and fixing navigation.

### Recently Fixed:
- Courses navigation link added
- Database migrations run (courses, customer profiles, etc.)
- Create Assignment form implemented

---

## Status Legend
- **DONE** - Fully implemented and working
- **PARTIAL** - Code exists but incomplete or not functional
- **MISSING** - Not implemented at all

---

## Phase-by-Phase Analysis

### Phase 1: Database Schema & Seed Data - PARTIAL

| Item | Status | Issue |
|------|--------|-------|
| Tables created | UNKNOWN | Migration files exist but unclear if run in Supabase |
| Seed data loaded | MISSING | No courses, customer profiles, objection templates in database |

**Required Action:** Run migrations in Supabase SQL Editor:
1. Run `supabase-migrations/001_schema.sql`
2. Run `supabase-migrations/002_seed_data.sql`
3. Verify with `supabase-migrations/003_verify.sql`

**Why courses are empty:** The `courses` table has no data. The system courses need to be seeded.

---

### Phase 2: Product Configuration API - DONE

| Endpoint | Status |
|----------|--------|
| `/api/products/service-categories` | DONE |
| `/api/products/pest-types` | DONE |
| `/api/products/packages` | DONE |
| `/api/products/competitors` | DONE |
| `/api/products/context` | DONE |

File: `api/routes/products.js` exists and is complete.

---

### Phase 3: Teams API - DONE

| Endpoint | Status |
|----------|--------|
| `/api/teams` CRUD | DONE |
| `/api/teams/:id/members` | DONE |
| `/api/teams/:id/stats` | DONE |

File: `api/routes/teams.js` exists and is complete.

---

### Phase 4: Courses & Modules API - DONE

| Endpoint | Status |
|----------|--------|
| `/api/courses` | DONE |
| `/api/courses/:id` | DONE |
| `/api/courses/:id/start` | DONE |
| `/api/modules/:id` | DONE |
| `/api/modules/:id/start` | DONE |

Files exist: `api/routes/courses.js`, `api/routes/modules.js`

**Issue:** API works but returns empty because database has no seed data.

---

### Phase 5: Scenario Generator Service - MISSING

| Item | Status |
|------|--------|
| `api/services/scenarioGenerator.js` | MISSING |
| Dynamic scenario generation with Claude | MISSING |
| Customer profile randomization | MISSING |

**Impact:** Courses cannot generate practice scenarios dynamically.

---

### Phase 6: Agent Dashboard - PARTIAL

| Feature | Status | Issue |
|---------|--------|-------|
| Dashboard page | DONE | `client/src/pages/dashboard/Dashboard.jsx` |
| Today's Practice card | DONE | Shows but data may be empty |
| My Courses section | DONE | Empty because no seed data |
| My Badges section | DONE | Works |
| Quick stats | DONE | Works |

---

### Phase 7: Manager Dashboard - DONE

| Feature | Status |
|---------|--------|
| Team compliance grid | DONE |
| Recent sessions | DONE |
| Team stats | DONE |

Manager view is integrated into the main Dashboard component.

---

### Phase 8: Setup Wizard - PARTIAL

| Feature | Status | Issue |
|---------|--------|-------|
| Setup wizard page | DONE | `client/src/pages/setup/SetupWizard.jsx` |
| Company basics step | DONE | |
| Service lines step | PARTIAL | May not save properly |
| Packages step | PARTIAL | |
| Teams step | PARTIAL | |
| Completion marking | UNKNOWN | |

---

### Phase 9: Practice Requirements API - DONE

| Endpoint | Status |
|----------|--------|
| `/api/practice/today` | DONE |
| `/api/practice/week` | DONE |
| `/api/practice/log` | DONE |
| `/api/practice/compliance-overview` | DONE |

File: `api/routes/practice.js` exists.

---

### Phase 10: Integration - PARTIAL

| Item | Status | Issue |
|------|--------|-------|
| Coaching with product context | DONE | `getProductContext()` in index.js |
| Course/module tracking in sessions | PARTIAL | Fields added but not fully used |
| Badge awarding | UNKNOWN | Logic may exist but untested |
| Practice logging after calls | PARTIAL | |

---

## Frontend UI Gaps

### 1. Create Assignment Modal - DONE

**File:** `client/src/pages/assignments/Assignments.jsx`

**Current State:** Fully implemented with:
- Multi-select user checkboxes
- Toggle between Scenario and Course assignment
- Scenario/Course dropdown
- Due date picker
- Notes field
- Submit to `/api/assignments` POST endpoint

---

### 2. Courses Page - DONE

**File:** `client/src/pages/courses/Courses.jsx`

**Current State:** Working! Shows 6 system courses after migrations were run.
- Navigation link added to sidebar
- Courses display with progress tracking

---

### 3. Module Detail Page - UNKNOWN

**File:** `client/src/pages/modules/ModuleDetail.jsx`

**Status:** Needs testing once courses have data

---

## Database Gaps

### Tables That Need Seed Data

| Table | Expected Rows | Current Rows |
|-------|--------------|--------------|
| `service_categories` | 9 | Unknown |
| `pest_types` | ~45 | Unknown |
| `package_templates` | ~15 | Unknown |
| `objection_templates` | ~25 | Unknown |
| `customer_profiles` | 50 | Unknown |
| `courses` | 6 | 0 (empty) |
| `course_modules` | 18 | 0 (empty) |

---

## Critical Missing Features

### 1. Scenario Generator Service
The system was designed to dynamically generate training scenarios using:
- Customer profiles from the database
- Company product context
- Claude AI for personalization

**Impact:** Without this, courses cannot provide varied practice scenarios.

**Files to create:**
- `api/services/scenarioGenerator.js`

### 2. Assignment Creation
Managers cannot assign training to team members.

**Files to update:**
- `client/src/pages/assignments/Assignments.jsx` - Add real form
- `api/routes/assignments.js` - Ensure POST works

### 3. Course Flow Integration
The connection between:
- Starting a course module
- Generating scenarios
- Completing scenarios
- Updating progress
- Earning badges

This flow needs to be tested end-to-end.

---

## Immediate Action Items

### Priority 1: Run Database Migrations
```sql
-- In Supabase SQL Editor, run these files in order:
-- 1. supabase-migrations/001_schema.sql
-- 2. supabase-migrations/002_seed_data.sql
-- 3. supabase-migrations/003_verify.sql
```

### Priority 2: Implement Assignment Creation Form
Update `Assignments.jsx` to have a real form that:
1. Fetches users from `/api/users`
2. Fetches scenarios from `/api/scenarios`
3. POSTs to `/api/assignments`

### Priority 3: Create Scenario Generator
Create `api/services/scenarioGenerator.js` with:
1. `generateScenariosForModule(userId, orgId, module)` function
2. Customer profile selection logic
3. Claude integration for scenario text

### Priority 4: Test Course Flow
Once seed data exists:
1. Navigate to Courses page
2. Click a course
3. Start the course
4. Complete a module
5. Verify progress updates

---

## Summary Table

| Phase | Requirement | Status |
|-------|-------------|--------|
| 1 | Database Schema | DONE |
| 1 | Seed Data | DONE |
| 2 | Product Config API | DONE |
| 3 | Teams API | DONE |
| 4 | Courses API | DONE |
| 5 | Scenario Generator | MISSING |
| 6 | Agent Dashboard | DONE |
| 7 | Manager Dashboard | DONE |
| 8 | Setup Wizard | PARTIAL |
| 9 | Practice API | DONE |
| 10 | Integration | PARTIAL |
| - | Assignment Creation UI | DONE |
| - | Course Navigation | DONE |

---

## Estimated Completion

Once the database migrations are run:
- **70% of features will work** immediately
- **Assignment creation** needs 1-2 hours of UI work
- **Scenario generator** needs 2-4 hours to implement
- **Full testing** needs 2-3 hours

The majority of the code infrastructure is in place. The primary blocker is missing seed data in the database.
