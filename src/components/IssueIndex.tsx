'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import {
  GOTO_EVENT,
  getOpenPages,
  getServerOpenPages,
  subscribeToOpenPages,
} from '@/components/Book';
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
 * It reads two things it does not own — the theme, which belongs to the
 * document, and which pages are open, which belongs to the book — and both are
 * read the same way, as external stores. Neither is state this component can
 * hold without fighting whoever actually sets it.
 */
export function IssueIndex({ pages, plainHref }: IssueIndexProps) {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readServerTheme);

  // The rail sits outside the book, so it tracks what is open rather than
  // owning it — and the book owns that, not the URL. A list, not a single
  // slug: a desktop spread has two pages in front of the reader, and marking
  // only one of them makes the other look shut. `null` is the cover.
  const open = useSyncExternalStore(subscribeToOpenPages, getOpenPages, getServerOpenPages);

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

        {/* `aria-current` goes on every open page for the same reason the
            highlight does — both really are the current page when a spread is
            showing, and announcing one of the two would contradict what is on
            screen. */}
        <Link
          href="/"
          className="index-link"
          data-current={open.includes(null) || undefined}
          aria-current={open.includes(null) ? 'page' : undefined}
          onClick={(event) => goto(event, null)}
        >
          Cover
        </Link>

        {pages.map((page) => (
          <Link
            key={page.slug}
            href={`/${page.slug}`}
            className="index-link"
            data-current={open.includes(page.slug) || undefined}
            aria-current={open.includes(page.slug) ? 'page' : undefined}
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
