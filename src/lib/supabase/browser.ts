'use client';

import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_KEY, SUPABASE_URL } from './config';

/**
 * The browser's client. Used for exactly two things: starting the Google
 * sign-in, and uploading a file straight to storage.
 *
 * Uploads do not go through the server because a screenshot is a few megabytes
 * and routing it through a serverless function means holding all of it in
 * memory to hand it to storage anyway. The user's own session authorises the
 * upload, and the storage policy checks `is_admin()` the same way every table
 * does — so this shortcut costs nothing in access control.
 */
export function supabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
