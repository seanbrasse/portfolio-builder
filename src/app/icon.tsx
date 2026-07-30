import { ImageResponse } from 'next/og';

import { PALETTES } from '@/lib/tokens';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * A single inked panel with the initials in it — the smallest thing that still
 * reads as this site. Generated from the palette rather than checked in as an
 * asset, so a change to the tokens carries into the tab icon too.
 *
 * Four-color only: a favicon cannot respond to the theme switch, and the
 * default palette is what a first-time visitor sees.
 */
export default function Icon() {
  const palette = PALETTES['four-color'];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: palette.accentC,
          border: `6px solid ${palette.ink}`,
          color: palette.ink,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        SB
      </div>
    ),
    size,
  );
}
