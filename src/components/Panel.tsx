import type { CSSProperties, ReactNode } from 'react';

import type { PanelOverrides, Sfx } from '@/content/types';

type PanelProps = {
  /** Named grid area from the page template. */
  slot: string;
  overrides?: PanelOverrides;
  /** Panels that contain a link get the hover lift (MOTION-5). */
  interactive?: boolean;
  /** Rendered with no lettering, for a deliberately quiet slot (COMP-4). */
  empty?: boolean;
  className?: string;
  sfx?: Sfx;
  children?: ReactNode;
};

/**
 * The panel shell: ink plate, paper plate, flat, screen, lettering — the order
 * a comic page is actually made in.
 *
 * The border is the panel's own background showing through a slightly smaller
 * plate laid on top of it, rather than four rules along the edges. The rules
 * existed so the ink could be drawn on one edge at a time; that animation is
 * gone, and once it went they were four elements doing what one background
 * already does. They also could not follow a border that is not a rectangle,
 * which is the whole point of `data-shape` — a clip-path takes no border, so a
 * panel cut on the diagonal had no way to ink its own edge.
 *
 * Both plates take the same `--shape`, and the inner one is inset by the ink
 * weight. The inset is a plain `inset`, not a scale: scaling a wide panel by a
 * percentage gives a thick top and a thin side, which is the same failure mode
 * that ruled out an SVG stroke here in the first place.
 */
export function Panel({
  slot,
  overrides,
  interactive = false,
  empty = false,
  className,
  sfx,
  children,
}: PanelProps) {
  const accent = overrides?.accent ?? 'a';
  const showScreen = overrides?.screen !== false;
  const fill = overrides?.fill ?? 'tint';
  const shape = overrides?.shape ?? 'rect';
  const rays = overrides?.rays === true;
  const bleed = overrides?.bleed;

  const style = {
    gridArea: slot,
    ...(overrides?.tilt ? { '--tilt': `${overrides.tilt}deg` } : {}),
    ...(overrides?.layer ? { zIndex: overrides.layer } : {}),
  } as CSSProperties;

  return (
    <article
      className={['panel', className].filter(Boolean).join(' ')}
      style={style}
      data-accent={accent}
      data-fill={fill}
      data-shape={shape}
      data-rays={rays || undefined}
      data-bleed={bleed}
      data-interactive={interactive || undefined}
      data-empty={empty || undefined}
    >
      {/* The paper the panel is printed on, inset inside the ink. */}
      <span className="panel-plate" aria-hidden="true">
        <span className="panel-fill" />
        {showScreen ? <span className="panel-screen" /> : null}
      </span>

      <div className="panel-body">{children}</div>

      {/* ACC-6: decoration. A screen reader announcing "SHIP IT!" is noise. */}
      {sfx ? (
        <span
          className="sfx"
          aria-hidden="true"
          style={{ '--sfx-rotate': `${sfx.rotate ?? -11}deg` } as CSSProperties}
        >
          {sfx.text}
        </span>
      ) : null}
    </article>
  );
}
