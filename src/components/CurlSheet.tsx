'use client';

import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * A sheet of paper that bends while it turns.
 *
 * No CSS transform curves an element — `rotateY` pivots a rigid plane — so a
 * page that actually bows has to be cut into strips whose rotations compose.
 * Each strip is nested inside the one before it and rotated a few degrees
 * about its own inner edge, which chains into a polygonal approximation of a
 * cylinder. The alternative in the wild is a rigid rotation about a moving
 * crease (what StPageFlip calls a soft page); that is cheaper and it is a
 * fold, not a curl. The other alternative is a WebGL mesh, which means
 * rasterising the page and giving up live text.
 *
 * Every strip shows the same page shifted sideways and clipped to its own
 * width, so the content stays real DOM — selectable, themed, crisp.
 *
 * Driven from the Web Animations API rather than CSS keyframes: each strip
 * needs its own angle curve, and interpolating a per-strip custom property in
 * `@keyframes` would need `@property` registration plus a keyframe set per
 * strip to say what CSS cannot say about the shape of the bend anyway.
 */

/** More strips is a smoother curve and linearly more DOM. Eight is the knee. */
const SEGMENTS = 12;

/** How many angles per strip are handed to the animation. */
const SAMPLES = 24;

type CurlSheetProps = {
  /** 'forward' turns the right page left about the spine; 'back' mirrors it. */
  dir: 'forward' | 'back';
  durationMs: number;
  pageW: number;
  /** The page being turned away from. Rendered once per strip, clipped. */
  face: ReactNode;
};

/**
 * Ease the sweep so the leaf starts heavy and settles rather than snapping.
 *
 * Smoothstep rather than a cubic in-out: the cubic spent so much of the turn
 * near zero that the page appeared to sit still and ripple before suddenly
 * going over. A page turn is mostly travel.
 */
function easeSweep(t: number) {
  return t * t * (3 - 2 * t);
}

/**
 * How much the sheet is bent at a given point in the turn, in degrees spread
 * across the whole page.
 *
 * Zero at both ends and greatest in the middle: paper lies flat on the book at
 * the start, is at its most bowed when it is standing up unsupported, and has
 * flattened again by the time it lands. Skewed a little early because a page
 * bends most just after it is lifted, while its far edge is still dragging.
 */
function bendAt(t: number) {
  const arch = Math.sin(Math.PI * Math.pow(t, 0.82));
  return 58 * arch;
}

export function CurlSheet({ dir, durationMs, pageW, face }: CurlSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const segW = pageW / SEGMENTS;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const segs = Array.from(root.querySelectorAll<HTMLElement>('.curl-seg'));
    const shades = Array.from(root.querySelectorAll<HTMLElement>('.curl-shade'));
    const animations: Animation[] = [];

    // One sign for both directions. A backward turn is a forward turn seen in
    // a mirror, and the sheet is already mirrored in CSS — flipping the sign
    // here as well undid the mirror, so the bend fought the sweep going one
    // way and reinforced it going the other. The two turns were not opposites
    // of each other; they were different animations.
    const way = -1;

    for (let i = 0; i < segs.length; i++) {
      const angles: string[] = [];
      const shade: string[] = [];

      for (let s = 0; s < SAMPLES; s++) {
        const t = s / (SAMPLES - 1);
        const sweep = easeSweep(t) * 180;
        const bend = bendAt(t);

        // The strip at the spine carries the sweep exactly; every strip after
        // it adds a share of the bend, so the outer edge runs ahead by the
        // whole bend. That is the order a page actually moves in — you lift
        // the outer corner and the spine end follows.
        //
        // The spine strip used to carry `sweep - bend/2`, which is negative
        // early on because the bend ramps up faster than the sweep does: the
        // page swung a few degrees the *wrong way* before setting off. Anchor
        // it to the sweep and there is nothing to go negative.
        const share = bend / (SEGMENTS - 1);
        const deg = i === 0 ? way * sweep : way * share;
        angles.push(`rotateY(${deg.toFixed(3)}deg)`);

        // Shade from this strip's *absolute* angle, accumulated the same way
        // the transforms are. Deriving it per-strip from the sweep alone gave
        // every strip its own ramp, and twelve independent ramps side by side
        // read as vertical stripes rather than as one curved surface.
        const absolute = ((sweep + i * share) * Math.PI) / 180;

        // Darkest edge-on, and bright again once the sheet has gone over.
        // `(1 - cos)/2` keeps climbing to 180° and painted the reverse of the
        // page a flat grey: a page lying face-down is still lit, it is only
        // dark while it is standing up. `1 - |cos|` is that, and it is the
        // same value on both faces, which is what a thin sheet does.
        const edgeOn = 1 - Math.abs(Math.cos(absolute));
        shade.push(String((edgeOn * 0.46).toFixed(3)));
      }

      animations.push(
        segs[i].animate(
          angles.map((transform) => ({ transform })),
          { duration: durationMs, easing: 'linear', fill: 'both' },
        ),
      );

      if (shades[i]) {
        animations.push(
          shades[i].animate(
            shade.map((opacity) => ({ opacity })),
            { duration: durationMs, easing: 'linear', fill: 'both' },
          ),
        );
      }
    }

    return () => animations.forEach((animation) => animation.cancel());
  }, [dir, durationMs]);

  // Built inside out, so strip i ends up nested in strip i-1 and inherits its
  // rotation — which is the whole mechanism.
  let stack: ReactNode = null;
  for (let i = SEGMENTS - 1; i >= 0; i--) {
    const style = {
      width: segW,
      // Every strip but the first hangs off the outer edge of the one before.
      left: i === 0 ? 0 : segW,
      ['--shift' as string]: `${-i * segW}px`,
    } as CSSProperties;

    stack = (
      <div className="curl-seg" style={style} key={i}>
        <div className="curl-window">
          <div className="curl-page">{face}</div>
        </div>
        {/* Bare stock: the page being turned to has not been drawn yet. */}
        <div className="curl-window curl-window--back">
          <div className="curl-page curl-page--blank" />
        </div>
        <span className="curl-shade" aria-hidden="true" />
        {stack}
      </div>
    );
  }

  return (
    <>
      {/* What the raised leaf throws onto the spread underneath. Outside the
          sheet's own 3D space on purpose — it belongs to the pages being
          shadowed, not to the paper casting it, and inside `preserve-3d` it
          would rotate away with the strip it was attached to. */}
      <span
        className="turn-cast"
        data-dir={dir}
        style={{ animationDuration: `${durationMs}ms` }}
        aria-hidden="true"
      />
      <div className="curl-sheet" data-dir={dir} ref={rootRef} aria-hidden="true">
        {stack}
      </div>
    </>
  );
}
