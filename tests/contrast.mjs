/**
 * ACC-3: measure text contrast in both themes against the *composited*
 * background, not against the token the element nominally sits on. A card sits
 * on a surface which sits on the paper, and translucent fills mean the pixel a
 * reader actually sees is not any single token value.
 *
 * Method: collect every text-bearing element, then make all text transparent
 * and screenshot. Sampling that image at each element's box gives the true
 * background it is drawn over.
 *
 * The screenshot is full-page and boxes are in *document* coordinates, because
 * the site is one long scrolling page. A viewport-sized capture would have
 * measured the hero and silently skipped everything below the fold, which is
 * most of the site.
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = process.env.BASE || 'http://localhost:3000';
const ROUTES = ['/'];
const THEMES = ['dark', 'light'];

function srgb(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum([r, g, b]) {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
function parseColor(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((n) => parseFloat(n));
  if (p.length === 4 && p[3] < 0.5) return null;
  return [p[0], p[1], p[2]];
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const failures = [];
let checked = 0;

for (const theme of THEMES) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      // Nothing on the page animates into place, but reduced motion also
      // disables smooth scrolling, which keeps the capture deterministic.
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}?theme=${theme}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const items = await page.evaluate(() => {
      const out = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();

      /**
       * The rect a reader can actually see, which is not the element's own rect.
       * Plain view scrolls inside `main`, not the window, so an element below
       * `main`'s bottom edge is clipped away while still reporting coordinates
       * inside the viewport. Sampling those coordinates reads whatever is
       * painted under the scroll container — the rail — and calls it the
       * element's background.
       *
       * Intersecting with every clipping ancestor is what makes the sampled
       * pixel and the seen pixel the same thing again.
       */
      const visibleRect = (el) => {
        const r = el.getBoundingClientRect();
        // Document coordinates: the full-page screenshot is the document, not
        // the viewport, so a viewport-relative box would sample the wrong rows
        // for anything below the fold.
        const box = {
          left: r.left + scrollX,
          top: r.top + scrollY,
          right: r.right + scrollX,
          bottom: r.bottom + scrollY,
        };
        for (let p = el.parentElement; p; p = p.parentElement) {
          const pcs = getComputedStyle(p);
          const clips =
            pcs.overflow !== 'visible' ||
            pcs.overflowX !== 'visible' ||
            pcs.overflowY !== 'visible';
          if (!clips) continue;
          const pr = p.getBoundingClientRect();
          box.left = Math.max(box.left, pr.left + scrollX);
          box.top = Math.max(box.top, pr.top + scrollY);
          box.right = Math.min(box.right, pr.right + scrollX);
          box.bottom = Math.min(box.bottom, pr.bottom + scrollY);
        }
        box.left = Math.max(box.left, 0);
        box.top = Math.max(box.top, 0);
        box.right = Math.min(box.right, document.documentElement.scrollWidth);
        box.bottom = Math.min(box.bottom, document.documentElement.scrollHeight);
        return box;
      };

      let node;
      while ((node = walk.nextNode())) {
        const text = node.textContent.trim();
        if (!text) continue;
        const el = node.parentElement;
        if (!el || seen.has(el)) continue;
        if (el.closest('[aria-hidden="true"], .sr-only, .skip-link')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const clipped = visibleRect(el);
        const r = {
          x: clipped.left,
          y: clipped.top,
          width: clipped.right - clipped.left,
          height: clipped.bottom - clipped.top,
        };
        // Anything smaller than this is scrolled off or occluded, so there is
        // no visible text to measure.
        if (r.width < 4 || r.height < 4) continue;
        seen.add(el);
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        out.push({
          label: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`,
          sample: text.slice(0, 42),
          color: cs.color,
          size,
          large: size >= 24 || (size >= 18.66 && weight >= 700),
          box: { x: r.x, y: r.y, w: r.width, h: r.height },
        });
      }
      return out;
    });

    // The sticky header would otherwise be captured floating over whatever it
    // happened to be scrolled past, painting its own background across text it
    // does not actually cover in the reader's view.
    await page.addStyleTag({ content: '.site-header { position: static !important; }' });

    await page.addStyleTag({
      content: `*, *::before, *::after, *::marker {
          color: transparent !important;
          -webkit-text-stroke-color: transparent !important;
          text-shadow: none !important;
        }
        /* Markers are painted in the text colour and would read as a glyph's
           own background. Hiding them by colour keeps the layout identical;
           list-style none would reflow the page that was just measured. */`,
    });
    await page.waitForTimeout(150);
    const buf = await page.screenshot({ fullPage: true });
    const png = PNG.sync.read(buf);

    const pixel = (x, y) => {
      x = Math.max(0, Math.min(png.width - 1, Math.round(x)));
      y = Math.max(0, Math.min(png.height - 1, Math.round(y)));
      const i = (png.width * y + x) << 2;
      return [png.data[i], png.data[i + 1], png.data[i + 2]];
    };

    for (const item of items) {
      const fg = parseColor(item.color);
      if (!fg) continue;
      // Sample a spread of points across the element's box and keep the worst
      // one — halftone dots mean the background is not uniform.
      const pts = [];
      for (let fx = 0.1; fx <= 0.9; fx += 0.2) {
        for (let fy = 0.2; fy <= 0.8; fy += 0.3) {
          pts.push(pixel(item.box.x + item.box.w * fx, item.box.y + item.box.h * fy));
        }
      }
      let worst = Infinity;
      let worstBg = null;
      for (const bg of pts) {
        const r = ratio(fg, bg);
        if (r < worst) {
          worst = r;
          worstBg = bg;
        }
      }
      checked++;
      const need = item.large ? 3 : 4.5;
      if (worst < need) {
        failures.push({
          theme,
          route,
          el: item.label,
          text: item.sample,
          size: item.size,
          need,
          got: Number(worst.toFixed(2)),
          fg: item.color,
          bg: `rgb(${worstBg.join(',')})`,
        });
      }
    }

    await ctx.close();
  }
}

await browser.close();
console.log(`checked ${checked} text elements across ${THEMES.length} themes`);
if (failures.length === 0) {
  console.log('PASS — every measured text element meets WCAG AA');
} else {
  console.log(`FAIL — ${failures.length} below AA:`);
  for (const f of failures) console.log(JSON.stringify(f));
  process.exitCode = 1;
}
