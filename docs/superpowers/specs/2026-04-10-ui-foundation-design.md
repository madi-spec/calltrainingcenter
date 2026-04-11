# UI Foundation Redesign — Design Specification

> Port the XRAI design system (Geist font, HSL CSS variables, light/dark theming) to the CSR Training Simulator. Foundation layer only — no page-level changes.

## Problem

The CSR Training Simulator uses hardcoded Tailwind color classes (bg-gray-800, text-gray-400, etc.), system default fonts, and is dark-mode-only. It looks like a developer prototype, not a polished product. XRAI Hub (xrailabs.ai) uses a clean, minimal design system with Geist font, HSL CSS variables, and light/dark theme support. The training app needs to match.

## Solution

Replace the styling foundation:
1. Tailwind config → shadcn/ui CSS variable pattern
2. Global CSS → HSL variables for light and dark themes
3. Font → Geist (matching XRAI)
4. Theme → localStorage-persisted light/dark toggle, default light
5. Scrollbars, focus rings, transitions → match XRAI polish

## Design Reference

Full design system extracted from live XRAI site and xforce-omnichannel-platform codebase. See `docs/design-reference.md` for complete values.

---

## Tailwind Config Changes

Replace the current `tailwind.config.js` color/theme section with CSS variable mappings:

```javascript
colors: {
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },
  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },
  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))',
  },
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
  sidebar: {
    DEFAULT: 'hsl(var(--sidebar-background))',
    foreground: 'hsl(var(--sidebar-foreground))',
    primary: 'hsl(var(--sidebar-primary))',
    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    accent: 'hsl(var(--sidebar-accent))',
    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    border: 'hsl(var(--sidebar-border))',
    ring: 'hsl(var(--sidebar-ring))',
  },
  chart: {
    1: 'hsl(var(--chart-1))',
    2: 'hsl(var(--chart-2))',
    3: 'hsl(var(--chart-3))',
    4: 'hsl(var(--chart-4))',
    5: 'hsl(var(--chart-5))',
  },
}
```

Border radius: `borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' }`

Font family: `fontFamily: { sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'] }`

Keep existing Tailwind gray/blue/green/red/yellow/purple scales available for backward compatibility during migration — existing pages use them directly. They'll be phased out in sub-project 4.

---

## CSS Variables

### Light Mode (:root)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.5rem;
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 0 0% 3.9%;
  --sidebar-primary: 0 0% 9%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 0 0% 96.1%;
  --sidebar-accent-foreground: 0 0% 9%;
  --sidebar-border: 0 0% 89.8%;
  --sidebar-ring: 0 0% 3.9%;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
}
```

### Dark Mode (.dark)
```css
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  --secondary: 0 0% 14.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 14.9%;
  --muted-foreground: 0 0% 63.9%;
  --accent: 0 0% 14.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;
  --input: 0 0% 14.9%;
  --ring: 0 0% 83.1%;
  --sidebar-background: 0 0% 3.9%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-primary: 0 0% 98%;
  --sidebar-primary-foreground: 0 0% 9%;
  --sidebar-accent: 0 0% 14.9%;
  --sidebar-accent-foreground: 0 0% 98%;
  --sidebar-border: 0 0% 14.9%;
  --sidebar-ring: 0 0% 83.1%;
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
```

---

## Font Loading

Install the `geist` npm package in client/ and import in main.jsx:
```javascript
import 'geist/font/sans.css';
```

This loads the Geist font with all required weights (400, 500, 600, 700).

---

## Theme Provider

New file: `client/src/context/ThemeContext.jsx`

- Store theme preference in localStorage key `csr-theme`
- Default to `'light'`
- Add/remove `dark` class on `document.documentElement`
- Expose `{ theme, setTheme, toggleTheme }` via React context
- Check `prefers-color-scheme` on first load if no stored preference

Wrap the app in ThemeProvider in main.jsx.

---

## Global Base Styles

```css
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted)) transparent;
}

*::-webkit-scrollbar { width: 6px; height: 6px; }
*::-webkit-scrollbar-thumb { background-color: hsl(var(--muted)); border-radius: 3px; }
*::-webkit-scrollbar-thumb:hover { background-color: hsl(var(--muted-foreground)); }

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Utility Classes

```css
@layer utilities {
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
}
```

---

## What This Does NOT Change

- No page-level component changes (Layout, Dashboard, Courses, etc.)
- No React component API changes
- No routing changes
- Existing hardcoded Tailwind classes (bg-gray-800, etc.) continue to work — they'll be migrated in later sub-projects
- The app will look slightly different after this (font change, some base color shifts) but nothing breaks

## Files Changed

| File | Change |
|------|--------|
| `client/tailwind.config.js` | Replace color/radius/font config with CSS variable mappings |
| `client/src/styles/index.css` | Add CSS variable blocks, scrollbar styles, base styles |
| `client/src/context/ThemeContext.jsx` | New — theme provider with localStorage persistence |
| `client/src/main.jsx` | Wrap app in ThemeProvider, import Geist font |
| `client/package.json` | Add `geist` dependency |
