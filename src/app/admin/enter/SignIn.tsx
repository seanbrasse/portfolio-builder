'use client';

import { useState } from 'react';

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
 * decides what the resulting session can reach, and both the middleware and
 * every row-level policy consult it.
 */
export function SignIn() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function send(form: FormData) {
    const email = String(form.get('email') ?? '').trim();
    if (!email) return;

    setState('sending');
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    // Deliberately not branching on the result. A failure and a success look
    // the same from here, which is the point.
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <p className="admin-note" role="status">
        Check your inbox. The link expires shortly and can be used once.
      </p>
    );
  }

  return (
    <form action={send} className="admin-form">
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
