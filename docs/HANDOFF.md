# Handoff — system design & feature reference

This document is for the next engineer (human or agent) picking up this codebase.
It describes **what exists today** and **how it is put together**, so you can
extend it without spelunking, and — for the specific successor project in mind —
so you can see exactly where the current design assumes a single owner.

> **Context for the successor project.** The stated next step is to spin up a
> *new* repository that turns this into a **portfolio builder**: many users, a
> choice of **templates** (this portfolio being the first), each user publishing
> their own portfolio at a **short URL**. This document does **not** design that
> system. Its job is to hand off the current one accurately and to point out,
> factually, which parts are single-tenant so you know what you're starting from.
> The current portfolio should keep running untouched; the builder is expected to
> be a separate repo/version.

---

## 1. What this is, in one paragraph

A single-owner developer portfolio, built as a small content-managed app rather
than a static page. The **public site** is one non-scrolling screen: a project
**carousel** riding a **career timeline**. The **admin** (`/admin`) is an
authenticated CMS where all content is edited live, media is uploaded, changes
move through a draft → publish workflow, and Claude drafts project copy from a
pasted link. Data lives in **Supabase Postgres** behind row-level security;
hosting is **Vercel**.

Live: https://seanbrasse.vercel.app

## 2. Stack & runtime

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components), **React 19**, **TypeScript** |
| Styling | Plain CSS with custom properties in `src/app/globals.css`; **Tailwind v4** is imported but the app is almost entirely hand-written CSS + design tokens |
| Data | **Supabase** — Postgres (RLS), Storage (media bucket), Auth (Google OAuth) |
| AI | **Anthropic API** (`@anthropic-ai/sdk`) via a forced structured tool call |
| Hosting | **Vercel**; public routes prerendered, revalidated on admin save |
| Middleware | `src/proxy.ts` — **Next.js 16 renamed `middleware.ts` to `proxy.ts`**; this is the auth gate |

Node scripts: `npm run dev | build | typecheck | lint | test:contrast | test:gaps`.

## 3. Repository map

```
src/
  app/
    layout.tsx            Root layout: <html>, metadata, OG/description, JSON-LD wiring
    opengraph-image.tsx   Route that renders the OG card (calls src/lib/og.tsx)
    sitemap.ts, robots.ts SEO endpoints
    (site)/               The PUBLIC portfolio (route group)
      layout.tsx, page.tsx
    admin/                The CMS (auth-gated)
      layout.tsx          Admin shell + nav (hidden when signed out)
      page.tsx            "Content" screen: settings + lists of schools/jobs/projects
      enter/              Sign-in page (/admin/enter) + SignIn.tsx
      education/[id]/, experiences/[id]/, projects/[id]/   Per-record editors
      actions.ts          EVERY server-side write (server actions), each re-checks is_admin()
      data.ts             Admin read queries (session-carrying, drafts included)
      *.tsx               Client widgets: Form, Grow, Upload, Reorder, StarToggle,
                          OgPreview, ProjectDraft, Autosave, LinkRows, ImageAdjust, AudioToggle
    auth/callback/route.ts  OAuth callback
  components/
    Work.tsx              THE carousel + timeline + project modal (the public showpiece)
    ThemeScript.tsx       Pre-paint theme set (no light flash)
    ThemeToggle.tsx
  content/                Typed READ layer + validation + static fallback
    types.ts              Canonical content types + CAPS (field length caps)
    db.ts                 Maps Supabase rows -> rendering types (public read, published only)
    issue.ts              Static fallback content when Supabase is unconfigured
    index.ts              Entry point + build-time validation (validateIssue)
  lib/
    tokens.ts             ALL color (both palettes). Lint forbids hex elsewhere.
    og.tsx                Satori OG-card layout (source of truth; OgPreview mirrors it)
    prefill.ts            Claude drafting / suggested-edits (structured output)
    schema.ts             JSON-LD structured data
    site.ts               Absolute-origin resolution for OG/sitemap
    format.ts             Date/range formatting helpers
    supabase/
      config.ts           URL/key + "is Supabase configured?" guard
      server.ts           Server client + isAdmin()
      browser.ts          Browser client
  proxy.ts                Next 16 middleware: session refresh + /admin gate
supabase/migrations/      Ordered SQL schema (0001–0014)
docs/                     PRD.md, HANDOFF.md (this), motion-reference.html
tests/                    contrast.mjs, gaps.mjs (Playwright-based checks)
```

