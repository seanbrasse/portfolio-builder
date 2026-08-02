'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A live preview of the social (Open Graph) card, for the admin.
 *
 * The card itself is rasterised by Satori in `src/lib/og.tsx` from a real font
 * file, which cannot run in the browser — so this is a faithful HTML/CSS
 * replica of that layout rather than the PNG. Same proportions (a 1200×630
 * card, every measurement expressed as a fraction of its width in `cqw` so it
 * scales to whatever width the preview is given) and the same colours, read
 * from the light palette's custom properties — which is the palette the card is
 * always rendered in, and the admin's own theme, so the two match.
 *
 * It reads the form's fields live: on mount it finds the surrounding form and
 * mirrors the name, location and subtitle inputs, updating on every keystroke.
 * That keeps the preview honest about unsaved edits without turning the whole
 * (deliberately uncontrolled) settings form into controlled inputs. The card
 * draws its lines in uppercase, so the preview does too, while the field below
 * stays natural case to type into.
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
    <div ref={root} className="og-preview" aria-hidden="true">
      <div className="og-card">
        <div className="og-card-inner">
          <span className="og-card-caption">{up(values.location)}</span>
          <span className="og-card-title">{up(values.displayName)}</span>
          <span className="og-card-subtitle">{up(values.subtitle)}</span>
          <span className="og-card-spacer" />
          <span className="og-card-foot">
            <span>{up(values.displayName)}</span>
            <span>{up(values.location)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
