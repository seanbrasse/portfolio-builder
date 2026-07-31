import { NextResponse, type NextRequest } from 'next/server';

import { supabaseServer } from '@/lib/supabase/server';

/**
 * Where a magic link lands.
 *
 * The link carries a one-time code; this exchanges it for a session and sets
 * the cookies. A route handler rather than a page, because only a handler may
 * write cookies — doing this in a component is how a sign-in appears to work
 * and then finds no session on the next request.
 *
 * A failed exchange goes to `/` with nothing said about why. An expired link
 * and a forged one should be indistinguishable from the outside.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/', request.url));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/', request.url));

  // Middleware decides whether this session is actually allowed anywhere.
  // Signing in and being the site owner are different questions.
  return NextResponse.redirect(new URL('/admin', request.url));
}
