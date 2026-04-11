# Polish to Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the CSR Training Simulator from "developer prototype" to "enterprise SaaS worth millions" — every detail polished to match XRAI's level of craft.

**Architecture:** 15 focused tasks across 5 phases. Each task is independently shippable. No structural changes — purely visual/UX polish applied to the existing codebase.

**Tech Stack:** Tailwind CSS, React, Lucide React, Framer Motion, CSS variables

**Reference:** XRAI Hub (xrailabs.ai) — the gold standard we're matching.

---

## Phase 1: Brand & Identity

### Task 1: Product Brand in Sidebar

**Files:**
- Modify: `client/src/components/Layout.jsx`

- [ ] **Step 1: Read Layout.jsx and find the logo/brand section at the top of the sidebar**

- [ ] **Step 2: Replace the phone icon + "CSR Training" with proper product branding**

Replace the current logo section with:
```jsx
<div className="h-14 flex items-center px-4 border-b border-border">
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
      <Phone className="w-3.5 h-3.5 text-white" />
    </div>
    <span className="text-base font-semibold text-foreground tracking-tight">SellEveryCall</span>
  </div>
</div>
```

- [ ] **Step 3: Add section group labels to the nav**

Group the nav items with uppercase section labels like XRAI does:

```jsx
{/* Section label */}
<div className="px-4 pt-6 pb-2">
  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Training</span>
</div>
```

Add labels:
- **Training** — Dashboard, Practice, Courses, Certificates
- **Management** — My Assignments, Assign Training, Reports, Performance Trends, Leaderboard
- **Settings** — Setup Wizard, Content Studio, Settings

- [ ] **Step 4: Style active nav item with left accent bar**

Replace the current active bg-color with XRAI's pattern — a 2px left border accent:

Active: `border-l-2 border-primary-500 bg-accent text-foreground font-medium`
Inactive: `border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground`

- [ ] **Step 5: Verify build and commit**

```bash
cd client && npm run build
git add client/src/components/Layout.jsx
git commit -m "Polish sidebar — SellEveryCall brand, section labels, accent bar active state"
```

---

### Task 2: Update Page Title + Meta

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Update the HTML title and meta**

```html
<title>SellEveryCall</title>
<meta name="description" content="AI-powered CSR training platform — practice real calls, get coached by AI, close more sales." />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 2: Create a simple favicon**

Create `client/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#g)"/>
  <path d="M10 12c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v5a2 2 0 01-2 2h-2l-3 3v-3h-3a2 2 0 01-2-2v-5z" fill="white" opacity="0.9"/>
