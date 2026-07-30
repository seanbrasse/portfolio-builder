'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type GuidedViewProps = {
  style: CSSProperties;
  panelCount: number;
  /** 1-based position of this page within the issue, for the progress line. */
  pageNumber: number;
  totalPages: number;
  children: ReactNode;
};

/**
 * Two jobs that both need a ref to the panel container, so they share one.
 *
 * 1. MOTION-2 — the ink-in sequence fires once, when the page first enters the
 *    viewport, and never replays on scroll-back. Panels re-animating every
 *    time you scroll past is the single most irritating thing a site like this
 *    can do.
 *
 * 2. COMP-7 — position within the page, read from the native scroll-snap
 *    container. The scrolling itself is CSS; this only reports where it got
 *    to, which is why swipe still works with JavaScript disabled.
 */
export function GuidedView({
  style,
  panelCount,
  pageNumber,
  totalPages,
  children,
}: GuidedViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Not `prefers-reduced-motion` aware here on purpose: the CSS collapses
    // the sequence to a 120ms fade under that preference, so the class is
    // still the right thing to add. One implementation, in CSS.
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-inking');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-inking');
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const { scrollLeft, clientWidth } = node;
        if (clientWidth === 0) return;
        const index = Math.round(scrollLeft / clientWidth);
        setCurrent(Math.min(Math.max(index, 0), panelCount - 1));
      });
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [panelCount]);

  return (
    <>
      <div
        ref={ref}
        className="comic-page"
        style={{ ...style, ['--panel-count' as string]: panelCount }}
      >
        {children}
      </div>

      {/* Below 768px only — hidden by a media query rather than unmounted, so
          rotating a phone to landscape does not remount the page. */}
      <div className="guided-progress">
        <span>
          Panel {current + 1}/{panelCount}
        </span>
        <ul className="guided-pips" aria-hidden="true">
          {Array.from({ length: panelCount }, (_, i) => (
            <li key={i} data-current={i === current || undefined} />
          ))}
        </ul>
        <span className="index-spacer" />
        <span>
          Page {pageNumber}/{totalPages}
        </span>
      </div>
    </>
  );
}
