/**
 * Whether there is a database to talk to.
 *
 * The site shipped with its content in `src/content/issue.ts` and still works
 * that way. These variables are what switches it over, and until they are set
 * — locally, in CI, or on a deploy that has not been configured yet — every
 * read falls back to the module. A missing environment variable should change
 * where the content comes from, not whether the site builds.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function hasDatabase(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
}
