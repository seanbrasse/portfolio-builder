/**
 * Raise the tagline and social-card caps.
 *
 * 0004 set these at 120 and 200. They are soft limits — where the copy starts
 * costing the page rather than where the layout breaks — so raising them is a
 * content decision, made here in the same place the other two locks read from
 * (`CAPS` in src/content/types.ts, moved to 180 and 300 in the same change).
 *
 * Drop-then-add rather than alter, because Postgres has no "alter check
 * constraint": the expression is replaced by swapping the whole constraint.
 * `if exists` so this still applies cleanly on a database that predates 0004.
 * Skills is untouched — its 200 was not asked to move.
 */

alter table public.settings
  drop constraint if exists settings_tagline_length,
  drop constraint if exists settings_og_tagline_length,
  add constraint settings_tagline_length
    check (char_length(tagline) <= 180),
  add constraint settings_og_tagline_length
    check (char_length(og_tagline) <= 300);
