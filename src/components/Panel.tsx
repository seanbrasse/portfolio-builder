import type { CSSProperties, ReactNode } from 'react';

import type { PanelOverrides, Sfx } from '@/content/types';

type PanelProps = {
  /** Named grid area from the page template. */
  slot: string;
  /** Reading-order index. Drives the animation stagger and nothing else. */
  index: number;
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
 * The panel shell: four layers in the order a comic page is actually made.
 *
 * The border is four rules rather than a CSS border or an SVG stroke, so the
 * ink can be drawn on one edge at a time. Its resting state is the finished
 * state, so the border renders identically whether or not the animation ever
 * runs — see the note in globals.css.
 */
export function Panel({
  slot,
  index,
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

  const style = {
    gridArea: slot,
    '--i': index,
    ...(overrides?.tilt ? { '--tilt': `${overrides.tilt}deg` } : {}),
  } as CSSProperties;

  return (
    <article
      className={['panel', className].filter(Boolean).join(' ')}
      style={style}
      data-accent={accent}
      data-fill={fill}
      data-shape={shape}
      data-interactive={interactive || undefined}
      data-empty={empty || undefined}
    >
      <span className="panel-fill" aria-hidden="true" />
      {showScreen ? <span className="panel-screen" aria-hidden="true" /> : null}

      {/* The border, as four rules rather than an SVG stroke. Each one scales
          in from the corner the previous one finished at, so the ink travels
          around the panel clockwise. See the note in globals.css for why this
          beat a dashed stroke. */}
      <span className="panel-rule panel-rule--t" aria-hidden="true" />
      <span className="panel-rule panel-rule--r" aria-hidden="true" />
      <span className="panel-rule panel-rule--b" aria-hidden="true" />
      <span className="panel-rule panel-rule--l" aria-hidden="true" />
      {/* The inked edge across a cut corner. The panel's clip-path removes the
          corner; this draws the diagonal that replaces it. */}
      {shape === 'canted' ? (
        <span className="panel-rule panel-rule--cut" aria-hidden="true" />
      ) : null}

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