## 4. Data model

Schema is ordered SQL in `supabase/migrations/`. Tables mirror
`src/content/types.ts` one-for-one — `db.ts` maps rows straight onto those types,
so **a column that has no field is a column the site cannot show**.

| Table | Shape / notes |
|---|---|
| `settings` | **Exactly one row**, enforced by `id boolean primary key check (id)` (id can only be `true`). Holds name, tagline, skills[], roles[], location, contact, resume path, links (jsonb), `og_tagline`, `og_subtitle`. |
| `experiences` | Jobs. `id` is a **readable slug** (`mailchimp`), month-precision dates as `text` (`^\d{4}-\d{2}$`), summary + up to 3 impact bullets, optional logo, `published`. |
| `education` | Schools (added in migration 0003). Same timeline shape as a job (name, dates, logo) but no role/employer. |
| `projects` | `experience_id` FK → the employer it was built at (`on update cascade`). `context` professional/personal, `summary`, `story`, `impact`, `tech[]`, `status`, `date`, `starred`, `published`. A professional project must name an employer (check constraint). |
| `project_images` | Ordered gallery per project: `src`, required non-empty `alt`, `kind`, `fit`, `scale`, `focal_x/y`, `has_audio` (video), `sort_order`. |
| `project_drafts` | The **draft overlay** (migration 0012). A published project's staged edits live here; the public site never reads it. |
| `testimonials` | Present but **zero rows**; `approved` defaults false so an uncleared quote can't leak. UI to collect/show is unbuilt. |
| `admin_emails` | The **allowlist**. No RLS policies at all — unreachable via the API; read only by `is_admin()`. |

**Row-level security (the heart of the auth model):**

- Every content table: `select using (published or public.is_admin())`, writes
  `using/​with check (public.is_admin())`.
- `settings` is publicly readable (the live site needs it); writes are admin-only.
- `is_admin()` is a `security definer` SQL function that checks the caller's JWT
  email against `admin_emails`. It's granted to **both** `anon` and
  `authenticated` on purpose — anon carries no email claim, so it returns a flat
  `false`, which is what the `published or is_admin()` read policies want.
- Storage: one **public** `media` bucket (10 MB limit, image/pdf mime allowlist);
  writes/updates/deletes gated by `is_admin()`; no list/read policy needed since
  public buckets serve object URLs directly.

**Field caps are enforced in three places** (`src/content/types.ts` `CAPS`, the
admin counters, and SQL `check` constraints) so nothing can route around them.

## 5. Content flow (read path)

```
Supabase rows ──db.ts──▶ typed Issue (types.ts) ──▶ (site)/page.tsx ──▶ Work.tsx
                 │
                 └─ if Supabase unconfigured ▶ issue.ts (static fallback)
```

- `src/content/index.ts` is the single entry the pages import; it returns an
  `Issue` (settings + education + experiences + projects + testimonials + metrics)
  and runs `validateIssue()` (build-time cap checks).
- `db.ts` uses the **anon** client and RLS to see only published rows; `data.ts`
  (admin) uses the **session** client to see drafts too.
- Public routes are prerendered and **revalidated when the admin saves** (server
  actions call revalidation).

## 6. The public presentation (the first "template")

`src/components/Work.tsx` is the showpiece and the most intricate file:

