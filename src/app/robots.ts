import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      /**
       * The admin sets `noindex` in its own metadata, but a crawler has to
       * fetch a page to read that — and every one of those fetches is a
       * redirect to `/` that shows up in the logs looking like a probe. This
       * stops well-behaved crawlers before they knock.
       *
       * Not a security measure. Everything under here is closed by the
       * middleware and by row-level security; robots.txt is a request, and
       * treating it as a control is how a "hidden" admin gets found.
       */
      disallow: '/admin',
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
