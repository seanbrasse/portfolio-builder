import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_KEY, SUPABASE_URL, hasDatabase } from '@/lib/supabase/config';

/**
 * AUTH-3: `/admin` is closed at the edge, not in the page.
 *
 * Next 16 calls this a proxy; it is the same interception point the middleware
 * convention named, and the rename is the framework's, not a change of role.
 *
 * A client-side check is a suggestion — the route still renders, the data
 * fetch still runs, and anyone who opens devtools can see what was meant to be
 * hidden. This runs before the page exists.
 *
 * AUTH-6: a refusal redirects to `/`, not to a login page. A login page at a
 * guessed URL confirms the guess; the front page tells you nothing.
 */

/** The one path under /admin that an unauthenticated visitor may reach. */
const DOOR = '/admin/enter';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No database configured means no admin to protect and no session to
  // refresh. The public site is served from the content module and this is a
  // pass-through.
  if (!hasDatabase()) {
    return pathname.startsWith('/admin')
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next();
  }

  // The response is created up front and handed to Supabase so that a refreshed
  // token is written onto the response that is actually returned. Creating a
  // fresh one after the auth call is how sessions silently fail to persist and
  // the admin logs itself out every hour.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (written) => {
        for (const { name, value } of written) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of written) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // `getUser` and not `getSession`: the session is whatever is in the cookie,
  // which the browser controls. This one verifies the token with the auth
  // server, which is the difference between a check and a formality.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!pathname.startsWith('/admin')) return response;

  // The door is open to everyone; it is a form and a submit button. Anyone
  // already signed in is sent through it rather than shown it again.
  if (pathname === DOOR) {
    if (!user) return response;
    const { data } = await supabase.rpc('is_admin');
    return data === true
      ? NextResponse.redirect(new URL('/admin', request.url))
      : response;
  }

  if (!user) return NextResponse.redirect(new URL('/', request.url));

  // Signed in is not the same as allowed. Anyone can ask Supabase for a magic
  // link; only the allowlist can do anything with the session it produces.
  const { data, error } = await supabase.rpc('is_admin');
  if (error || data !== true) return NextResponse.redirect(new URL('/', request.url));

  return response;
}

export const config = {
  /**
   * Everything except static assets and the image optimiser. The session has to
   * be refreshed on ordinary page loads too — a visitor who has not opened the
   * admin in an hour would otherwise arrive with an expired token and be
   * bounced by the check above.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|pdf|ico)$).*)'],
};
