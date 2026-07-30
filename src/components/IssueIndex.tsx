'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { GOTO_EVENT, TURNED_EVENT } from '@/components/Book';
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
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readServerTheme);

  // The rail sits outside the book, so it tracks which page is open rather
  // than owning it. `replaceState` from the book does not fire a router
  // update, so the current slug is read from the URL on every turn instead.
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = () => {
      const path = window.location.pathname.replace(/^\//, '');
      setSlug(path === '' ? null : path);
    };
    const fromBook = (event: Event) => {
      setSlug((event as CustomEvent<{ slug: string | null }>).detail?.slug ?? null);
    };
    fromUrl();
    window.addEventListener('popstate', fromUrl);
    window.addEventListener(TURNED_EVENT, fromBook);
    return () => {
      window.removeEventListener('popstate', fromUrl);
      window.removeEventListener(TURNED_EVENT, fromBook);
    };
  }, [pathname]);

  const goto = (event: React.MouseEvent<HTMLAnchorElement>, target: string | null) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    // The book owns the URL; the rail only asks it to turn.
    window.dispatchEvent(new CustomEvent(GOTO_EVENT, { detail: { slug: target } }));
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'noir' ? 'four-color' : 'noir';
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(THEME_EVENT));

    // MODE-8: an explicit choice outranks any default from here on.
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode. The URL param below still carries the choice.
    }

    // Section 7: the mode is reflected in the URL so a shared link preserves
    // it. replaceState rather than a push — this is not a navigation.
    const url = new URL(window.location.href);
    url.searchParams.set('theme', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <nav className="issue-index" aria-label="Issue index">
      <div className="issue-index-inner">
        <span className="issue-index-label">Issue index</span>

        <Link
          href="/"
          className="index-link"
          data-current={slug === null || undefined}
          aria-current={slug === null ? 'page' : undefined}
          onClick={(event) => goto(event, null)}
        >
          Cover
        </Link>

        {pages.map((page) => (
          <Link
            key={page.slug}
            href={`/${page.slug}`}
            className="index-link"
            data-current={slug === page.slug || undefined}
            aria-current={slug === page.slug ? 'page' : undefined}
            onClick={(event) => goto(event, page.slug)}
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
