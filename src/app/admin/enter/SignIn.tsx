'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';

/**
 * Magic link, no password (AUTH-2).
 *
 * There is no password to manage, no reset flow to build, and nothing worth
 * stealing from the form. The reply is the same sentence whether the address is
 * the owner's or not — anything else turns this into an oracle for "is this the
 * email that controls the site".
 *
 * Being sent a link is not authorisation. Anyone can ask for one; the allowlist
 * decides what the resulting session can reach, and both the proxy and every
 * row-level policy consult it.
 */
export function SignIn({ problem }: { problem?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const router = useRouter();

  /**
   * Supabase reports a failed link twice — once in the query string and once in
   * the fragment. The fragment never reaches the server, so a redirect landing
   * here directly rather than through `/auth/callback` would otherwise show an
   * empty form and no explanation.
   *
   * Rewritten into the query rather than held in state, so the message has one
   * source: the server prop above. Copying it into a second place is how the
   * two end up disagreeing after a navigation.
   */
  useEffect(() => {
    if (problem || !window.location.hash) return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const reported = hash.get('error_description') ?? hash.get('error');
    if (!reported) return;

    router.replace(`/admin/enter?problem=${encodeURIComponent(reported.replace(/\+/g, ' '))}`);
  }, [problem, router]);

  async function send(form: FormData) {
    const email = String(form.get('email') ?? '').trim();
    if (!email) return;

    setState('sending');

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    /**
     * One exception to saying nothing: the send limit.
     *
     * Every other failure stays silent, because the reply has to look the same
     * whether or not the address is the owner's — otherwise this form is an
     * oracle for "which email controls this site". A rate limit is different.
     * It is a fact about how many messages have just been sent, the fix is to
     * wait, and reporting "check your inbox" when nothing was sent leaves the
     * only person who can sign in staring at an empty one.
     */
    if (error?.status === 429) {
      router.replace(
        `/admin/enter?problem=${encodeURIComponent(
          'Too many links requested. The mail service allows a few per hour — wait a while and try again.',
        )}`,
      );
      setState('idle');
      return;
    }

    setState('sent');
  }

  if (state === 'sent') {
    return (
      <p className="admin-note" role="status">
        Check your inbox. The link expires shortly, can be used once, and has to
        be opened in this browser — it is completed with a secret this page
        kept.
      </p>
    );
  }

  return (
    <form action={send} className="admin-form">
      {problem ? (
        <p className="admin-error" role="status">
          {problem}
        </p>
      ) : null}

      <label className="field">
        <span className="field-label">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
        />
      </label>

      <button type="submit" className="admin-button" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send link'}
      </button>
    </form>
  );
}
