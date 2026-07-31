import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';

import { ThemeScript } from '@/components/ThemeScript';
import { getSettings } from '@/content';
import { PALETTES, themeStylesheet } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';

import './globals.css';

/**
 * Generated rather than declared. The content is a read now, and a module-scope
 * constant cannot await one. `getIssue` is request-cached, so this shares the
 * page's fetch instead of adding a second.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: `${settings.displayName} — ${settings.tagline}`,
      template: `%s — ${settings.displayName}`,
    },
    description: settings.ogTagline,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'profile',
      siteName: settings.displayName,
      title: `${settings.displayName} — Software Engineer`,
      description: settings.ogTagline,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: PALETTES.light.paper },
    { media: '(prefers-color-scheme: dark)', color: PALETTES.dark.paper },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    // `data-theme` is written by the inline script below before React sees the
    // document, so the server's markup is intentionally missing it.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* MODE-5: the only place color values enter the document. Generated
            from src/lib/tokens.ts, which is the single source of truth. */}
        <style dangerouslySetInnerHTML={{ __html: themeStylesheet() }} />
        <ThemeScript />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>

        <main id="main">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            {/* Decorative: the name is in the copyright line two columns over,
                so a screen reader announcing an initial would be noise. */}
            <p className="footer-mark" aria-hidden="true">
              {settings.displayName.charAt(0)}
            </p>

            {/* All of the contact information, in one row. This is the only
                place it appears — the page above has no contact section and no
                call-to-action buttons, so the footer is not a duplicate of
                anything, it is the whole answer to "how do I reach him". */}
            <div className="footer-col">
              <ul>
                <li>
                  <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
                </li>
                {settings.links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={settings.resumeHref}>Résumé</a>
                </li>
              </ul>
            </div>

            <p className="footer-fine">
              © {new Date().getFullYear()} {settings.displayName} · {settings.location}
            </p>
          </div>
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
