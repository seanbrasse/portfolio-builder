/**
 * ACC-3: measure text contrast in both themes against the *composited*
 * background, not against the token the element nominally sits on. Panels
 * stack a translucent flat and a halftone screen over the paper, so the pixel
 * a reader actually sees is not any single token value.
 *
 * Method: collect every text-bearing element, then make all text transparent
 * and screenshot. Sampling that image at each element's box gives the true
 * background it is drawn over.
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = process.env.BASE || 'http://localhost:3000';
const ROUTES = ['/', '/work', '/builds', '/contact', '/plain'];
const THEMES = ['four-color', 'noir'];

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
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}?theme=${theme}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const items = await page.evaluate(() => {
      const out = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      let node;
      while ((node = walk.nextNode())) {
        const text = node.textContent.trim();
        if (!text) continue;
        const el = node.parentElement;
        if (!el || seen.has(el)) continue;
        // SFX is aria-hidden decoration with an ink outline; it is not read as
        // text and the outline is what carries its legibility.
        if (el.closest('[aria-hidden="true"], .sfx, .sr-only, .skip-link')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue;
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

    await page.addStyleTag({
      content: `*, *::before, *::after { color: transparent !important;
        -webkit-text-stroke-color: transparent !important; }`,
    });
    await page.waitForTimeout(150);
    const buf = await page.screenshot({ fullPage: false });
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
