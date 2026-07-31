# Portfolio

Sean Brasse's engineering portfolio. One screen: name, what he does, what he
knows, and a horizontally scrolling rail of what he has built. Contact is in
the footer.

The page does not scroll on a desktop viewport. That is the constraint the
layout is built around, and it is why so little is on it — the career timeline,
the headline metrics, the long intro and the call-to-action buttons were all
cut because they could not earn a place in a single view.

> **Note on the repo name.** This was a comic-book portfolio — an issue you
> turned page by page, with panels, templates and a page-curl animation. That
> presentation is gone as of the commit that added this file; the repo name and
> the npm package name are the only things still carrying it, and renaming them
> would break the Vercel link for no benefit. The history is in git if the comic
> is ever wanted back.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build          # statically generated
npm run typecheck
npm run lint
npm run test:contrast  # needs a running server, see below
```

`NEXT_PUBLIC_SITE_URL` sets the absolute origin used in OG tags, the sitemap
and structured data. On Vercel it is inferred from the deployment, so it is
only needed for a custom domain.

## What is where

| Area | File |
|---|---|
| All content | `src/content/issue.ts` |
| Content shapes and field caps | `src/content/types.ts` |
| Read API + build-time validation | `src/content/index.ts` |
| Color, in one place | `src/lib/tokens.ts` |
| The page | `src/app/page.tsx` |
| Everything visual | `src/app/globals.css` |

## The decisions worth knowing about

**Content is a module, not markup.** Every fact lives in one typed file and
reaches the page through `src/content/index.ts`. That is what makes the
presentation replaceable — this is the third one, and none of them touched the
content. Phase 2 swaps the module for Supabase queries returning the same
shapes, and nothing in the rendering layer needs to change.

**Field caps fail the build.** Character limits are checked at module load on
the server, so `next build` fails with the offending field named. A test can be
skipped; this cannot.

**The scroll lock is conditional, and that is not a hedge.** Locking scroll
makes anything that does not fit unreachable. At 400% zoom, on a short laptop,
or on a phone, "no scrollbar" becomes "the projects do not exist" — which is
exactly what happened when the lock keyed on height alone: a 390x844 phone
passed the height check, the cards were clipped rather than scrolled, and
everything past the second was gone. It now takes both `min-height: 760px` and
`min-width: 900px`; below either, the page is an ordinary scrolling document.

**Sizing the screen is subtraction, not arithmetic.** `html`/`body` become the
frame, header and footer are `flex: none`, and `main` takes what is left. The
first attempt used `100dvh` on the content and had to know how tall the header
and footer were; it did not, so the cards ran underneath the footer.

Both grid axes need `minmax(0, 1fr)`. A grid track's automatic minimum is its
content's max-content size, so the column grew to the rail's full unwrapped
width — about 1340px — and pushed the document sideways instead of letting the
rail scroll. The tell was a rail reporting zero horizontal overflow while cards
visibly ran off the screen: nothing was overflowing it, because it had been
given room for everything.

**The projects rail is native scrolling, not a carousel.** Horizontal
`scroll-snap` on a real scroll container. The browser already implements
keyboard scrolling, touch momentum, scrollbar dragging and reduced motion
correctly, and a carousel reimplements all four.

**The card gives up its own height.** On a page that cannot scroll, a
fixed-aspect image well is what pushes copy out of a card, so the well is
`flex: 1 1 30%` and absorbs whatever is left instead of demanding a ratio. The
summary is clamped to two lines and marked `flex: none` — the clamp decides its
height and flex must not re-decide it, or the text is cut through the middle of
a line instead of ending in an ellipsis. At this size the card shows three tech
chips and drops the impact line: a visitor who does not yet know what the
project is cannot use its outcome.

**Dark is the design, not a preference.** The palette is two values — a warm
near-black and a cream — plus a single ember used on the primary button, focus
and the metric numerals, and nowhere decorative. Light exists because some
people need it, and it is a translation rather than the original. The default
is dark regardless of `prefers-color-scheme`: it is how the site is drawn, and
the toggle is one click away.

The ground carries a fine grain, at 0.035 opacity. That number is measured, not
chosen — at 0.5 the brightest noise pixels lifted the background to about
rgb(70,80,75) and put muted body copy at 2.7:1 against them. Grain sits behind
every word on the page, so any value high enough to see plainly is a value that
sets the contrast floor for the whole site.

**Space is the design.** The hero takes most of a screen and the section
rhythm is roughly double what a conventional layout uses. Halving those numbers
is the fastest way to make this look like a generic template again.

**Color exists in exactly one file.** `src/lib/tokens.ts` defines both
palettes; the root layout emits them as custom properties. A lint rule fails on
a hex literal anywhere else in `src/`, because a second theme is only a day's
work for as long as that stays true. Two files are exempt: the token file
itself, and the OG generator, which rasterises through Satori and has no
cascade to resolve variables against.

The theme is written to `data-theme` by a blocking inline script before first
paint, so a visitor who chose dark never sees a light flash. The toggle reads
it back with `useSyncExternalStore` rather than keeping its own copy, so React
state cannot disagree with the attribute.

**Contrast was measured, not assumed.** `tests/contrast.mjs` loads the page in
both themes, makes all text transparent, screenshots, and samples the real
composited pixel behind each glyph. 188 text elements pass AA in both themes.

It captures full-page and works in document coordinates, because the site is
one long scroll — a viewport-sized capture measures the hero and silently skips
everything below the fold, which is most of the site. The sticky header is
pinned to `static` for the capture, or it paints its own background across text
it does not actually cover.

Three things it has found, all invisible by eye: 11.5px tech chips set in
`--ink-muted`, `--ink-muted` itself on dark surfaces at body size, and the
background grain at the opacity it was first written with.

```bash
npm run build && npm start &
npm run test:contrast
```

## Two things are deliberately missing

**Testimonials.** `src/content/issue.ts` ships zero of them. The `approved`
flag exists precisely so an uncleared quote cannot reach the page, and
inventing one would be the worst thing this project could ship. Park quotes you
have asked for but not had confirmed as entries with `approved: false`.

**Project screenshots.** `images` is empty on every project, so the cards
render a labelled "no screenshot yet" well rather than a broken frame. This is
the one input that could not be derived from a resume.

Worth knowing which ones are gettable: the three personal projects can be
screenshotted freely. The LLM Knowledge Engine cannot — it is internal
Mailchimp software, and a screenshot of it is not Sean's to publish. The same
goes for any shot of the QBO form builder or PayPal's onboarding flow.

**Company logos** are supported on `Experience.logo` and render in the timeline
and on project cards. None are set. Company logos are trademarks, and using
them to indicate employment is normally accepted nominative use — but Intuit
and PayPal both publish brand guidelines that restrict it, so it is worth a
look before adding them. Wordmarks set in type, which is what renders today,
carry no such question.
