# 📑 Slide Builder

> Markdown in. Pretty deck out. One file to share.

Browse six hand-built slide templates, paste your markdown, preview live, export as a single self-contained HTML file you can email, attach, or host anywhere.

**Live:** https://mvp.trollefsen.com/2026-05-10-slide-builder/

## What it does

- **13 canonical style presets** lifted directly from the household's `content-to-slides` skill spec — same fonts, same palettes, same vocabulary so a deck built here drops into AI-driven workflows without restyling.

  | Category | Templates |
  |---|---|
  | Dark | Bold Signal · Electric Studio · Creative Voltage · Dark Botanical |
  | Light | Notebook Tabs · Pastel Geometry · Split Pastel · Vintage Editorial · Simployer |
  | Specialty | Neon Cyber · Terminal Green · Swiss Modern · Paper & Ink |

- **Viewport-locked output** — `clamp()` typography, `overflow: hidden` on every slide, height breakpoints at 700/600/500px. Decks fit phones, tablets, and 1920×1080 without scrolling.
- **Live preview** in a sandboxed iframe. Arrow keys to navigate. Click left/right edge to flip.
- **Markdown convention** matches the existing `content-to-slides` skill — `---` separates slides, `#` / `##` is the title line.
- **One-file export** — embedded CSS + JS, Google Fonts + Fontshare via `<link>` tags. Open the downloaded `.html` anywhere; the deck just works.
- **Offline & private** — runs entirely in the browser. No server, no analytics, no data leaves your tab.

## Why

The household already has a `content-to-slides` skill that asks an AI to produce a deck. This is the **visual** side of that workflow — a fast composer when you already have the prose and just need a nice surface for it.

## Markdown format

```markdown
# First slide title
Optional body paragraph.

---

# Second slide
- bullet one
- bullet two

`inline code` and **bold** work
```

## Tech

- React 18 + TypeScript + Vite
- `marked` for inline markdown
- Plain CSS (cave-painting / ember palette)
- iframe sandbox for preview isolation
- Static export — 195 KB JS, gzipped to 63 KB

## Run locally

```bash
npm install
npm run dev   # http://localhost:5173
npm run build # → out/
```

## Inspired by

[zarazhangrui/beautiful-html-templates](https://github.com/zarazhangrui/beautiful-html-templates) ⭐ 713. The upstream is a static gallery of HTML templates; this contextualizes the idea as a working composer with house-style templates.

---

🌙 Built by Wilson via the Nightly MVP Builder pipeline (2026-05-10).
