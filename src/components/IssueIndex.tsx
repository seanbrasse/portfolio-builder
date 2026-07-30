'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { startTransition, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import type { Theme } from '@/lib/tokens';

type IndexPage = { slug: string; title: string; href: string };

type IssueIndexProps = {
  pages: IndexPage[];
  /** Where the plain-text escape hatch lives (ACC-9, MODE-4). */
  plainHref: string;
};

const THEME_KEY = 'comic-portfolio:theme';
const THEME_EVENT = 'comic-portfolio:themechange';

/**
 * The theme is owned by the document, not by React — an inline script sets it
 * before hydration so there is no flash, and CSS reads it from the attribute.
 * That makes it an external store, and treating it as one is what keeps the
 * button label in sync without an effect that fights the script for
 * ownership on first paint.
 */
function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'noir' ? 'noir' : 'four-color';
}

/** The server cannot know the reader's preference, so it renders the default. */
function readServerTheme(): Theme {
  return 'four-color';
}

/**
 * The issue index rail: page navigation, the theme switch, and the link out to
 * plain view.
 *
 * All of the client behavior in the public site lives here, in one component,
 * because it all needs the same thing — the current route. That includes the
 * page transition, which needs to resolve its promise only once the new route
 * has actually rendered. Doing that per-link would mean each link racing its
 * own navigation.
 */
export function IssueIndex({ pages, plainHref }: IssueIndexProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readServerTheme);
  const pendingTransition = useRef<(() => void) | null>(null);

  // MOTION-1: hold the view transition open until the destination has
  // committed, then let it animate. Resolving early cross-fades the old page
  // against itself.
  useEffect(() => {
    pendingTransition.current?.();
    pendingTransition.current = null;
  }, [pathname]);

  const navigate = useCallback(
    (href: string) => {
      if (typeof document.startViewTransition !== 'function') {
        router.push(href);
        return;
      }
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            pendingTransition.current = resolve;
            startTransition(() => router.push(href));
            // Never leave the document frozen if a navigation stalls.
            window.setTimeout(() => {
              pendingTransition.current?.();
              pendingTransition.current = null;
            }, 800);
          }),
      );
    },
    [router],
  );

  const onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'noir' ? 'four-color' : 'noir';
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(THEME_EVENT));

    // MODE-8: an explicit choice outranks prefers-color-scheme from here on.
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode. The URL param below still carries the choice.
    }

    // Section 7: the mode is reflected in the URL so a shared link preserves
    // it. replaceState rather than a router push — this is not a navigation
    // and should not create a history entry per toggle.
    const url = new URL(window.location.href);
    url.searchParams.set('theme', next);
    window.history.replaceState(null, '', url);
  };

  // ACC-8: arrow keys move page to page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const current = pages.findIndex((page) => page.href === pathname);
      if (current === -1) return;

      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (delta === 0) return;

      const next = pages[current + delta];
      if (!next) return;

      event.preventDefault();
      navigate(next.href);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pages, pathname, navigate]);

  return (
    <nav className="issue-index" aria-label="Issue index">
      <div className="issue-index-inner">
        <span className="issue-index-label">Issue index</span>

        {pages.map((page) => (
          <Link
            key={page.slug}
            href={page.href}
            className="index-link"
            data-current={page.href === pathname || undefined}
            aria-current={page.href === pathname ? 'page' : undefined}
            onClick={(event) => onLinkClick(event, page.href)}
          >
            {page.title}
          </Link>
        ))}

        <span className="index-spacer" />

        <div className="mode-controls">
          <button type="button" className="mode-button" onClick={toggleTheme} aria-pressed={theme === 'noir'}>
            {theme === 'noir' ? 'Noir ●' : 'Noir ○'}
          </button>
          <Link className="mode-button" href={plainHref}>
            Plain text ↔
          </Link>
        </div>
      </div>
    </nav>
  );
}
