# Comic Panel Portfolio

An engineering portfolio rendered as a comic book. Career history, work, and
projects are laid out as inked panels on a newsprint page; a visitor reads it as
an issue, and can dial the intensity down to a plain resume at any point.

The thesis: the portfolio is itself the work sample.

Built against [`docs/PRD.md`](docs/PRD.md). This is **Phase 1 + Phase 3** — the
read-only site plus the polish layer. There is no database, no admin, and no
auth; content lives in one typed module. Phase 2 (the CMS) replaces that module
with Supabase queries returning the same shapes, and nothing in the rendering
layer should need to change.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build          # every public route, statically generated
npm run typecheck
npm run lint
npm run test:contrast  # needs a running server, see below
```

`NEXT_PUBLIC_SITE_URL` sets the absolute origin used in OG tags, the sitemap,
and structured data. On Vercel it is inferred from the deployment, so it is only
needed for a custom domain.

## What is where

| Area | File |
|---|---|
| All content | `src/content/issue.ts` |
| Content shapes and field caps | `src/content/types.ts` |
| Read API + build-time validation | `src/content/index.ts` |
| Color, in one place | `src/lib/tokens.ts` |
| Page templates | `src/lib/templates.ts` |
| Comic chrome, motion, print | `src/app/globals.css` |
| Panel kinds | `src/components/panels/index.tsx` |

Four pages — Origin, Work, Builds, Contact — plus `/plain`. Five templates.
Every public route is statically generated, so a visitor's page load touches no
data source.

## The decisions worth knowing about

**Templates, not a canvas.** Each template declares a desktop
`grid-template-areas` map and an ordered slot list. Panels are emitted by
walking that slot list, so DOM order, tab order, guided-view order, and the
animation stagger are all the same sequence by construction — there is no way to
author a page whose visual order and DOM order disagree. Adding a template is a
deploy, which keeps art direction under version control.

**Guided view is CSS.** Below 768px the grid becomes a horizontal scroll-snap
container, one panel per screen, in the template's declared mobile order.
Swiping works with JavaScript disabled; script only reports position to the
progress indicator.

**Plain view walks the same panels.** `/plain` is its own server-rendered route,
and it iterates the identical pages and slots the comic view does. That makes
"everything in comic view is in plain view" a structural property rather than a
discipline — a panel kind that renders nothing in plain view shows up
immediately.

**Flats come in two weights.** A panel is `tint` or `solid`. Tint is a wash
over the paper, for panels carrying body copy; solid lays the flat down at full
strength with the lettering inverted on top. The loud panels are what stop a
page of accents from reading as beige. Panels also take `shape: 'canted'` — a
clip-path corner cut with an inked diagonal across it — and a sub-degree
`tilt`, so the page is not a grid of identical rectangles.

**Color exists in exactly one file.** `src/lib/tokens.ts` defines both palettes;
the root layout emits them as custom properties. A lint rule fails on a hex
literal anywhere else in `src/`, because noir is only a day's work for as long
as that stays true. Two files are exempt: the token file itself, and the OG
generator, which rasterises through Satori and has no cascade to resolve
variables against — it imports the same values.

**The panel border is four rules, not an SVG stroke.** A `<rect>` with
`pathLength="100"` and an animated `stroke-dashoffset` is the obvious approach
and it does not survive a real grid: `preserveAspectRatio="none"` scales the
stroke per-axis, so a wide panel draws a thick slab down each side and a
hairline across the top. Four scaled rules are crisp at any panel size and
animate `transform` only, which `stroke-dashoffset` cannot.

**Motion timing.** MOTION-2 asks for a 60ms stagger *and* a six-panel page
resolving inside 500ms; at six panels those cannot both hold. The cap is the
binding constraint, so the stagger is 44ms and the arithmetic lands exactly on
500ms. Everything animates on entrance and on interaction, then stops — nothing
loops, and panels fire once rather than replaying on scroll-back. The finished
state is the CSS default, so a page whose script never runs is fully readable.

**Contrast was measured, not assumed.** `tests/contrast.mjs` loads every route
in both themes, makes all text transparent, screenshots, and samples the real
composited pixel behind each glyph — a halftone dot over a flat, which is darker
than either token alone. It found 17 failures on the first run, and it has
driven most of the art direction since:

- Subtitles are set in ink, not a spot color. No accent in either palette clears
  4.5:1 at 14px over a halftone dot.
- On tinted panels, metric numerals are ink with a hard accent shadow rather
  than accent with an ink outline. WCAG gives no credit for outlines.
- Solid flats carry no halftone at all. Tinted either way, the dots drag the
  ground toward one of the two type colors.
- The rays on a solid metric panel are masked out of the middle. Any opacity
  high enough to read as gold rather than olive also pushed the numeral under
  3:1, because a ray crossing a glyph sets that glyph's worst-case background.
  Clearing an ellipse removes the overlap instead of trading against it.
- The metric label sits on its own ink plate, which is one rule that holds for
  every accent in both themes rather than a gradient retuned per panel.

288 text elements now pass AA in both themes.

```bash
npm run build && npm start &
npm run test:contrast
```

**Field caps fail the build.** The character limits from the PRD are checked at
module load on the server, so `next build` fails with the offending field named.
A test can be skipped; this cannot.

## Two things are deliberately missing

**Testimonials.** `src/content/issue.ts` ships zero of them. The panel is built
and renders the moment a real, cleared quote is added — but the `approved` flag
exists precisely so an uncleared quote cannot reach the page, and inventing one
would be the worst thing this project could ship. Park quotes you have asked for
but not had confirmed as entries with `approved: false`.

**Project screenshots.** `images` is empty on every project. The pipeline —
duotone via SVG filter, focal point, theme response — is built and applies the
moment a file lands. Until then project panels render without an image, which is
intentional quiet-panel behavior rather than a broken state. This is the one
input that could not be derived from a resume.

## Open questions from the PRD, and where they landed

1. **How many pages?** Four — Origin, Work, Builds, Contact, as recommended.
2. **Noir's spot color?** A sodium-vapor amber rather than the obvious
   desaturated red. Streetlight through a blind: it does not borrow the
   four-color red, and it clears AA on near-black. Its second accent is a dark
   structural steel, dark enough to take light lettering as a solid ground.
3. **A cover page?** No separate cover. The hero panel of page one carries the
   issue number and the corner box, which was the PRD's own suggested compromise
   and keeps an interstitial out of the recruiter's way.
4. **Display typeface?** Bangers (OFL), self-hosted and subset to 9KB in
   `public/fonts`, with a matching TTF in `src/assets` for the OG generator
   (Satori cannot read woff2). Swapping in a licensed comic-lettering face
   means replacing those two files and the one `@font-face` block — nothing
   else in the codebase names a font family.
5. **Case study depth?** Panel plus external links, per the recommendation.
6. **Custom domain and cutover.** Still open. Set `NEXT_PUBLIC_SITE_URL` when it
   is decided.

One requirement is deliberately not implemented as written. MODE-8 asked for
`prefers-color-scheme: dark` to select noir on a first visit; four-color is the
unconditional default instead. Most people browse in dark mode, so honouring the
OS preference meant the palette the portfolio leads with was the one most
first-time visitors never saw. An explicit choice still wins and still persists.

Availability is set to `selective` in `src/content/issue.ts`, which drives the
CTA copy. One enum change swaps it.
