import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';

import { IssueIndex } from '@/components/IssueIndex';
import { ThemeScript } from '@/components/ThemeScript';
import { TreatmentDefs } from '@/components/TreatmentDefs';
import { getPages, getSettings } from '@/content';
import { PALETTES, themeStylesheet } from '@/lib/tokens';
import { pageHref, siteUrl } from '@/lib/site';

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
    siteName: `${settings.displayName}, Issue ${settings.issueNumber}`,
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
  const pages = getPages().map((page, index) => ({
    slug: page.slug,
    title: page.title,
    href: pageHref(page.slug, index),
  }));

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
        <a className="skip-link" href="#issue">
          Skip to content
        </a>

        <TreatmentDefs />

        <main id="issue">{children}</main>

        {/* ACC-9: the plain-text escape hatch is in the rail on every page,
            not buried in a footer. */}
        <IssueIndex pages={pages} plainHref="/plain" />

        <Analytics />
      </body>
    </html>
  );
}
