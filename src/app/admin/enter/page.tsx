import type { Metadata } from 'next';

import { SignIn } from './SignIn';

/**
 * The door.
 *
 * Every other path under `/admin` redirects an unauthenticated visitor to `/`
 * rather than here, because a login page at a guessed URL confirms the guess
 * (AUTH-6). This one has to be reachable — there is otherwise no way in — so it
 * is unlinked, unindexed, and gives away nothing: the same message comes back
 * whether or not the address you typed is the owner's.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function Enter() {
  return (
    <div className="admin-door">
      <h1>Sign in</h1>
      <p className="admin-note">
        A one-time link will be sent if this address belongs to the site owner.
      </p>
      <SignIn />
    </div>
  );
}
