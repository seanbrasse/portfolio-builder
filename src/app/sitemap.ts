import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

/** One page, so one entry. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl(), priority: 1 }];
}
