/**
 * Let anon call `is_admin()`.
 *
 * 0001 granted execute to `authenticated` only, on this reasoning, written
 * beside the grant:
 *
 *     Signed-in only. The middleware asks this after establishing a user, so
 *     anon never has a reason to call it and the answer for anon is always
 *     false.
 *
 * The second clause is true and the first is not. Anon has a reason to call it
 * on literally every public read, because the read policies are the callers:
 *
 *     experiences_read     using (published or public.is_admin())
 *     projects_read        using (published or public.is_admin())
 *     project_images_read  using (public.is_admin() or exists (...))
 *     testimonials_read    using (approved or public.is_admin())
 *
 * `or` is not a guarantee that the right-hand side is skipped — the planner is
 * free to evaluate either operand first, and it does. So the anonymous read
 * that serves the public page died with `permission denied for function
 * is_admin`, RLS denied every row, and the site fell back to the content file
 * for every visitor. Nothing that existed only in the database — company logos
 * being the first such thing — could ever appear.
 *
 * Granting this leaks nothing. `is_admin()` returns a boolean and only a
 * boolean; it is `security definer` so that it may read `admin_emails`, but an
 * anonymous caller has no `email` claim, so the lookup is for the empty string
 * and the answer is a flat false. That false is exactly what the read policies
 * want from a stranger: published rows, nothing else. The alternative — writing
 * the policies so they never mention the function — would mean an admin could
 * not read their own drafts through the same policy, which is the thing the
 * function is there to allow.
 */
grant execute on function public.is_admin() to anon;
