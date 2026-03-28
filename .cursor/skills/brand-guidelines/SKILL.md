---
name: brand-guidelines
description: "Applies Anthropic official brand colors and typography to artifacts (web/React/Tailwind, documents, slides). Use for brand colors, typography, hierarchy, or design standards; pair with web-artifacts-builder for HTML/React bundles."
license: Complete terms in LICENSE.txt
---

# Anthropic Brand Styling

## Overview

Use this skill for **Anthropic’s official brand identity** on any surface: **web artifacts** (HTML, React, Tailwind, shadcn), **documents**, or **slides**.

**Keywords**: branding, corporate identity, visual identity, styling, brand colors, typography, Anthropic brand, visual formatting, visual design, CSS variables, Tailwind theme

**Pairing**: For elaborate **claude.ai-style single-file HTML artifacts**, combine with **`web-artifacts-builder`** — apply the **Web tokens** below in `index.html` / Tailwind config / `globals.css` **before** bundling.

---

## Brand palette (source of truth)

### Main colors

| Token (suggested) | Hex       | Use |
|-------------------|-----------|-----|
| `brand-dark`      | `#141413` | Primary text, dark UI chrome, hero text on light |
| `brand-light`     | `#faf9f5` | Page background on light themes, text on dark |
| `brand-mid-gray`  | `#b0aea5` | Secondary labels, muted icons, dividers |
| `brand-light-gray`| `#e8e6dc` | Cards, sidebars, subtle panels |

### Accent colors (use sparingly — one primary accent per view)

| Token              | Hex       | Use |
|--------------------|-----------|-----|
| `brand-accent-orange` | `#d97757` | Primary CTA, key highlights, “warm” emphasis |
| `brand-accent-blue`   | `#6a9bcc` | Secondary actions, links, info |
| `brand-accent-green`  | `#788c5d` | Success, positive states, tertiary emphasis |

**Rule**: Do **not** stack purple/indigo gradients or rainbow accents; pick **one** accent role per screen and repeat it for consistency.

### Typography

- **Headings**: Poppins (fallback: Arial, system-ui sans)
- **Body**: Lora (fallback: Georgia, serif)

Pre-install Poppins + Lora locally for design tools; for **web**, load via Google Fonts (snippet below) so artifacts render everywhere.

---

## Web & HTML artifacts (React / Vite / Tailwind / shadcn)

Use this section for **`web-artifacts-builder`** output and any static HTML.

### Contrast & hierarchy

- **Light background** (`#faf9f5` or white): body text `#141413`, secondary `#b0aea5`.
- **Dark background** (`#141413`): primary text `#faf9f5`, secondary `#b0aea5`.
- **Accent text** (links, badges): orange/blue/green from the table above — never low-contrast gray-on-gray for primary actions.

### Google Fonts (artifact-friendly)

Add once in `index.html` (or your root HTML before bundle):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />
```

CSS baseline:

```css
:root {
  --brand-dark: #141413;
  --brand-light: #faf9f5;
  --brand-mid-gray: #b0aea5;
  --brand-light-gray: #e8e6dc;
  --brand-orange: #d97757;
  --brand-blue: #6a9bcc;
  --brand-green: #788c5d;
}
html { background: var(--brand-light); color: var(--brand-dark); }
body { font-family: "Lora", Georgia, serif; }
h1, h2, h3, h4, h5, h6 { font-family: "Poppins", Arial, sans-serif; font-weight: 600; }
```

### Tailwind 3 (`tailwind.config` theme.extend)

Map tokens so utilities stay on-brand:

```js
colors: {
  brand: {
    dark: '#141413',
    light: '#faf9f5',
    mid: '#b0aea5',
    surface: '#e8e6dc',
    orange: '#d97757',
    blue: '#6a9bcc',
    green: '#788c5d',
  },
},
fontFamily: {
  sans: ['Poppins', 'Arial', 'system-ui', 'sans-serif'],
  serif: ['Lora', 'Georgia', 'serif'],
},
```

Use **`font-serif` for body** and **`font-sans` for headings** if you adopt the snippet above (shadcn defaults often use sans for everything — override base `body` class).

### shadcn / Radix

- Set `--background` / `--foreground` / `--primary` / `--muted` from the CSS variables above so dialogs and cards match the cream/dark palette.
- Prefer **subtle borders** (`#e8e6dc` or a hairline `brand-mid`) over heavy drop shadows.
- **Primary button**: `brand-orange` or `brand-dark` with `brand-light` text — avoid generic purple primary.

---

## Slides & Office (python-pptx, etc.)

### Smart font application

- Headings (24pt+): Poppins
- Body: Lora
- Fallback: Arial / Georgia if fonts missing

### Shape and accent colors

- Non-text shapes: cycle **orange → blue → green** for variety without breaking brand.

### Color application (Python)

- Use RGB equivalents of the hex values with `python-pptx`’s `RGBColor` for precise matching.

---

## Anti-patterns (same as quality web UI)

- Default “AI” look: **Inter-only**, **purple gradients**, **everything centered**, identical **rounded-xl** on every box.
- Muddy grays for **primary** actions; **no** clear focus ring for keyboard users.
- More than **two** font families on one screen (excluding monospace for code).

---

## Reference

- Anthropic marketing / brand (internal or public guidelines as updated by your org)
- **`web-artifacts-builder`**: bundling workflow for single-file HTML artifacts
