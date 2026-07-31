'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';

/**
 * Google, and nothing else (AUTH-2).
 *
 * There is no password to manage, no reset flow to build, and — unlike the
 * magic link this replaced — no email to send, which is what was actually
 * breaking: the built-in mail service allows a handful of messages an hour and
 * a morning of testing exhausted it. An identity provider has no such limit,
 * arrives instantly, and hands back an address Google has already verified,
 * which makes the allowlist a stronger check than it was rather than a weaker
 * one.
 *
 * Signing in is still not authorisation. Anyone with a Google account can press
 * this button; `admin_emails` decides what the resulting session can reach, and
 * both the proxy and every row-level policy consult it. A stranger who signs in
 * lands back on the front page having changed nothing and seen nothing.
 */
export function SignIn({ problem }: { problem?: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  /**
   * Supabase reports a failed sign-in twice — once in the query string and once
   * in the fragment. The fragment never reaches the server, so a redirect
   * landing here directly rather than through `/auth/callback` would otherwise
   * show a bare button and no explanation.
   *
   * Rewritten into the query rather than held in state, so the message has one
   * source: the server prop above.
   */
  useEffect(() => {
    if (problem || !window.location.hash) return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const reported = hash.get('error_description') ?? hash.get('error');
    if (!reported) return;

    router.replace(`/admin/enter?problem=${encodeURIComponent(reported.replace(/\+/g, ' '))}`);
  }, [problem, router]);

  async function start() {
    setPending(true);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        /**
         * Always ask which account. Without it Google silently reuses whichever
         * session the browser already has, which on a machine signed into more
         * than one account means being refused for an address you did not mean
         * to offer — and no way to say so.
         */
        queryParams: { prompt: 'select_account' },
      },
    });

    // Reached only if the redirect never happened. Success navigates away.
    if (error) {
      router.replace(`/admin/enter?problem=${encodeURIComponent(error.message)}`);
      setPending(false);
    }
  }

  return (
    <div className="admin-form">
      {problem ? (
        <p className="admin-error" role="status">
          {problem}
        </p>
      ) : null}

      <button type="button" className="admin-button" onClick={start} disabled={pending}>
        {pending ? 'Redirecting…' : 'Continue with Google'}
      </button>
    </div>
  );
}
