# UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ad-hoc Tailwind color system with XRAI's clean CSS variable design system — Geist font, HSL variables, light/dark theme support defaulting to light.

**Architecture:** Install Geist font, rewrite tailwind.config.js with CSS variable color mappings (shadcn pattern), replace the 580-line hack CSS with clean variable blocks, update ThemeContext to default to light.

**Tech Stack:** Tailwind CSS, CSS custom properties (HSL), Geist font npm package

**Spec:** `docs/superpowers/specs/2026-04-10-ui-foundation-design.md`

---

## File Structure

| File | Change |
|------|--------|
| `client/package.json` | Add `geist` dependency |
| `client/tailwind.config.js` | Full rewrite — CSS variable color mappings, Geist font, radius |
| `client/src/styles/index.css` | Full rewrite — HSL variable blocks, clean base styles, keep only essential component classes |
| `client/src/context/ThemeContext.jsx` | Update default from system-preference to 'light' |
| `client/src/main.jsx` | Add Geist font import |

---

## Task 1: Install Geist Font

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install geist**

```bash
cd client && npm install geist
```

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "Add geist font package"
```

---

## Task 2: Rewrite Tailwind Config

**Files:**
- Modify: `client/tailwind.config.js`

- [ ] **Step 1: Replace tailwind.config.js with CSS variable mappings**

Write the complete new config. Keep `darkMode: 'class'`, keep existing animation keyframes, add CSS variable color mappings matching XRAI's shadcn pattern, set Geist as default font, add border-radius variables.

Key: preserve the existing `primary-50` through `primary-900` scale AND add the new semantic colors. This ensures existing components don't break while new code uses the clean pattern.

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/tailwind.config.js
git commit -m "Rewrite Tailwind config — XRAI CSS variable color system, Geist font"
```

---

## Task 3: Rewrite Global CSS

**Files:**
- Modify: `client/src/styles/index.css`

- [ ] **Step 1: Replace index.css**

The new CSS should contain:
1. Tailwind directives (@tailwind base/components/utilities)
2. `:root` block with all light-mode HSL variables (from XRAI)
3. `.dark` block with all dark-mode HSL variables (from XRAI)
4. `@layer base` with body styles using CSS variables, scrollbar styles, html scroll-behavior
5. `@layer components` — keep ONLY the essential component classes that are widely used (badge-easy/medium/hard, score-ring, pulse-recording, waveform-bar). Remove all `.light` override hacks.
6. `@layer utilities` — focus-ring utility, scrollbar-hide, line-clamp utilities
7. The massive `.light .bg-gray-*` override blocks get DELETED — CSS variables handle theming automatically

The body should use: `bg-background text-foreground font-sans antialiased`

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/styles/index.css
git commit -m "Rewrite global CSS — clean HSL variables, remove 400+ lines of light mode hacks"
```

---

## Task 4: Update ThemeContext + Font Import

**Files:**
- Modify: `client/src/context/ThemeContext.jsx`
- Modify: `client/src/main.jsx`

- [ ] **Step 1: Update ThemeContext default to 'light'**

Change the initial state logic: if no stored preference, default to `'light'` instead of checking system preference.

- [ ] **Step 2: Add Geist font import to main.jsx**

Add at the top of main.jsx:
```javascript
import 'geist/font/sans.css';
```

- [ ] **Step 3: Verify build and visual check**

```bash
cd client && npm run build
```

Start the dev server and verify the app loads with Geist font and light mode default.

- [ ] **Step 4: Commit**

```bash
git add client/src/context/ThemeContext.jsx client/src/main.jsx
git commit -m "Default to light theme, load Geist font"
```

---

## Task 5: Visual Verification

- [ ] **Step 1: Start dev server and check key pages**

Verify in browser:
- Landing page loads with Geist font
- Dashboard renders in light mode by default
- Toggle to dark mode works
- Content Studio page loads
- No broken colors or invisible text

- [ ] **Step 2: Push to production**

```bash
git push origin master
```

---

## Summary

| Task | What It Does |
|------|-------------|
| 1 | Install Geist font |
| 2 | Rewrite Tailwind config with CSS variable colors |
| 3 | Rewrite CSS — clean variables, delete 400+ lines of hacks |
| 4 | Default to light theme, import font |
| 5 | Visual verification and deploy |
