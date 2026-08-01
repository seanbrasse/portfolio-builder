import type { Metadata } from 'next';
import Link from 'next/link';

import { signOut } from './actions';
import { isAdmin } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Never cached, never prerendered. Everything under here is per-session by
 * definition, and a cached admin page is one editor seeing another's draft —
 * or, worse, a signed-out visitor seeing the last render.
 */
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The middleware has already turned away anyone who does not belong. This is
  // only deciding whether to draw the navigation, since the sign-in page shares
  // this layout and has no session to hang a sign-out button on.
  const signedIn = await isAdmin();

  return (
    <div className="admin">
      {signedIn ? (
        <header className="admin-bar">
          <nav className="admin-nav">
            <Link href="/admin">Content</Link>
            <Link href="/">
              View site{' '}
              <span className="link-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          </nav>

          <form action={signOut}>
            <button type="submit" className="admin-button admin-quiet">
              Sign out
            </button>
          </form>
        </header>
      ) : null}

      <main className="admin-main">{children}</main>
    </div>
  );
}
