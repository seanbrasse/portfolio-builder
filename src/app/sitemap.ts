import type { MetadataRoute } from 'next';

import { getPages } from '@/content';
import { pageHref, siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  return [
    ...getPages().map((page, index) => ({
      url: `${base}${pageHref(page.slug, index)}`,
      // The cover is what a search result should land on.
      priority: index === 0 ? 1 : 0.7,
    })),
    // MODE-1: plain view is independently indexable, and for some queries it
    // is the better result.
    { url: `${base}/plain`, priority: 0.5 },
  ];
}
