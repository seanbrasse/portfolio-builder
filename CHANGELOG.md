# Changelog

All notable changes to this project. This is a curated, thematic summary — the
full commit-by-commit history lives in git (`git log`), and each entry below
corresponds to one or more merged pull requests.

The project went from empty repo to a live, database-backed, content-managed
portfolio between **2026-07-30 and 2026-08-03**. It has not been versioned or
released; everything to date is pre-1.0 development, grouped under `0.1.0`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

_Requested but not yet implemented (see `docs/HANDOFF.md` → Open items):_

- Remove the "Social card description" field from the admin (decision: leave the
  `og:description` / meta description / JSON-LD description empty rather than
  falling back to the tagline).
- A visual-consistency pass over the admin/builder UI — spacing, margins,
  padding, and input sizing — to make it cohesive.

## [0.1.0] — 2026-07-30 → 2026-08-03

### Public site

- One-screen portfolio: name, tagline, skills, and a project **carousel** riding
  a **career timeline** that runs from the first school to the latest ship, with
  contact in the footer. On desktop the page does not scroll — a deliberate
  constraint that keeps the surface small.
- Hand-built carousel (`src/components/Work.tsx`): three cards visible, the
  middle raised, positioned by transform + opacity only. Endless wrap, eased
  drift, arrow-key / prev-next / paged-swipe control, and a timeline cursor that
  tracks the centred card and jumps across the newest↔oldest seam.
- Opened-project modal: full image/video gallery, a scrollable long-form
  **story** under the summary, tech, links, and status.
- A click on a side (neighbour) card scrolls it to the middle; a "Click for
  details" cue on the front card signals it opens.
- Clicking the front card grows to fill the width the layout leaves
  (`--card-fraction` tuned so `byWidth` reaches the three-card `bySpan` limit).

### Timeline

- Continuous career line with a **density warp**: the pre-career stretch is
  compressed so the years with work in them get the room.
- Company/school **badges** stacked over names, collision-aware row stacking,
  year ticks thinned when crowded, and interactive tick tooltips (role + dates).
- Education became a first-class table (many schools, each with a logo), instead
  of three fixed fields on settings.

### Mobile & responsive

- Whole page fits one phone screen; card flanked by arrows; timeline keeps its
  marks and drops labels to badges; every timeline year fits with two-digit
  labels and an accent end-cap.
- Layout scales up on large and ultrawide monitors.

### Theming & social

- Dark-first design translated to a light theme, one ember accent, theme chosen
  before first paint (no flash) and persisted via cookie. All color lives in
  `src/lib/tokens.ts`; a lint rule forbids hex literals elsewhere in `src/`.
- **Open Graph** card rasterised by Satori (`src/lib/og.tsx`) with an editable
  subtitle and a live light/dark admin preview; sitemap, robots, and JSON-LD
  structured data.
- Contrast measured against real composited pixels (`tests/contrast.mjs`).

### Admin CMS (`/admin`)

- Live editing of settings, education, experiences (jobs), and projects, backed
  by Postgres — nothing is hardcoded.
- **Draft → publish** workflow: a published project can hold one pending draft
  in a `project_drafts` overlay the public site never sees; editing **autosaves**
  to that draft as you type; publish promotes it. Projects can be unpublished.
- Projects list with client-side sort (recently added / A–Z / project date) and
  a per-row **star** to pin one project to the front of the carousel.
- Media pipeline: drop / paste / click uploader, multi-file staging, size and
  MIME limits, `.mov` support, per-image alt text, fill mode (`cover`/`contain`),
  zoom, focal point, and drag-to-reorder galleries.
- Per-clip audio flag so the card's mute toggle disables on silent video.
- Sticky, faded Save bar; responsive editor and sign-in pages; forms preserve
  input when a save is rejected.

### AI-assisted drafting

- Paste a GitHub repo, URL, or notes and Claude proposes project fields via a
  forced structured tool call (`src/lib/prefill.ts`) — a first draft for a new
  project, or **suggested edits** to an existing one, applied field by field by
  the editor. Failures surface as messages, never a dead click.

### Data & infrastructure

- Supabase Postgres with **row-level security** on every table: public reads see
  only published rows; every write is gated by an `is_admin()` allowlist check.
- **Auth**: Google OAuth, single-owner email allowlist; `src/proxy.ts`
  (Next.js 16 middleware) redirects unauthenticated visitors from `/admin`, each
  server action re-checks `is_admin()`, and RLS gates the rows — three
  independent locks.
- Typed read layer (`src/content/`) maps rows onto the rendering types; a static
  fallback (`src/content/issue.ts`) renders the site with no database at all;
  build-time validation enforces field caps.
- Schema as ordered SQL migrations (`supabase/migrations/0001`–`0014`).
- Hosted on Vercel; public routes prerendered and revalidated on admin save.