</svg>
```

- [ ] **Step 3: Commit**

```bash
git add client/index.html client/public/favicon.svg
git commit -m "Update brand — SellEveryCall title, favicon, meta description"
```

---

## Phase 2: Loading & Empty States

### Task 3: Skeleton Loading Component

**Files:**
- Create: `client/src/components/ui/Skeleton.jsx`

- [ ] **Step 1: Create the Skeleton component**

```jsx
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border px-6 py-3 flex gap-8">
        {Array(cols).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-8 border-b border-border last:border-0">
          {Array(cols).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 3 }) {
  return (
    <div className="space-y-3">
      {Array(items).fill(0).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/Skeleton.jsx
git commit -m "Add skeleton loading components — card, table, list variants"
```

---

### Task 4: Empty State Component

**Files:**
- Create: `client/src/components/ui/EmptyState.jsx`

- [ ] **Step 1: Create the EmptyState component**

```jsx
export default function EmptyState({ icon: Icon, title, description, action, actionLabel, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace hardcoded empty states across key pages**

Search for patterns like "No team members found", "No scenarios", "No data", etc. across all pages. Replace with the EmptyState component.

Key pages to update:
- ManagerDashboard.jsx — "No team members found" in compliance grid
- Courses.jsx — empty course list
- Assignments.jsx / MyAssignments.jsx — no assignments
- Leaderboard.jsx — no data
- Reports.jsx — no data
- SessionHistory.jsx — no sessions

For each, import EmptyState and replace the bare text with:
```jsx
<EmptyState
  icon={Users}
  title="No team members yet"
  description="Add team members to start tracking training compliance"
  action={() => navigate('/settings/team')}
  actionLabel="Add Team Members"
/>
```

Use contextually appropriate icons, titles, descriptions, and actions for each page.

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Add EmptyState component, replace bare 'No data' text across all pages"
```

---

## Phase 3: Typography & Numbers

### Task 5: Section Headers — Uppercase Tracking

**Files:**
- Modify: Multiple page files

- [ ] **Step 1: Find all section headers that need the XRAI treatment**

Search for `<h2`, `<h3` and section header patterns across pages. These should follow the XRAI pattern:
```jsx
<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
  Key Metrics
</h2>
```

Update section headers on:
- ManagerDashboard.jsx — "Practice Compliance Grid", "Recent Team Sessions", "Quick Actions"
- AgentDashboard.jsx — section headers
- Reports.jsx — section headers
- Settings.jsx — section headers
- ContentStudio.jsx — tab section headers

Don't change page titles (h1) — those stay as `text-2xl font-semibold text-foreground tracking-tight`.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Polish section headers — uppercase tracking-wider like XRAI"
```

---

### Task 6: Number Formatting

**Files:**
- Create: `client/src/utils/format.js`
- Modify: Dashboard pages

- [ ] **Step 1: Create formatting utilities**

```javascript
export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(n, decimals = 0) {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatScore(score) {
  if (score === null || score === undefined) return '—';
  return Math.round(score).toString();
}
```

- [ ] **Step 2: Add tabular-nums to KPI/stat values**

Find all large number displays (text-2xl, text-3xl, text-4xl with numeric values) across dashboard pages. Add `tabular-nums` to their className:

```jsx
<span className="text-3xl font-bold text-foreground tabular-nums">
  {formatNumber(value)}
</span>
```

Key pages: ManagerDashboard, AgentDashboard, Reports, ROIDashboard, PerformanceTrends

- [ ] **Step 3: Apply formatNumber to raw numbers displayed in the UI**

Replace instances of `{someNumber}` with `{formatNumber(someNumber)}` where numbers are displayed as text.

- [ ] **Step 4: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Add number formatting — tabular-nums, proper separators, consistent display"
```

---

## Phase 4: Card & Component Consistency

### Task 7: Consistent Card Pattern

**Files:**
- Modify: Multiple page files

- [ ] **Step 1: Audit and standardize card classes**

Search for all card-like elements across the codebase. Standardize to ONE pattern:

**Standard card:**
```
bg-card border border-border rounded-lg p-6
```

**Interactive card (clickable):**
```
bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow cursor-pointer
```

Replace all variations:
- `rounded-xl` → `rounded-lg` on cards
- `rounded-2xl` → `rounded-lg` on cards
- Missing `border border-border` → add it
- Inconsistent padding (p-3, p-4, p-5, p-8) → standardize to `p-6` for main cards, `p-4` for compact cards

- [ ] **Step 2: Remove excessive card decorations**

Remove from cards:
- `backdrop-blur-*` classes
- `shadow-glow`, `shadow-glow-lg`
- `bg-gradient-*` card backgrounds (keep content gradients)
- Excessive hover effects (`hover:border-primary-500`, `hover:shadow-lg`, etc.)

Replace with the clean: `hover:shadow-sm transition-shadow`

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Standardize cards — consistent radius, padding, borders, remove decorative effects"
```

---

### Task 8: Button Consistency

**Files:**
- Modify: Multiple files

- [ ] **Step 1: Standardize primary button pattern**

Every primary action button should use:
```
px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity
```

This matches XRAI's primary button — dark in light mode, light in dark mode. Clean.

For secondary buttons:
```
px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-accent transition-colors
```

For destructive:
```
px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity
```

- [ ] **Step 2: Find and replace inconsistent button patterns**

Search for common button patterns:
- `bg-blue-600 hover:bg-blue-700 text-white` → primary pattern
- `bg-primary-600 hover:bg-primary-700 text-white` → primary pattern
- `bg-green-600 hover:bg-green-700 text-white` → keep for explicit "success" actions only
- `rounded-lg` on buttons → `rounded-md`
- `py-3` or `py-1` → `py-2` for consistency
- `font-bold` on buttons → `font-medium`

- [ ] **Step 3: Remove the old .btn-* classes from CSS**

The old `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success` classes in index.css can be removed — buttons should use inline Tailwind classes.

- [ ] **Step 4: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Standardize buttons — consistent size, radius, hover behavior"
```

---

### Task 9: Input & Form Consistency

**Files:**
- Modify: Multiple files

- [ ] **Step 1: Standardize input pattern**

Every text input, select, and textarea should use:
```
w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

This matches XRAI's input style — clean border, subtle focus ring, proper placeholder color.

- [ ] **Step 2: Search for inconsistent input styling**

Look for:
- `bg-input` (correct) vs `bg-card` or `bg-muted` on inputs (wrong)
- Missing focus ring styles
- `rounded-lg` on inputs → `rounded-md`
- Inconsistent padding

- [ ] **Step 3: Standardize form labels**

Labels should be:
```
text-sm font-medium text-foreground mb-1.5
```

- [ ] **Step 4: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Standardize inputs and forms — consistent borders, focus rings, labels"
```

---

## Phase 5: Micro-interactions & Final Polish

### Task 10: Page Transitions

**Files:**
- Modify: `client/src/components/Layout.jsx`

- [ ] **Step 1: Ensure the page transition animation is clean and subtle**

The current Layout has a framer-motion page transition. Verify it uses:
```jsx
<motion.div
  key={location.pathname}
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15, ease: 'easeOut' }}
>
```

If the values are different (e.g., y: 20, duration: 0.3), update to be more subtle. XRAI uses `y: 4` and `150ms` — fast, barely noticeable, but makes navigation feel smooth.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Layout.jsx
git commit -m "Refine page transition — subtle 150ms fade-slide"
```

---

### Task 11: Table Polish

**Files:**
- Modify: Table components across pages

- [ ] **Step 1: Find all table/data-grid components**

```bash
grep -rn "<table\|<thead\|<th\|<tbody" client/src/ --include="*.jsx" | head -20
```

- [ ] **Step 2: Apply XRAI table styling**

Table headers:
```
text-xs font-medium text-muted-foreground uppercase tracking-wider
```

Table rows:
```
border-b border-border hover:bg-accent transition-colors
```

Row hover accent bar (XRAI signature):
```
border-l-2 border-l-transparent hover:border-l-primary-500
```

Table cells:
```
px-6 py-3 text-sm text-foreground
```

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Polish tables — uppercase headers, accent hover bar, consistent cell padding"
```

---

### Task 12: Toast Notifications

**Files:**
- Modify: `client/src/components/ui/Toast.jsx` (or create if using raw alerts)

- [ ] **Step 1: Ensure toasts are minimal and elegant**

Toast pattern:
```jsx
<div className="bg-card border border-border rounded-md shadow-lg px-4 py-3 flex items-center gap-3">
  <Icon className="w-4 h-4 text-{statusColor}" />
  <span className="text-sm text-foreground">{message}</span>
</div>
```

No chunky backgrounds, no large icons, no excessive padding.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/Toast.jsx
git commit -m "Polish toast notifications — minimal, elegant design"
```

---

### Task 13: Breadcrumbs

**Files:**
- Create: `client/src/components/ui/Breadcrumbs.jsx`
- Modify: `client/src/components/Layout.jsx`

- [ ] **Step 1: Create Breadcrumbs component**

```jsx
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ROUTE_LABELS = {
  'dashboard': 'Dashboard',
  'scenarios': 'Practice',
  'courses': 'Courses',
  'certificates': 'Certificates',
  'my-assignments': 'My Assignments',
  'assignments': 'Assign Training',
  'reports': 'Reports',
  'analytics': 'Analytics',
  'performance': 'Performance Trends',
  'leaderboard': 'Leaderboard',
  'settings': 'Settings',
  'studio': 'Content Studio',
  'setup': 'Setup Wizard',
  'results': 'Results',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 px-6 py-2 text-xs text-muted-foreground border-b border-border/50">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">Home</Link>
      {segments.map((seg, i) => {
        const label = ROUTE_LABELS[seg] || seg;
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;

        return (
          <span key={seg} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Add Breadcrumbs to Layout**

In Layout.jsx, add `<Breadcrumbs />` between the header and main content area.

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Add breadcrumbs navigation — route-aware with proper labels"
```

---

### Task 14: Remove Floating Chat Bubble

**Files:**
- Modify: `client/src/components/Layout.jsx`

- [ ] **Step 1: Find and remove or hide the HelpAgent floating button**

The floating chat bubble covers content and looks like a template widget. Either:
- Remove the `<HelpAgent />` component from Layout entirely, OR
- If it provides real functionality, restyle it to be less intrusive — make it smaller, move it to a header icon instead of a floating bubble

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Layout.jsx
git commit -m "Remove floating chat bubble — clean up visual clutter"
```

---

### Task 15: Final Consistency Pass

**Files:**
- Modify: Multiple files

- [ ] **Step 1: Global search and fix remaining `rounded-xl` on cards**

```bash
grep -rn "rounded-xl" client/src/ --include="*.jsx" | wc -l
```

Replace `rounded-xl` with `rounded-lg` on all card-like elements. Keep `rounded-xl` only on avatars and the landing page hero elements.

- [ ] **Step 2: Fix any remaining hardcoded gray classes**

```bash
grep -rn "bg-gray-\|text-gray-\|border-gray-" client/src/ --include="*.jsx" | wc -l
```

If any remain, replace with CSS variable equivalents.

- [ ] **Step 3: Ensure consistent spacing**

Page content containers should use `px-6 py-6` or `p-6`. Check that main content areas aren't using inconsistent padding values.

- [ ] **Step 4: Verify build and commit**

```bash
cd client && npm run build
git add client/src/
git commit -m "Final consistency pass — rounded-lg, spacing, remaining hardcoded colors"
```

---

## Summary

| Phase | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1: Brand | 1-2 | SellEveryCall identity, favicon, sidebar sections, active accent bar |
| 2: States | 3-4 | Skeleton loaders, designed empty states with CTAs |
| 3: Typography | 5-6 | XRAI section headers, proper number formatting, tabular-nums |
| 4: Components | 7-9 | Consistent cards, buttons, inputs across entire app |
| 5: Polish | 10-15 | Page transitions, table design, breadcrumbs, remove clutter, final pass |

**Total: 15 tasks, ~30 files touched, zero functional changes — pure visual/UX polish.**
