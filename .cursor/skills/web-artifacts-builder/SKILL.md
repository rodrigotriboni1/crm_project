---
name: web-artifacts-builder
description: "Suite for elaborate claude.ai HTML artifacts (React, Tailwind, shadcn/ui). For complex state/routing UIs, not trivial single-file demos. Pair with brand-guidelines for Anthropic-aligned palette and typography."
license: Complete terms in LICENSE.txt
---

# Web Artifacts Builder

To build **polished** frontend claude.ai artifacts (the kind that feel **designed**, not templated), follow these steps:

1. Initialize the frontend repo using `scripts/init-artifact.sh`
2. **Apply visual system** — load **`brand-guidelines`** for colors, type, and spacing rules (Tailwind/CSS variables + fonts)
3. Develop your artifact by editing the generated code
4. Bundle all code into a single HTML file using `scripts/bundle-artifact.sh`
5. Share the artifact with the user
6. (Optional) Test only if requested or if something breaks

**Stack**: React 18 + TypeScript + Vite + Parcel (bundling) + Tailwind CSS + shadcn/ui

---

## UI / UX quality (high bar)

Goals: **clear hierarchy**, **intentional layout**, **tactile but calm** surfaces — similar to strong Claude artifact demos.

### Layout

- Prefer **asymmetry and grid** (sidebar + main, bento-style sections, offset hero) over **everything centered** in one column.
- Use **consistent spacing scale** (e.g. 4/8/12/16/24/32px or Tailwind defaults) — don’t randomize margins.
- **Max width** for reading (prose ~65ch); let dashboards use full width with clear columns.

### Typography

- **Do not** default everything to **Inter** or a single generic sans — use a **distinct pairing** (see **`brand-guidelines`**: Poppins headings + Lora body for Anthropic-aligned work).
- **Scale**: obvious size steps between `h1` → body → captions; use **weight** (600/700) for headings, regular for body.

### Color & chrome

- **Avoid “AI slop”**: excessive **purple/indigo gradients**, **neon glows**, **uniform rounded-2xl** on every card, **floating blobs** with no purpose.
- **One accent discipline**: one primary accent per view (CTA, links, key metrics) — see brand skill for **orange / blue / green** usage.
- Prefer **borders and subtle fills** (`#e8e6dc`-style surfaces) over heavy drop shadows; if you use shadow, keep it **soft and single**.

### Components & states

- **Loading**: skeletons or concise spinners — never a blank white screen.
- **Empty**: short message + one clear action (e.g. “Nenhum item — adicionar”).
- **Errors**: human-readable, optional retry; don’t only `console.error`.
- **Focus**: visible **focus rings** for keyboard (accessibility = quality).

### Motion

- Subtle transitions (150–200ms) on hover/focus; **no** constant parallax or distracting animation loops unless the artifact is *about* motion.

---

## Design synergy with `brand-guidelines`

Before writing UI:

1. Open **`brand-guidelines`** and copy **Web tokens** (CSS variables + Google Fonts + optional Tailwind `theme.extend`).
2. Wire shadcn **CSS variables** (`--background`, `--foreground`, `--primary`, `--muted`, `--border`) to those tokens so dialogs/tables match the page.
3. After bundle, the single HTML should still load fonts from **Google Fonts** (or self-host if you change the workflow).

This keeps artifacts **on-brand** and **visually consistent** with Anthropic-style cream/dark palettes when the user wants that look.

---

## Quick Start

### Step 1: Initialize Project

Run the initialization script to create a new React project:

```bash
bash scripts/init-artifact.sh <project-name>
cd <project-name>
```

This creates a fully configured project with:

- ✅ React + TypeScript (via Vite)
- ✅ Tailwind CSS 3.4.1 with shadcn/ui theming system
- ✅ Path aliases (`@/`) configured
- ✅ 40+ shadcn/ui components pre-installed
- ✅ All Radix UI dependencies included
- ✅ Parcel configured for bundling (via .parcelrc)
- ✅ Node 18+ compatibility (auto-detects and pins Vite version)

**Right after init**: add fonts + CSS variables per **`brand-guidelines`** (Web section) in `index.html` and global styles.

### Step 2: Develop Your Artifact

Edit the generated files. Suggested focus order:

1. **Shell**: layout, nav, background, typography base  
2. **Content**: real copy and realistic data density (not lorem-only)  
3. **Components**: shadcn primitives; customize variants to match tokens  
4. **Polish**: spacing pass, focus states, empty/loading

### Step 3: Bundle to Single HTML File

```bash
bash scripts/bundle-artifact.sh
```

This creates `bundle.html` — self-contained JS/CSS inlined for Claude artifacts.

**Requirements**: `index.html` in the project root.

**What the script does**:

- Installs bundling dependencies (parcel, @parcel/config-default, parcel-resolver-tspaths, html-inline)
- Creates `.parcelrc` with path alias support
- Builds with Parcel (no source maps)
- Inlines assets with html-inline

### Step 4: Share Artifact with User

Share `bundle.html` (or paste path) so the user can open it as an artifact.

### Step 5: Testing (optional)

Only if necessary or requested. Prefer shipping first; test after if issues appear. Playwright/Puppeteer or other skills are fine.

---

## Reference

- **shadcn/ui**: https://ui.shadcn.com/docs/components  
- **`brand-guidelines`**: Anthropic colors, type, Tailwind/CSS snippets for this stack  
