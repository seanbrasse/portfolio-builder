import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';

import { SiteHeader } from '@/components/SiteHeader';
import { ThemeScript } from '@/components/ThemeScript';
import { getSettings } from '@/content';
import { PALETTES, themeStylesheet } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';

import './globals.css';

const settings = getSettings();

export const metadata: Metadata = {
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: PALETTES['four-color'].paper },
    { media: '(prefers-color-scheme: dark)', color: PALETTES.noir.paper },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

        <SiteHeader name={settings.displayName} />

        <main id="main">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>
              {settings.displayName} · {settings.location}
            </span>
            <span>
              <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            </span>
          </div>
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
