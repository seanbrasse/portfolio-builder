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
