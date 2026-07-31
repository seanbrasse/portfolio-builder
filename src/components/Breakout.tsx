import type { CSSProperties } from 'react';

import { Skyline } from './Skyline';

/**
 * Art that crosses panel borders.
 *
 * A panel is a panel *because* it clips its contents, so nothing inside one can
 * ever cross out of it — the thing that breaks the frame has to live above the
 * grid entirely. This is that layer: it sits over the panels, takes no pointer
 * events, and positions its pieces in page coordinates.
 *
 * Page coordinates are safe here in a way they would not be in a flowed
 * layout. A leaf is a fixed 880x1140 canvas that gets scaled as a whole, so a
 * percentage of the page is the same slice of the composition on every screen,
 * and a figure aimed at a particular gutter stays on that gutter.
 *
 * Everything here is decoration and carries `aria-hidden`. Nothing in this
 * layer may be the only place a fact appears — the panels own the content, and
 * plain view walks the panels.
 */

export type BreakoutKind =
  | 'skyline-band'
  | 'speed-streak'
  | 'burst-star';

export type BreakoutSpec = {
  kind: BreakoutKind;
  /** Percentages of the page box. */
  x: number;
  y: number;
  w: number;
  h?: number;
  rotate?: number;
  /** Which accent it inks in; omitted means ink. */
  accent?: 'a' | 'b' | 'c';
  opacity?: number;
};

function Streak() {
  // Speed lines, drawn as tapering wedges so they read as motion rather than
  // as a set of parallel rules.
  return (
    <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
      {[8, 30, 54, 76, 100].map((y, i) => (
        <polygon
          key={y}
          points={`0,${y} ${230 + i * 12},${y + 2} ${230 + i * 12},${y + 7} 0,${y + 11}`}
        />
      ))}
    </svg>
  );
}

function BurstStar() {
  const points = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? 50 : 30;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={points} />
    </svg>
  );
}

export function Breakout({ spec }: { spec: BreakoutSpec }) {
  const style = {
    left: `${spec.x}%`,
    top: `${spec.y}%`,
    width: `${spec.w}%`,
    ...(spec.h ? { height: `${spec.h}%` } : {}),
    ...(spec.rotate ? { transform: `rotate(${spec.rotate}deg)` } : {}),
    ...(spec.opacity ? { opacity: spec.opacity } : {}),
  } as CSSProperties;

  return (
    <div
      className="breakout"
      data-kind={spec.kind}
      data-accent={spec.accent}
      style={style}
      aria-hidden="true"
    >
      {spec.kind === 'skyline-band' ? <Skyline /> : null}
      {spec.kind === 'speed-streak' ? <Streak /> : null}
      {spec.kind === 'burst-star' ? <BurstStar /> : null}
    </div>
  );
}

/** The layer itself, rendered above a leaf's panel grid. */
export function BreakoutLayer({ specs }: { specs: BreakoutSpec[] }) {
  if (specs.length === 0) return null;
  return (
    <div className="breakout-layer" aria-hidden="true">
      {specs.map((spec, i) => (
        <Breakout key={`${spec.kind}-${i}`} spec={spec} />
      ))}
    </div>
  );
}
