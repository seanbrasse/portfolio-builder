# Portfolio

Sean Brasse's developer portfolio — a single-screen showcase of selected work,
built as a small content-managed app rather than a static page.

The public site is one view: name, what he does, what he knows, and a
carousel of projects sitting on a career timeline that runs from the first
school to the latest ship. Contact is in the footer. On a desktop viewport the
page does not scroll — that constraint is what keeps the surface small and is
why the work is a carousel rather than a grid.

Behind it is an authenticated admin where the content is actually managed:
projects, jobs, schools and site settings are edited live, screenshots and
clips are uploaded, and changes move through a draft → publish workflow.
Claude drafts and revises project copy from a pasted link or notes.

Live at **[seanbrasse.vercel.app](https://seanbrasse.vercel.app)**.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** — Postgres with row-level security, Storage for media, and Auth
  (Google OAuth) for the admin
- **Anthropic API** (`@anthropic-ai/sdk`) for AI-assisted project drafting
- **Vercel** for hosting; the public routes are statically generated and
  revalidated when the admin saves

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build          # production build (public routes prerendered)
npm run typecheck
npm run lint
npm run test:contrast  # needs a running server, see below
npm run test:gaps
```

### Environment

Copy `.env.example` and fill in what you need. Nothing here is required just to
boot the app — a missing variable degrades a feature rather than breaking the
build.

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Without it the site falls back to the bundled content in `src/content/issue.ts` and `/admin` redirects home. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (paired with the URL above). |
| `ANTHROPIC_API_KEY` | Enables the "start from a link / suggest edits" drafting in the editor. Without it that one control reports it is not configured; the rest of the admin is unaffected. |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-sonnet-5`. |
| `GITHUB_TOKEN` | Optional. Lifts GitHub's 60-req/hr unauthenticated limit when Claude reads a pasted repo. A fine-grained token with public read is enough. |
| `NEXT_PUBLIC_SITE_URL` | Absolute origin used in OG tags, the sitemap and structured data. On Vercel it is inferred from the deployment, so it is only needed for a custom domain. |

### Database

Schema lives in `supabase/migrations/` as ordered SQL. Apply it to a fresh
Supabase project with the Supabase CLI (`supabase db push`) or by running the
files in order. RLS is on for every table: public reads see only published
rows, and every write is gated behind an `is_admin()` check, so the admin key is
never trusted from the client alone.

The admin is a single-owner allowlist — sign-in is Google OAuth and only the
allowlisted email reaches `/admin`; everyone else is redirected. Middleware
gates the pages, each server action re-checks `is_admin()`, and RLS gates the
rows: three independent locks, any one of which failing still leaves two.

## What is where

| Area | Path |
|---|---|
| Public page + layout | `src/app/(site)/`, `src/app/layout.tsx` |
| The carousel + timeline | `src/components/Work.tsx` |
| Admin editor (projects, jobs, schools, settings) | `src/app/admin/` |
| Server actions (every write) | `src/app/admin/actions.ts` |
| AI drafting / suggested edits | `src/lib/prefill.ts` |
| Read layer + build-time validation | `src/content/` |
| Supabase clients + auth | `src/lib/supabase/` |
| Color, in one file | `src/lib/tokens.ts` |
| Everything visual | `src/app/globals.css` |
| Database schema | `supabase/migrations/` |

## Decisions worth knowing about

**Content is data, edited live.** Facts live in Postgres and reach the page
through a typed read layer (`src/content/`) that returns the same shapes the UI
always used. `src/content/issue.ts` is a static fallback for when Supabase is
not configured, so the site still renders with no database at all.

**Draft and published are separate.** A published project can hold one pending
draft — staged edits kept in a `project_drafts` overlay that the live site never
sees. Saving as a draft leaves the public version untouched; Save & publish
promotes it. Editing autosaves to that draft as you type, so a refresh never
loses work in progress.

**Claude drafts, the editor decides.** Paste a GitHub repo, a URL, notes or a
write-up and the model proposes values field by field — a first draft for a new
project, or suggested edits to an existing one. It writes nothing itself:
every suggestion is applied and saved by hand. Structured output comes from a
forced tool call, not hoped-for JSON.

**The carousel is hand-built, on purpose.** Three cards visible, the middle
raised, positioned by transform and opacity only (both compositor properties,
so moving cards costs no layout). It reimplements what a native scroll rail
gives for free — arrow keys, prev/next, a paged pointer swipe that always lands
on one card, and motion that vanishes under `prefers-reduced-motion` — because
the overlap and the timeline coupling a scroll container cannot do. Positions
wrap, so scrolling is an endless cycle; the timeline cursor tracks the centred
card and jumps across the newest↔oldest seam rather than sweeping back.

**Dark is the design, not a preference.** Two values — a warm near-black and a
cream — plus a single ember for the primary action, focus and the metric
numerals. Light exists as a translation, one toggle away, written before first
paint so a visitor who chose dark never sees a light flash.

**Color exists in exactly one file.** `src/lib/tokens.ts` defines both palettes;
a lint rule fails on a hex literal anywhere else in `src/`.

**Contrast was measured, not assumed.** `tests/contrast.mjs` loads the page in
both themes, makes text transparent, screenshots, and samples the real
composited pixel behind each glyph — catching failures invisible by eye.

```bash
npm run build && npm start &
npm run test:contrast
```

## Documentation

- **[CHANGELOG.md](CHANGELOG.md)** — a curated, thematic history of what shipped.
- **[docs/HANDOFF.md](docs/HANDOFF.md)** — system design and feature reference for
  anyone picking the project up, including where its single-tenant assumptions
  live (written toward a possible template-based, multi-tenant "portfolio
  builder" successor — see below).
- **[docs/PRD.md](docs/PRD.md)** — the original product requirements.

## Future goals

- **Portfolio builder.** The longer-term direction is to turn this single-owner
  site into a builder: many users, a choice of templates (this portfolio being
  the first), and each published to a short URL. `docs/HANDOFF.md` documents the
  current design and the single-tenant assumptions such a rebuild would touch.
- **Richer timeline.** Surface job and school detail inline on the timeline, not
  only as project marks.
- **Analytics-informed ordering.** Use engagement to suggest which project to
  lead with, rather than a single manual pin.
- **Testimonials.** The schema and an `approved` flag already exist so an
  uncleared quote can never reach the page; the surface to collect and show them
  is still to build.
- **Broader auth.** The admin is a single-owner allowlist today; opening it to
  a small team would mean per-row ownership and an invite flow.

## Deliberately absent

**Testimonials** ship as zero rows — an `approved` flag exists precisely so an
uncleared quote cannot reach the page.

**Some screenshots can't be shown.** Personal projects can be captured freely;
internal Mailchimp/Intuit/PayPal software cannot, and those cards stand on their
write-up alone.

**Company logos** are supported on jobs and schools and render in the timeline
and on cards, but wordmarks set in type are the default — trademarked logos
carry brand-guideline questions worth checking before use.

> **On the repo name.** This began as a comic-book portfolio — panels,
> templates, a page-curl animation. That presentation is long gone; the repo and
> npm package names are the only things still carrying it, and renaming them
> would break the Vercel link for no benefit. The history is in git if it is
> ever wanted back.
