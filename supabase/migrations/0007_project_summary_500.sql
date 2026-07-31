/**
 * Give a project summary room for a paragraph.
 *
 * 0001 capped it at 200, matching the one-sentence summaries the cards were
 * built around. The card still clamps to two lines, so length is not a layout
 * risk there; the modal shows the whole thing, and 200 characters is short for
 * a real description of what a project is and how it went. 500 is the same cap
 * now in `CAPS.projectSummary`, which the admin field and `validateIssue` both
 * read — this is the third lock, so nothing gets a longer summary past the
 * database either.
 *
 * Drop-then-add because a check constraint's expression cannot be altered in
 * place. `if exists` so it applies on a database that predates the named
 * constraint.
 */

alter table public.projects
  drop constraint if exists projects_summary_check,
  add constraint projects_summary_check
    check (char_length(summary) <= 500);
