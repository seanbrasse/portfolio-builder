'use client';

import { useEffect, useRef, useState } from 'react';

import { PALETTES, type Theme } from '@/lib/tokens';

/**
 * A live preview of the social (Open Graph) card, for the admin.
 *
 * The card itself is rasterised by Satori in `src/lib/og.tsx` from a real font
 * file, which cannot run in the browser — so this is a faithful HTML/CSS replica
 * of that layout. Every measurement is the same fraction of the card's width the
 * generator uses, expressed in `cqw` against the `.og-preview` container, so it
 * scales to whatever width the preview is given.
 *
 * Colours are read straight from `PALETTES` — the same source `og.tsx` reads —
 * rather than from the admin's theme custom properties, so the preview shows the
 * card's own palette regardless of which theme the admin is in, and a light/dark
 * toggle lets the editor see it either way. The shipped card renders in the
 * site's default (light) palette.
 *
 * It reads the form's fields live: on mount it finds the surrounding form and
 * mirrors the name, location and subtitle inputs, updating on every keystroke.
 * The card draws its lines in uppercase, so the preview does too, while the
 * fields stay natural case to type into.
 */
export function OgPreview({
  displayName,
  location,
  subtitle,
}: {
  displayName: string;
  location: string;
  subtitle: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState({ displayName, location, subtitle });
  const [mode, setMode] = useState<Theme>('light');
  const p = PALETTES[mode];

  useEffect(() => {
    const form = root.current?.closest('form');
    if (!form) return;

    const field = (name: string, fallback: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
      return el ? el.value : fallback;
    };

    const read = () =>
      setValues({
        displayName: field('display_name', displayName),
        location: field('location', location),
        subtitle: field('og_subtitle', subtitle),
      });

    read();
    form.addEventListener('input', read);
    return () => form.removeEventListener('input', read);
  }, [displayName, location, subtitle]);

  const up = (value: string) => value.toUpperCase();

  return (
    <div ref={root} className="og-preview">
      <div className="og-preview-head">
        <span className="field-label">Social card preview</span>
        <div className="og-preview-modes" role="group" aria-label="Preview theme">
          <button
            type="button"
            className="og-preview-mode"
            data-active={mode === 'light' || undefined}
            aria-pressed={mode === 'light'}
            onClick={() => setMode('light')}
          >
            Light
          </button>
          <button
            type="button"
            className="og-preview-mode"
            data-active={mode === 'dark' || undefined}
            aria-pressed={mode === 'dark'}
            onClick={() => setMode('dark')}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Colours inline from the chosen palette; layout in `cqw` so it scales.
          Matches og.tsx line for line. */}
      <div className="og-card" aria-hidden="true" style={{ background: p.paperLit }}>
        <span className="og-card-caption" style={{ background: p.accentC, color: p.onAccentC }}>
          {up(values.location)}
        </span>
        <span className="og-card-title" style={{ color: p.accentB }}>
          {up(values.displayName)}
        </span>
        <span className="og-card-subtitle" style={{ color: p.accentA }}>
          {up(values.subtitle)}
        </span>
        <span className="og-card-spacer" />
        <span className="og-card-foot" style={{ color: p.ink }}>
          <span>{up(values.displayName)}</span>
          <span>{up(values.location)}</span>
        </span>
      </div>
    </div>
  );
}
