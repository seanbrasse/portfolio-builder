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

Four pages — Origin, Work, Builds, Contact — plus `/plain`. Seven templates.
Every public route is statically generated, so a visitor's page load touches no
data source.

## The decisions worth knowing about

**Templates, not a canvas.** Each template declares a `grid-template-areas` map
and an ordered slot list. Panels are emitted by walking that slot list, so DOM
order and tab order match the reading order by construction — there is no way
to author a page whose visual order and DOM order disagree. Adding a template
is a deploy, which keeps art direction under version control.

**Nothing inside a leaf reacts to the viewport.** A leaf is a fixed 880×1140
canvas that gets scaled to fit, so its width has no relationship to the
window's. Viewport units and width media queries are therefore bugs in here, not
responsiveness: `vw` sizing rendered type at window scale inside a page that
does not track the window, and a `max-width: 767px` rule left over from the
pre-book guided view turned the page grid into a horizontal scroll-snap strip —
on a fixed 880px canvas that laid the panels out in a row and pushed everything
after the first off the edge of the paper. The book already answers "this is a
small screen" by turning to one leaf at a time.

**The phone gets a taller canvas.** One leaf is laid out at 880×1560 rather
than the spread's 880×1140. Width is the binding constraint on a phone — a page
can never be scaled past the screen's width without overflowing it — so the
only lever on how big the page reads is how much of the height it also fills,
and at the spread's 0.77 aspect it came out about 500px tall on an 840px screen
with a third of the screen left empty. 0.56 is close to what a phone actually
leaves once the rail is accounted for. The templates size their rows
fractionally, so the bands take the extra height and nothing needed
re-composing. Turning is a swipe, so the arrows are not rendered below 900px
and the 84px of gutter they occupied goes back to the paper — which is most of
the difference between a postcard and a page.

**Plain view walks the same panels.** `/plain` is its own server-rendered route,
and it iterates the identical pages and slots the comic view does. That makes
"everything in comic view is in plain view" a structural property rather than a
discipline — a panel kind that renders nothing in plain view shows up
immediately.

**Panels are not rectangles, and art crosses their borders.** `shape` takes
`canted` (one corner cut), `lean-l`/`lean-r` (a parallelogram, for a tall
panel), and `slope-t`/`slope-b` (a single tilted edge). Pair `slope-b` on one
band with `slope-t` on the next and the gutter between them runs diagonally,
which is most of what makes a page read as laid out rather than tabulated.
Templates use uneven tracks for the same reason — no `repeat()` anywhere.

The border is the panel's own background showing past a slightly smaller plate
laid on top, not four rules along the edges. The rules existed so the ink could
draw on one edge at a time; that animation is gone, and they could never have
followed an edge that is not a rectangle, because a clip-path takes no border.

A panel clips its contents — that is what makes it a panel — so anything that
*breaks* the frame has to live above the grid entirely. `BreakoutLayer` is that
layer, placed in page percentages. The fixed canvas is what makes that safe: a
percentage of an 880×1140 leaf is the same slice of the composition at every
scale factor, so art aimed at a gutter stays on that gutter. Everything in it
is `aria-hidden` decoration and may never be the only place a fact appears.

A slope costs a band the height of its clearance, and the page has no spare
height — the first version paid for two slopes out of the neighbouring band and
the audit caught it immediately, as a clipped bullet reporting foreground
exactly equal to background.

**Flats come in two weights.** A panel is `tint` or `solid`. Tint is a wash
over the paper, for panels carrying body copy; solid lays the flat down at full
strength with the lettering inverted on top. The loud panels are what stop a
page of accents from reading as beige. Panels also take a sub-degree `tilt`, so
even two rectangles are not perfectly parallel.

**Color exists in exactly one file.** `src/lib/tokens.ts` defines both palettes;
the root layout emits them as custom properties. A lint rule fails on a hex
literal anywhere else in `src/`, because noir is only a day's work for as long
as that stays true. Two files are exempt: the token file itself, and the OG
generator, which rasterises through Satori and has no cascade to resolve
variables against — it imports the same values.

**Pages arrive drawn.** There is no entrance animation: panels, flats and
lettering appear together, the moment a page is on screen. An earlier version
lettered the panels in one at a time, in reading order and across the spread,
so the issue looked like it was being written as you read it. It was a nice
idea for one page and tiring by the fourth — a reader who has arrived at a page
wants to read it, not watch it assemble. `MOTION-2`'s ink-in and `MOTION-3`'s
SFX stamp are therefore not implemented; the resting state of every element was
always the finished state, so removing the animations was a deletion rather
than a rewrite.

What is left is motion a reader asks for: the page turn, and the hover lift on
a panel that links somewhere.

**The turning leaf bends.** No CSS transform curves an element — `rotateY`
pivots a rigid plane — so `CurlSheet` cuts the page into twelve vertical strips
and nests them, each rotated a few degrees about its own inner edge. The
rotations compose into a polygonal approximation of a cylinder, which is a real
bow rather than a hinge. Every strip renders the same page shifted sideways and
clipped to its own width, so the content stays live DOM: selectable, themed,
crisp. Angles and per-strip shading come from the Web Animations API, because
each strip needs its own curve and CSS keyframes cannot describe the shape of a
bend.

The two alternatives were both worse here. A rigid rotation about a moving
crease — what StPageFlip calls a soft page — is far cheaper but it is a fold,
not a curl. A WebGL mesh deforms properly but means rasterising the page and
giving up live text.

Shading is the other half of the illusion: without it twelve strips read as
twelve flat cards. Each strip darkens by `1 - |cos θ|` of its accumulated
angle, so the sheet is darkest edge-on and lit again once it has gone over, and
a gradient tracks the shadow the raised leaf throws across the spread. The
sheet carries the facing page of the spread it is turning to on its reverse,
which is what a leaf actually is.

Nothing loops, and a page whose script never runs is identical to one whose
script does — the CSS default *is* the finished page.

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
  every accent in both themes rather than a gradient retuned per panel. The ray
  layer sits at `z-index: -1` so the plate is genuinely the thing behind the
  glyphs: at `0` the rays are a positioned element and paint *above* the in-flow
  label, putting gold back on top of the plate meant to keep it off.

The audit measures what is visible, which is not the same as an element's own
rect. Boxes are intersected with every clipping ancestor first — plain view
scrolls inside `main`, so an element past that container's edge still reports
coordinates inside the viewport, and sampling them reads the rail painted
underneath rather than the text.

448 text elements now pass AA in both themes.

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

Three requirements are deliberately not implemented as written.

**MODE-8** asked for `prefers-color-scheme: dark` to select noir on a first
visit; four-color is the unconditional default instead. Most people browse in
dark mode, so honouring the OS preference meant the palette the portfolio leads
with was the one most first-time visitors never saw. An explicit choice still
wins and still persists.

**MOTION-2** (the panel ink-in) and **MOTION-3** (the SFX stamp) are not
implemented. Both were built, and both were removed once the staged reveal had
been lived with: a page that assembles itself in front of the reader is a
first-impression trick that gets in the way on every visit after it. Pages
render finished. The page turn is the motion the format actually needs.

Availability is set to `selective` in `src/content/issue.ts`, which drives the
CTA copy. One enum change swaps it.
