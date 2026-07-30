'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { Page } from '@/content/types';
import { PAGE_H, PAGE_W, buildLeaves, buildSpreads, leafIndexForSlug, spreadIndexForSlug } from '@/lib/book';

import { BookLeaf } from './BookLeaf';

/** The rail lives outside the book, so it asks to move rather than routing. */
export const GOTO_EVENT = 'comic-portfolio:goto';

/**
 * ...and what is currently open is published as a store rather than an event,
 * because an event only reaches listeners that already exist. The book
 * announces its opening position from a mount effect, which can land before
 * the rail has subscribed; the rail would then fall back to the URL, and the
 * URL can only ever name one page even when a spread is showing two.
 *
 * `useSyncExternalStore` re-reads the snapshot after subscribing, so a reader
 * that arrives late still sees the current value.
 */
const CLOSED: (string | null)[] = [null];
let openPages: (string | null)[] = CLOSED;
const openListeners = new Set<() => void>();

export function subscribeToOpenPages(onChange: () => void) {
  openListeners.add(onChange);
  return () => {
    openListeners.delete(onChange);
  };
}

/** Must stay referentially stable while unchanged, or it re-renders forever. */
export function getOpenPages() {
  return openPages;
}

/** The server cannot know which spread is open, so it renders the cover. */
export function getServerOpenPages() {
  return CLOSED;
}

function setOpenPages(next: (string | null)[]) {
  const same =
    next.length === openPages.length && next.every((slug, i) => slug === openPages[i]);
  if (same) return;
  openPages = next;
  for (const listener of openListeners) listener();
}

type BookProps = {
  pages: Page[];
  initialSlug: string | null;
};

const NARROW = '(max-width: 899px)';

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Which reading mode we are in is owned by the browser, not by React, so it is
 * read as an external store rather than synced into state by an effect. The
 * inner book is keyed on it: crossing the breakpoint is a different book with
 * a different pagination, and remounting derives the opening position cleanly
 * instead of correcting it after a paint.
 */
export function Book({ pages, initialSlug }: BookProps) {
  const single = useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );

  return (
    <BookInner
      key={single ? 'single' : 'spread'}
      pages={pages}
      initialSlug={initialSlug}
      single={single}
    />
  );
}

function BookInner({ pages, initialSlug, single }: BookProps & { single: boolean }) {
  const leaves = buildLeaves(pages);
  const spreads = buildSpreads(leaves);

  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [fit, setFit] = useState(0);
  // Derived once, at mount, from the URL — the component is remounted when the
  // mode changes, so there is nothing to re-sync later.
  const [index, setIndex] = useState(() =>
    single ? leafIndexForSlug(leaves, initialSlug) : spreadIndexForSlug(spreads, initialSlug),
  );
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

      // The viewport is the free area itself — no padding of its own, and the
      // progress line is outside it — so these are the real bounds rather than
      // a box the stage has to be trusted not to overflow.
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const stageW = PAGE_W * pagesWide;

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
  }, [pagesWide]);

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
    // A spread shows two pages at once, so what is open is a list rather than
    // a single slug — the rail marks every page currently in front of the
    // reader. `null` stands for the cover, which has no slug of its own.
    const open = single ? [leaves[index]] : [spreads[index]?.left, spreads[index]?.right];
    const slugs = open
      .filter((leaf) => leaf != null)
      .map((leaf) => (leaf.kind === 'page' ? leaf.page.slug : null));

    // The URL names the rightmost page, which is the one a reader would say
    // they are on when two are open.
    const slug = slugs.length > 0 ? slugs[slugs.length - 1] : null;
    const path = slug ? `/${slug}` : '/';
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path + window.location.search);
    }
    // A turn is not a navigation, so nothing else would learn about it.
    setOpenPages(slugs);
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

  // The rendered width of the open book, which is what the turn arrows sit
  // beside. They belong to the pages, not to the window: pinned to the screen
  // edges they drift half a metre away from a book that is scaled down to fit
  // a wide monitor.
  const viewportStyle = {
    ['--stage-w' as string]: `${PAGE_W * pagesWide * fit}px`,
  } as CSSProperties;

  return (
    <div className="book" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="book-viewport" ref={viewportRef} style={viewportStyle}>
        {fit > 0 ? (
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
      </div>

      <p className="book-progress" aria-live="polite">
        {single ? `Page ${index + 1} of ${count}` : `Spread ${index + 1} of ${count}`}
      </p>
    </div>
  );
}
