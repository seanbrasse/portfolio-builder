import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { siteUrl } from '@/lib/site';
import { PALETTES } from '@/lib/tokens';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/**
 * Satori rasterises with a real font file rather than a CSS stack, and it
 * cannot read woff2 — hence this TTF alongside the woff2 the site itself
 * loads. Same typeface, same subset, different container.
 */
async function displayFont(): Promise<ArrayBuffer> {
  const path = join(process.cwd(), 'src/assets/display.ttf');
  const file = await readFile(path);
  return Uint8Array.from(file).buffer;
}

/**
 * TECH-2: the social card, in the site's default palette.
 *
 * Recruiters share links and the preview is the first impression, so this is
 * the one surface that has to work with no CSS, no JavaScript, and no theme
 * switch. It reads colours from the light palette directly — the design
 * system's default — because Satori has no cascade to resolve custom properties
 * against; the values still come from `tokens.ts`, so there is no second source
 * of truth, and the card previews in the same colours the site opens in.
 */
export async function renderOgImage({
  caption,
  title,
  subtitle,
}: {
  caption: string;
  title: string;
  subtitle: string;
}) {
  const palette = PALETTES.light;
  const font = await displayFont();
  // The bare host, as the address the card opens — no protocol, uppercased to
  // sit with the card's other lines.
  const host = siteUrl().replace(/^https?:\/\//, '').toUpperCase();

  // One clean surface, no frame. The bold comic-cover border this used to carry
  // is gone — the card now reads as a plain, generously-padded panel in the
  // design system's colours, with room between each line rather than the tight
  // stack it had.
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: palette.paperLit,
          padding: 72,
          fontFamily: 'Display',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            background: palette.accentC,
            // Text sized for the accent fill, not the page ink — on the orange
            // caption chip that is the light `onAccentC`, so it reads clearly.
            color: palette.onAccentC,
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 30,
            letterSpacing: 2,
          }}
        >
          {caption}
        </div>

        <div
          style={{
            display: 'flex',
            color: palette.accentB,
            fontSize: 96,
            lineHeight: 1,
            marginTop: 40,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            color: palette.accentA,
            fontSize: 34,
            lineHeight: 1.25,
            letterSpacing: 2,
            marginTop: 26,
          }}
        >
          {subtitle}
        </div>

        <div style={{ display: 'flex', flex: 1 }} />

        {/* A call to action rather than the name and location again — both are
            already above, in the title and the caption chip. The card is the
            link, so this says where it goes: an invitation on the left and the
            address it opens on the right. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          <div style={{ display: 'flex', color: palette.accentA }}>VIEW THE FULL PORTFOLIO →</div>
          <div style={{ display: 'flex', color: palette.inkMuted }}>{host}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: 'Display', data: font, style: 'normal', weight: 400 }],
    },
  );
}
