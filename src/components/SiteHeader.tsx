'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { DEFAULT_THEME, type Theme } from '@/lib/tokens';

const STORAGE_KEY = 'comic-portfolio:theme';

/**
 * The theme is owned by the document, not by React — `ThemeScript` sets
 * `data-theme` before first paint so there is no flash. Reading it with
 * `useSyncExternalStore` means React never holds a second copy that could
 * disagree with the attribute, and the server render has no opinion at all.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : DEFAULT_THEME;
}

export function SiteHeader({ name }: { name: string }) {
  // The server has no document, so it renders the default. The script has
  // already corrected the attribute by the time this hydrates.
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing. The choice still applies to this page.
    }
  }, [theme]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-mark" href="#top">
          {name}
        </a>

        <nav className="site-nav" aria-label="Sections">
          <a href="#work">Work</a>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          aria-pressed={theme === 'dark'}
        >
          <span className="theme-toggle-dot" aria-hidden="true" />
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>
    </header>
  );
}
