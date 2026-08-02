import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { getSettings } from '@/content';
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
  const settings = await getSettings();
  const palette = PALETTES.light;
  const font = await displayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: palette.paper,
          padding: 40,
          fontFamily: 'Display',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            border: `10px solid ${palette.ink}`,
            // Flat, with no halftone: Satori has no radial-gradient, and the
            // alternatives (a tiled data-URI, hundreds of dot elements) cost
            // build time and legibility for a texture nobody sees at the size
            // a social card is actually rendered.
            background: palette.paperLit,
            padding: 44,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: palette.accentC,
              border: `6px solid ${palette.ink}`,
              // Text sized for the accent fill, not the page ink — on the orange
              // caption chip that is the light `onAccentC`, so it reads clearly
              // rather than dark-on-orange.
              color: palette.onAccentC,
              padding: '8px 20px',
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
              fontSize: 104,
              lineHeight: 1,
              marginTop: 28,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: 'flex',
              color: palette.accentA,
              fontSize: 40,
              letterSpacing: 3,
              marginTop: 14,
            }}
          >
            {subtitle}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              color: palette.ink,
              fontSize: 30,
              letterSpacing: 2,
            }}
          >
            <div style={{ display: 'flex' }}>{settings.displayName.toUpperCase()}</div>
            <div style={{ display: 'flex' }}>{settings.location.toUpperCase()}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: 'Display', data: font, style: 'normal', weight: 400 }],
    },
  );
}
