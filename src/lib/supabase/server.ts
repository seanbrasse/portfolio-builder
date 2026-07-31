import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_KEY, SUPABASE_URL } from './config';

/**
 * A Supabase client carrying whoever is signed in.
 *
 * Server components may read cookies but not write them — only a route handler
 * or a server action can. Supabase's client writes on token refresh, which is
 * why `setAll` is allowed to throw and be swallowed: in a component the refresh
 * still happened in memory and the middleware will persist it on the next
 * request. Letting that throw propagate would turn a routine token refresh into
 * a rendering error.
 */
export async function supabaseServer() {
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (written) => {
        try {
          for (const { name, value, options } of written) {
            store.set(name, value, options);
          }
        } catch {
          // Read-only context. See above.
        }
      },
    },
  });
}

/**
 * Are we talking to the one identity allowed to write?
 *
 * Asked of the database rather than compared against an environment variable,
 * so the allowlist has exactly one home. `is_admin()` is the same function the
 * row-level policies call, which means the answer here and the answer the
 * database gives a write cannot drift apart.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}
