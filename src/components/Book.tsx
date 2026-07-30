'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type { Page } from '@/content/types';
import { PAGE_H, PAGE_W, buildLeaves, buildSpreads, leafIndexForSlug, spreadIndexForSlug } from '@/lib/book';

import { BookLeaf } from './BookLeaf';

/** The rail lives outside the book, so it asks to move rather than routing. */
export const GOTO_EVENT = 'comic-portfolio:goto';
/** ...and the book says where it ended up, so the rail can follow. */
export const TURNED_EVENT = 'comic-portfolio:turned';

type BookProps = {
  pages: Page[];
  initialSlug: string | null;
};

export function Book({ pages, initialSlug }: BookProps) {
  const leaves = buildLeaves(pages);
  const spreads = buildSpreads(leaves);

  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // `null` until measured, so the book never paints at the wrong size first.
  const [single, setSingle] = useState<boolean | null>(null);
  const [fit, setFit] = useState(0);
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null);

  const count = single ? leaves.length : spreads.length;

  // A closed book shows one board, not a blank facing page. The opening
  // spread is one leaf wide; every spread after it is two.
  const pagesWide = single || !spreads[index]?.left ? 1 : 2;

  // Layout effect: the first paint already has the right scale, so the book
  // does not visibly resize itself on load.
  useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const isSingle = window.matchMedia('(max-width: 899px)').matches;
      setSingle(isSingle);

      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const stageW = PAGE_W * (isSingle || !spreads[index]?.left ? 1 : 2);

      // Contain, never cover: a page that overflowed its box would need
      // scrolling, which is the one thing this format cannot have.
      setFit(Math.min(width / stageW, height / PAGE_H));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // Re-measures on turn too, because the opening spread is narrower.
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open to whatever the URL asked for, once we know which mode we are in.
  useEffect(() => {
    if (single === null) return;
    setIndex(single ? leafIndexForSlug(leaves, initialSlug) : spreadIndexForSlug(spreads, initialSlug));
    // Re-deriving on mode change keeps the reader on the same content when a
    // window crosses the breakpoint mid-read.
  }, [single, initialSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (next: number) => {
      setIndex((current) => {
        const clamped = Math.max(0, Math.min(next, count - 1));
        if (clamped === current) return current;
        setTurning(clamped > current ? 'forward' : 'back');
        return clamped;
      });
    },
    [count],
  );

  // The turn is a CSS animation; this only clears the flag when it ends.
  useEffect(() => {
    if (!turning) return;
    const timer = window.setTimeout(() => setTurning(null), 420);
    return () => window.clearTimeout(timer);
  }, [turning, index]);

  // Keep the URL honest without routing, so a flip is not a page load and the
  // reader can still copy a link to where they are (ACC-8 companion).
  useEffect(() => {
    if (single === null) return;
    const leaf = single
      ? leaves[index]
      : (spreads[index]?.right ?? spreads[index]?.left ?? null);
    const slug = leaf?.kind === 'page' ? leaf.page.slug : null;
    const path = slug ? `/${slug}` : '/';
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path + window.location.search);
    }
    // A turn is not a navigation, so nothing else would learn about it.
    window.dispatchEvent(new CustomEvent(TURNED_EVENT, { detail: { slug } }));
  }, [index, single]); // eslint-disable-line react-hooks/exhaustive-deps

  // ACC-8: arrows turn pages. Ignores anything typed into a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [go, index]);

  // The rail asks the book to move rather than navigating, so jumping to a
  // page from outside the book is the same motion as turning to it.
  useEffect(() => {
    if (single === null) return;
    const onGoto = (event: Event) => {
      const slug = (event as CustomEvent<{ slug: string | null }>).detail?.slug ?? null;
      go(single ? leafIndexForSlug(leaves, slug) : spreadIndexForSlug(spreads, slug));
    };
    window.addEventListener(GOTO_EVENT, onGoto);
    return () => window.removeEventListener(GOTO_EVENT, onGoto);
  }, [go, single]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe, which is how a book is turned on a phone.
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (start === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 45) return;
    go(delta < 0 ? index + 1 : index - 1);
  };

  const stageStyle = {
    width: PAGE_W * pagesWide,
    height: PAGE_H,
    transform: `scale(${fit})`,
    ['--page-w' as string]: `${PAGE_W}px`,
    ['--page-h' as string]: `${PAGE_H}px`,
  } as CSSProperties;

  const current = single ? null : spreads[index];

  return (
    <div className="book" ref={viewportRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {fit > 0 && single !== null ? (
        <div
          className="book-stage"
          ref={stageRef}
          style={stageStyle}
          data-turning={turning ?? undefined}
        >
          {single ? (
            <div className="book-leaf is-inking" key={index}>
              <BookLeaf leaf={leaves[index]} />
            </div>
          ) : (
            <>
              {current?.left ? (
                <div className="book-leaf book-leaf--left is-inking" key={`l${index}`}>
                  <BookLeaf leaf={current.left} />
                </div>
              ) : null}
              {current?.right ? (
                <div className="book-leaf book-leaf--right is-inking" key={`r${index}`}>
                  <BookLeaf leaf={current.right} />
                </div>
              ) : null}
              {current?.left && current?.right ? (
                <span className="book-spine" aria-hidden="true" />
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="book-turn book-turn--back"
        onClick={() => go(index - 1)}
        disabled={index === 0}
        aria-label="Previous page"
      >
        ‹
      </button>
      <button
        type="button"
        className="book-turn book-turn--next"
        onClick={() => go(index + 1)}
        disabled={index >= count - 1}
        aria-label="Next page"
      >
        ›
      </button>

      <p className="book-progress" aria-live="polite">
        {single ? `Page ${index + 1} of ${count}` : `Spread ${index + 1} of ${count}`}
      </p>
    </div>
  );
}
