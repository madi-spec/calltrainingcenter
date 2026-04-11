# XRAI Design System Reference

Extracted from live xrailabs.ai and xforce-omnichannel-platform codebase.

## Font
- **Family:** Geist (with "Geist Fallback")
- **Weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Base size:** 16px

## CSS Variables (HSL format — shadcn/ui pattern)

### Light Mode (:root)
```
--background: 0 0% 100%          /* white */
--foreground: 0 0% 3.9%          /* near-black #0a0a0a */
--card: 0 0% 100%                /* white */
--card-foreground: 0 0% 3.9%
--popover: 0 0% 100%
--popover-foreground: 0 0% 3.9%
--primary: 0 0% 9%               /* dark gray #171717 */
--primary-foreground: 0 0% 98%   /* near-white */
--secondary: 0 0% 96.1%          /* light gray #f5f5f5 */
--secondary-foreground: 0 0% 9%
--muted: 0 0% 96.1%
--muted-foreground: 0 0% 45.1%   /* mid gray #737373 */
--accent: 0 0% 96.1%
--accent-foreground: 0 0% 9%
--destructive: 0 84.2% 60.2%     /* red */
--destructive-foreground: 0 0% 98%
--border: 0 0% 89.8%             /* #e5e5e5 */
--input: 0 0% 89.8%
--ring: 0 0% 3.9%
--radius: 0.5rem
--sidebar-background: 0 0% 98%   /* #fafafa */
--sidebar-foreground: 0 0% 3.9%
--sidebar-primary: 0 0% 9%
--sidebar-primary-foreground: 0 0% 98%
--sidebar-accent: 0 0% 96.1%
--sidebar-accent-foreground: 0 0% 9%
--sidebar-border: 0 0% 89.8%
--sidebar-ring: 0 0% 3.9%
--chart-1: 12 76% 61%
--chart-2: 173 58% 39%
--chart-3: 197 37% 24%
--chart-4: 43 74% 66%
--chart-5: 27 87% 67%
```

### Dark Mode (.dark)
```
--background: 0 0% 3.9%          /* #0a0a0a */
--foreground: 0 0% 98%           /* #fafafa */
--card: 0 0% 3.9%
--card-foreground: 0 0% 98%
--popover: 0 0% 3.9%
--popover-foreground: 0 0% 98%
--primary: 0 0% 98%
--primary-foreground: 0 0% 9%
--secondary: 0 0% 14.9%          /* #262626 */
--secondary-foreground: 0 0% 98%
--muted: 0 0% 14.9%
--muted-foreground: 0 0% 63.9%   /* #a3a3a3 */
--accent: 0 0% 14.9%
--accent-foreground: 0 0% 98%
--destructive: 0 62.8% 30.6%
--destructive-foreground: 0 0% 98%
--border: 0 0% 14.9%             /* #262626 */
--input: 0 0% 14.9%
--ring: 0 0% 83.1%
--sidebar-background: 0 0% 3.9%
--sidebar-foreground: 0 0% 98%
--sidebar-primary: 0 0% 98%
--chart-1: 220 70% 50%
--chart-2: 160 60% 45%
--chart-3: 30 80% 55%
--chart-4: 280 65% 60%
--chart-5: 340 75% 55%
```

## Typography Scale (from live site)
| Element | Size | Weight | Color (light) | Classes |
|---------|------|--------|---------------|---------|
| Page title | 24px | 600 | foreground | text-2xl font-semibold |
| Section header | 14px | 500 | gray-600 | text-sm font-medium uppercase tracking-wider |
| Card title | 16px | 500 | gray-900 | text-base font-medium |
| Body text | 14px | 400 | foreground | text-sm |
| Muted text | 12px | 400 | gray-500 | text-xs text-gray-500 |
| KPI value | 28px | 700 | foreground | text-[28px] font-bold |
| Badge | 12px | 500 | varies | text-xs font-medium |
| Nav label | 14px | 500 | foreground | text-sm font-medium |
| Section group | 12px | 600 | gray-400 | text-xs font-semibold uppercase |

## Color Palette (actual computed RGB)
| Usage | Light | Dark |
|-------|-------|------|
| Body bg | rgb(255,255,255) | rgb(10,10,10) |
| Body text | rgb(10,10,10) | rgb(250,250,250) |
| Sidebar bg | rgb(250,250,250) | rgb(10,10,10) |
| Border | rgb(229,229,229) | rgb(38,38,38) |
| Section header | rgb(75,85,99) | rgb(156,163,175) |
| Muted text | rgb(107,114,128) | rgb(163,163,163) |
| Badge (admin) | bg: rgba(243,232,255,0.8), text: rgb(107,33,168), border: rgba(233,213,255,0.6) |

## Component Patterns

### Buttons
- border-radius: 6px (rounded-md)
- text-sm font-medium
- transition-all
- disabled:pointer-events-none disabled:opacity-50
- Variants: default (outline), primary (filled), ghost (no border)

### Badges
- rounded-md border px-2.5 py-0.5 text-xs font-medium
- Color variants use alpha backgrounds: bg-{color}/10 text-{color} border-{color}/20

### Cards/Sections
- White bg in light, near-black in dark
- border with border color from --border variable
- rounded-lg (8px radius)
- p-4 or p-6 padding

### Sidebar
- bg-sidebar (--sidebar-background)
- Nav items: p-2 rounded-md
- Active: bg-sidebar-accent
- Section groups: text-xs font-semibold uppercase text-gray-400
- Collapsible with chevron toggles

### Header
- Height: 3.5rem (56px / h-14)
- Border bottom
- Contains: sidebar toggle, breadcrumbs/title, company selector, user avatar

## Key Differences from Current CSR Training Sim
1. Font: Geist instead of system default
2. Color system: HSL CSS variables (shadcn pattern) instead of hardcoded Tailwind classes
3. Light mode default (currently dark-only)
4. Neutral gray ramp (not blue-tinted)
5. 6px border radius default (not rounded-lg everywhere)
6. Section headers: uppercase tracking-wider text-sm text-gray-600
7. Cleaner, more minimal aesthetic — less color, more whitespace
8. Sidebar uses shadcn sidebar component pattern
