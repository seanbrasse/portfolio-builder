/**
 * Gutter consistency: every vertical gutter on the issue is one width, every
 * horizontal gutter is another, and neither varies along its own length.
 *
 * This is measured rather than asserted because `column-gap` and `row-gap` are
 * the gap between two *layout boxes*, and several things put paint somewhere
 * other than the box edge:
 *
 * - A slanted band's painted top edge sits `--slope` below its box at one end
 *   and on the box at the other, so the declared row gap and the visible one
 *   differ by a slope unless the band's negative margins cancel it.
 * - A rotated panel's bounding box is larger than the panel, by
 *   `height * sin θ` in width. The grid lays out the box, so the neighbouring
 *   gutter narrows at one corner and widens at the other.
 *
 * Both were live defects. Neither is visible in a screenshot at a glance and
 * both are obvious in numbers, which is what this exists for.
 *
 * The comparison is in canvas px, not screen px: a leaf is a fixed 880x1140
 * canvas scaled to fit, so a screen measurement carries the scale factor and
 * two leaves at different scales would not be comparable.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
/**
 * Every page route, from the generated sitemap rather than a list kept here —
 * pages are content, so a hardcoded list stops covering the site the first
 * time somebody adds one.
 *
 * `/` is dropped: it opens on the cover, which carries no panel grid, and a
 * route yielding no leaves is a failure below. Visiting every page rather than
 * one URL per spread measures some leaves twice, which costs a few seconds and
 * removes the need to know how pages pair up.
 */
async function discoverRoutes() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const paths = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    // `/` opens on the cover and `/plain` is a scrolling document; neither has
    // a panel grid, and a route yielding no leaves is a failure below.
    .filter((path) => path !== '/' && path !== '/plain');
  if (paths.length === 0) throw new Error('sitemap.xml listed no page URLs');
  return paths;
}

const ROUTES = await discoverRoutes();
/** A painted gutter may sit this far from its declared width. */
const TOLERANCE = 0.75;

/**
 * Panels are adjacent if they share enough of the perpendicular axis to have a
 * gutter between them at all, and their facing edges are within a gutter's
 * reach. Anything further apart is a non-neighbour across an intervening
 * track, which has no gutter to check.
 *
 * These travel as an argument because `collect` is serialized and evaluated in
 * the page, where this module's scope does not exist.
 */
const ADJACENCY = { overlapMin: 40, reach: 30 };

/**
 * Templates whose mounted panels deliberately overlap each other, so the space
 * between them is not a gutter and measuring it reports negative widths.
 *
 * Being mounted is not by itself a reason to skip a panel — `case-study` mounts
 * its panels and tiles them in a grid with real gutters, and skipping those
 * meant two whole pages silently measured nothing. What makes `splash-rail`
 * different is the negative margins it sets on its rail, which is a property of
 * the template rather than of the frame.
 */
const OVERLAPPING_TEMPLATES = ['splash-rail'];

function collect({ overlapMin, reach, overlappingTemplates }) {
  return [...document.querySelectorAll('.book-leaf')]
    .map((leaf) => {
      const page = leaf.querySelector('.comic-page');
      if (!page) return null;

      const panels = [...page.querySelectorAll(':scope > .panel')];
      if (panels.length === 0) return null;

      // Screen px per canvas px, read off a panel whose computed width is
      // still in canvas units while its rect is in screen units.
      const scale =
        panels[0].getBoundingClientRect().width /
        parseFloat(getComputedStyle(panels[0]).width);

      const boxes = panels.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          // A page-bleed panel underlies the whole leaf and is never part of
          // the tiling. A mounted one is only exempt on the templates that
          // overlap their mounts — see OVERLAPPING_TEMPLATES.
          bleed: el.dataset.bleed,
          frame: el.dataset.frame,
          slope: parseFloat(cs.getPropertyValue('--slope')) || 0,
          left: r.left / scale,
          right: r.right / scale,
          top: r.top / scale,
          bottom: r.bottom / scale,
        };
      });

      const overlaps = overlappingTemplates.includes(page.dataset.template);
      const grid = boxes.filter(
        (b) => b.bleed !== 'page' && !(overlaps && b.frame === 'mat'),
      );
      const rows = [];
      const cols = [];

      for (const a of grid) {
        for (const b of grid) {
          if (a === b) continue;

          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

          // b sits below a: measure the painted gap at both ends of the band,
          // since a slanted edge does not hold one distance across its width.
          if (overlapX > overlapMin && b.top > a.top && Math.abs(b.top - a.bottom) < reach) {
            rows.push(b.top + b.slope - a.bottom, b.top - (a.bottom - a.slope));
          }

          // b sits to the right of a. Vertical edges are never slanted — a
          // lean shifts both of them equally — so one measurement holds.
          if (overlapY > overlapMin && b.left > a.left && Math.abs(b.left - a.right) < reach) {
            cols.push(b.left - a.right);
          }
        }
      }

      const cs = getComputedStyle(page);
      return {
        caption: leaf.querySelector('.page-caption')?.textContent?.trim() ?? '(untitled)',
        declaredCol: parseFloat(cs.columnGap) || 0,
        declaredRow: parseFloat(cs.rowGap) || 0,
        // How many panels are actually tiling. A leaf built out of a bleed
        // splash and a rail of mounts has none, and correctly measures no
        // gutters — that is a different thing from a tiled leaf measuring
        // none, which means the walk missed it.
        tiled: grid.length,
        rows,
        cols,
      };
    })
    .filter(Boolean);
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const context = await browser.newContext({
  viewport: { width: 1600, height: 950 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();

const failures = [];
let checked = 0;

for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  const leaves = await page.evaluate(collect, {
    ...ADJACENCY,
    overlappingTemplates: OVERLAPPING_TEMPLATES,
  });
  if (leaves.length === 0) {
    failures.push(`${route} rendered no panel grid — nothing was measured`);
  }

  for (const leaf of leaves) {
    if (leaf.tiled >= 2 && leaf.rows.length === 0 && leaf.cols.length === 0) {
      failures.push(
        `${leaf.caption} tiles ${leaf.tiled} panels but no gutter was measured between any of them`,
      );
    }
    for (const [axis, measured, declared] of [
      ['row', leaf.rows, leaf.declaredRow],
      ['column', leaf.cols, leaf.declaredCol],
    ]) {
      for (const value of measured) {
        checked += 1;
        if (Math.abs(value - declared) > TOLERANCE) {
          failures.push(
            `${leaf.caption} — ${axis} gutter painted ${value.toFixed(1)}px, declared ${declared}px`,
          );
        }
      }
    }
    const fmt = (list) => (list.length ? [...new Set(list.map((v) => v.toFixed(1)))].join(', ') : '—');
    const note = leaf.tiled < 2 ? '  (mounted — no tiling)' : '';
    console.log(
      `${leaf.caption.padEnd(26)} rows ${fmt(leaf.rows).padEnd(18)} cols ${fmt(leaf.cols)}${note}`,
    );
  }
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} gutter(s) off:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`\n${checked} painted gutters match their declared width.`);
