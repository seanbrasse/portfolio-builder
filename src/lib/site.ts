/**
 * Where the site lives.
 *
 * Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` on every deployment, so preview
 * builds get correct absolute URLs in OG tags and the sitemap without anyone
 * remembering to configure them. An explicit `NEXT_PUBLIC_SITE_URL` wins,
 * which is what a custom domain will use.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

/**
 * The first page of the issue is the site root, and is also reachable at its
 * own slug so deep links from anywhere keep working. Everything canonicalises
 * to `/`.
 */
export function pageHref(slug: string, index: number): string {
  return index === 0 ? '/' : `/${slug}`;
}
