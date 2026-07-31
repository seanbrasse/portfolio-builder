import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';

import { ThemeScript } from '@/components/ThemeScript';
import { getSettings } from '@/content';
import { PALETTES, themeStylesheet } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';

import './globals.css';

/**
 * The document, and nothing else.
 *
 * The site's chrome — the skip link, the main landmark, the footer — moved to
 * `(site)/layout.tsx`, because the admin shares none of it and was rendering a
 * contact footer under an editing form. What is left here is what genuinely
 * belongs to every page: the theme, the stylesheet, and analytics.
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
