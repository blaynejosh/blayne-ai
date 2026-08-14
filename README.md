# B.L.A.Y.N.E AI

**Business Leading Agent Yielding Next-Gen Enterprise Strategies** — the web front end and API for Blayne's Consulting's AI consultant.

> Internal — Confidential. This repository contains Blayne's Consulting's behavioural specification and Product Map. Keep it private.

---

## What's in here

Two surfaces, one Vite/React app:

| Surface | Route | What it is |
|---|---|---|
| Marketing home | `/` | Hero, value statement, the four Product Map layers, footer |
| Chat product | `/features`, `/job-roles`, `/departments`, `/startups` | The B.L.A.Y.N.E chat surface, one route per Product Map layer |

The hero's four **Explore** pills cross from the marketing page into the chat product.

## Running it

```bash
npm install
cp .env.example .env    # then add your Anthropic API key
npm run dev:all
```

`dev:all` runs the Vite dev server (`:5173`) and the API server (`:8787`) together. Vite proxies `/api` to the API server.

| Script | Purpose |
|---|---|
| `npm run dev` | Front end only — chat will error without the API running |
| `npm run server` | API only |
| `npm run dev:all` | Both |
| `npm run build` | Production build of the front end |
| `npm run extract:hero` | Regenerate the SVG-derived React components |
| `npm run extract:hero:audit` | Print what each extracted layer range covers |
| `npm run skills:list` | Show which Blayne skills are registered |
| `npm run skills:upload` | Upload/refresh the skill set (needs `SKILLS_DIR`) |

`GET /api/health` reports whether the API key was picked up and how many skills are registered.

## Architecture

```
src/            React front end (no API key ever reaches here)
  components/   Hero, Product Map sections, chat surface
  data/         Product Map content + hero geometry
  lib/          Stage/fan geometry helpers, SSE chat client
server/         Node API — holds the Anthropic key, streams answers
design/         Source SVG exports the components are generated from
scripts/        SVG → React extraction
```

### The design pipeline

The hero, Product Map sections, and chat backdrop are generated from the Figma exports in `design/` by `scripts/extract-hero-svg.mjs`. The exports have their type outlined to paths, so the script keeps the decorative artwork as vector and drops the text and chrome, which the components rebuild as real HTML — selectable, translatable, and screen-reader readable.

Geometry is reproduced faithfully: the artboards are 1440×1024, and `src/lib/stage.js` maps design pixels to container-query units so the composition holds at any width. `src/lib/fan.js` regenerates the Features-page curve bundle for any item count, since the export only contains the 20-item version.

**If a design is re-exported from Figma, re-check the line ranges** in `scripts/extract-hero-svg.mjs` with `npm run extract:hero:audit` before regenerating.

### The API

`server/index.js` exists so the Anthropic key stays server-side. It adds B.L.A.Y.N.E's base identity prompt, calls Claude, and streams the answer back as Server-Sent Events.

`server/blaynePrompt.js` holds that identity prompt, compiled from **Personality & Consulting Methodology v1.0** (Document 6). That document specifies it as the top prompt layer that nothing downstream may override — treat edits to it as changes to the product's behaviour, not copy tweaks. It's also the cached prefix, so editing it invalidates the prompt cache for every conversation.

### The Blayne skills

The identity prompt sets *how* B.L.A.Y.N.E. behaves. The **skills** are what it knows: the six-phase methodology, the brand system, the writing standards, and the specialist playbooks the `bbip` router indexes. They're uploaded to the Anthropic Skills API and attached per request, so each skill's description stays in context and the full text loads only when a request calls for it.

`server/skills.json` records the uploaded ids — commit it, it's not a secret. Re-run `npm run skills:upload` only when a `SKILL.md` actually changes; `-- --force` publishes a new version of an existing skill.

**The Messages API allows 8 skills per request** (not 20 — that's Managed Agents). So `server/index.js` attaches a fixed Blayne core on every call — `bbip`, `blayne-methodology`, `blayne-brand-guidelines`, `blayne-executive-writing-standard` — plus four chosen by which Product Map layer the client is in. Change the split in `CORE_SKILLS` / `SKILLS_BY_CATEGORY`.

Skills execute in a code-execution container, which is why requests carry the `code_execution` tool and the `code-execution-2025-08-25` + `skills-2025-10-02` betas, and why the server handles `pause_turn` by resuming. That container adds latency and cost to every message — if you ever want the cheap path back, drop `container`/`tools` and the betas and it runs on the identity prompt alone.

## Deploying

The front end builds to static files, but **the API needs a Node runtime** — a static-only host will serve the site with every chat failing. Deep links (`/features`) also need SPA fallback to `index.html`.

Set `ANTHROPIC_API_KEY` in the host's environment. Never commit it.

## Known gaps

- `src/BlayneNeuralGem.jsx` is an earlier three.js experiment that nothing imports. It keeps `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/postprocessing` in `dependencies` — remove all five together if it isn't wanted.
- The client bundle inlines the backdrop SVGs (~62KB of the grid alone), which is most of the bundle size. Kept inline for exactness.
- Search in the header currently routes to `/features`; there is no search surface in any design yet.
