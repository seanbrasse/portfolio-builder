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
 * Failures come back to the door with a reason rather than silently landing on
 * the front page. The original version said nothing on purpose, so an expired
 * link and a forged one would look alike from the outside — but the only
 * person who ever sees this is the one person allowed to sign in, and leaving
 * them on a page that looks like nothing happened is not security, it is a
 * dead end. None of these messages distinguish "this address is the owner's"
 * from "it is not", which is the disclosure that actually mattered.
 */
function refuse(request: NextRequest, why: string) {
  const door = new URL('/admin/enter', request.url);
  door.searchParams.set('problem', why);
  return NextResponse.redirect(door);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Supabase reports its own failures on the redirect it was given — an
  // expired token, a used one, a redirect that is not on the allowlist.
  const reported = params.get('error_description') ?? params.get('error');
  if (reported) return refuse(request, reported);

  const code = params.get('code');
  if (!code) {
    return refuse(request, 'That link carried no sign-in code. Request a new one.');
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    /**
     * Written here rather than passed through. Supabase's own message for the
     * commonest failure is addressed to whoever built the site — it recommends
     * a library this already uses — and the person reading it is trying to log
     * in, not debug. These are the two things that actually go wrong, and both
     * have the same fix.
     */
    return refuse(
      request,
      'That link could not be completed. It has either been used already, or it ' +
        'was opened in a different browser from the one that requested it. ' +
        'Ask for a new link below and open it here.',
    );
  }

  // The middleware decides whether this session is allowed anywhere. Signing in
  // and being the site owner are different questions.
  return NextResponse.redirect(new URL('/admin', request.url));
}