- **Carousel**: position is a continuous float in a ref, written to the DOM every
  animation frame (transform + opacity only — compositor properties, no layout).
  Three cards visible, endless wrap, eased follow of a target, self-cancelling
  RAF loop. Input: wheel (only where the page can't scroll), drag-scrub, arrow
  keys, dots, and clicking a neighbour to bring it centre.
- **Sizing**: `fit()` sizes the card as `min(byHeight, byWidth, bySpan)` — the
  card is height-bound on narrow/short viewports and width-bound on wide/short-
  timeline ones. Tunables (`--card-fraction`, `--card-max`, `--spacing`,
  `--locked`) live in CSS and are read per-resize.
- **Timeline**: a single continuous line with a density warp (pre-career years
  compressed), badges stacked over names with collision-aware row stacking, a
  cursor that rides the carousel's float and jumps at the wrap seam.
- **Modal**: `<dialog>` with an image/video gallery, scrollable story, tech, links.

**Theming**: `src/lib/tokens.ts` defines both palettes; `globals.css` consumes
them as custom properties; `ThemeScript.tsx` sets the theme before first paint;
choice persists via cookie. A lint rule fails on any hex literal in `src/`.

**Social card**: `src/lib/og.tsx` (Satori) is the source of truth for the OG
image; `src/app/admin/OgPreview.tsx` is a pixel-faithful HTML replica for the
editor — **keep them in sync when either changes**.

Relevant to templating: the presentation consumes the typed `Issue` and nothing
below `src/components`/`(site)` knows where the data came from. A different
template is, architecturally, a different consumer of the same `Issue` shape.

## 7. The admin CMS

- **Entry**: `/admin/enter` → Google OAuth → `/auth/callback` → `/admin`.
  `src/proxy.ts` redirects unauthenticated visitors away from `/admin`.
- **Screens**: `/admin` (settings + lists), and per-record editors under
  `education/[id]`, `experiences/[id]`, `projects/[id]` (`/new` for creates).
- **Writes**: all in `src/app/admin/actions.ts`; every action re-checks
  `isAdmin()` and returns a `DENIED` sentinel otherwise. Writes revalidate the
  public routes.
- **Draft/publish**: a published project holds one pending draft in
  `project_drafts`; the editor **autosaves** to it as you type (`Autosave.tsx`,
  `ProjectDraft.tsx`); "Save & publish" promotes it. Projects can be unpublished.
- **Media**: `Upload.tsx` (drop/paste/click, multi-file staging, size/mime
  limits, `.mov`), per-image alt/fit/scale/focal (`ImageAdjust.tsx`),
  drag-to-reorder (`Reorder.tsx`), silent-clip flag (`AudioToggle.tsx`).
- **Pinning**: `StarToggle.tsx` — one starred project leads the carousel.
- **Field widgets**: `Grow.tsx` is the shared auto-growing textarea with a live
  character counter (used for capped copy fields); `Form.tsx` wraps the
  save/pending state; `LinkRows.tsx` edits the links array.

## 8. AI-assisted drafting

`src/lib/prefill.ts`: given a GitHub repo URL, any URL, or pasted notes, it asks
Claude (default `claude-sonnet-5`, override via `ANTHROPIC_MODEL`) to propose
project fields through a **forced tool call** (structured output, not hoped-for
JSON). Two modes: first-draft for a new project, and **suggested edits** to an
existing one, reviewed/applied field by field by the editor. Optional
`GITHUB_TOKEN` lifts the unauthenticated rate limit when reading a repo. It
writes nothing itself — every value is applied and saved by hand.

## 9. Auth & security model (three independent locks)

1. **`src/proxy.ts`** (Next 16 middleware): refreshes the Supabase session and
   redirects unauthenticated visitors from `/admin` paths to `/`.
2. **Server actions**: each re-checks `isAdmin()` before writing.
3. **RLS**: the database itself only returns unpublished rows to, and only
   accepts writes from, `is_admin()`.

The allowlist is a single email in `admin_emails`. `is_admin()` compares the
JWT's email claim to that table; RLS policies and the app ask the *same*
function, so the two can't drift.

## 10. Build, test, deploy

- `npm run build` prerenders public routes; `npm run typecheck` / `lint` are
  clean apart from two pre-existing `<img>` lint warnings in `Work.tsx`.
- `tests/contrast.mjs` loads the built site in both themes, makes text
  transparent, screenshots, and samples the real composited pixel behind each
  glyph. `tests/gaps.mjs` checks spacing. Both need a running server.
- Vercel builds on push; PRs get preview deployments. Public routes are ISR and
  revalidate when the admin saves.

## 11. Conventions & gotchas

- **Color lives only in `src/lib/tokens.ts`** — a lint rule fails on hex
  literals anywhere else in `src/`.
- **Dates are month-precision `text`** (`YYYY-MM`), not `date` columns, on
  purpose (a `date` would invent a day).
- **IDs are readable slugs**, and they're foreign keys — renaming cascades.
- **Caps are enforced three times** (types/CAPS, admin counter, SQL check).
- **`og.tsx` and `OgPreview.tsx` must match** — one rasterises the card, the
  other previews it.
- **RLS fails closed**; `is_admin()` is granted to `anon` deliberately (see §4).
- **Repo/package name is legacy** — this began as a comic-book portfolio; only
  the repo (`comic-portfolio`) and npm names still carry it. The GitHub remote is
  `seanbrasse/portfolio-builder`.
- **Settings is one row** guarded by a boolean PK — see §12.

## 12. Toward a multi-tenant template builder (reference, not a design)

This section is a **factual inventory** of where the current code assumes a
single owner and how the presentation is already decoupled from data. It is
deliberately *not* a proposed implementation.

**Where "one tenant" is baked in today:**

- `settings` is a **single row** (`id boolean primary key check (id)`). One site's
  identity, globally.
- **Auth is a single-owner allowlist**: `admin_emails` + `is_admin()`; RLS is
  written as "published to everyone, writes to the admin," with no notion of
  *which* user owns a row.
- **Content tables have no owner column** — projects/experiences/education belong
  to "the site," not a user.
- **IDs (slugs) are globally unique** across the whole database, not per user.
- **Routing is single-site**: `(site)/` renders *the* portfolio at `/`; there is
  no per-user path or subdomain, and no short-URL layer.
- **One Supabase project, one `media` bucket, one origin** (`NEXT_PUBLIC_SITE_URL`
  / Vercel deployment) feed OG tags, sitemap, and structured data.
- **One presentation**: `(site)/page.tsx` hardcodes `Work.tsx`; there is no
  template registry or per-user template selection.

**What is already reusable (why templating is tractable):**

- The **read layer returns a typed `Issue`** (`src/content/`) and nothing in the
  presentation knows the data source — a new template is another consumer of the
  same shape.
- **Theming is fully tokenised** (`tokens.ts` + CSS custom properties), so a
  template can restyle without touching data.
- The **admin is schema-driven** off the same types/caps, so new fields flow
  through types → db → admin consistently.

Reading these before starting the builder will save you the archaeology; how to
actually make it multi-tenant is your call to make in the new repo.

## 13. Open items / pending requests

Requested in the session that produced this handoff but **not implemented**:

1. **Remove the "Social card description" field** from the admin. Investigation
   found it is *not* dead: `og_tagline` feeds `<meta name="description">`,
   `og:description`, and JSON-LD `description` (`layout.tsx`, `schema.ts`) — it's
   just empty in the current data and never appeared in the OG *image*. The owner
   chose to **remove the field and leave the description empty** (matching current
   rendered output). To do: drop the `Grow` block in `admin/page.tsx`, stop
   reading `ogTagline` in `layout.tsx`/`schema.ts`, and clean it from
   `actions.ts`/`data.ts`/`db.ts`/`types.ts`/`index.ts`/`issue.ts` (the DB column
   can stay, harmless).
2. **Admin UI consistency pass** — spacing, margins, padding, and input sizing in
   the builder are uneven (e.g. capped fields split between a live counter and a
   "— max N" label; the footer field grid misaligns when a label wraps). Goal: a
   cohesive, well-designed admin. Note: the admin is auth-gated (RLS + `proxy.ts`),
   so it can't be screenshotted without a signed-in session — verify on a real
   login or a Vercel preview.

## 14. Environment & migrations

Copy `.env.example`. Nothing is strictly required to boot (missing vars degrade
features): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (falls
back to `issue.ts` if absent), `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`,
`GITHUB_TOKEN`) for drafting, `NEXT_PUBLIC_SITE_URL` for a custom domain.

Apply schema with the Supabase CLI (`supabase db push`) or run
`supabase/migrations/*.sql` in order against a fresh project.
