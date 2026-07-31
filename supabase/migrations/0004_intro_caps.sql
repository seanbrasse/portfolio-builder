/**
 * The intro's caps, enforced where the data is.
 *
 * `settings` was the one content table with no length constraints on it, which
 * is why the tagline and the social card description could grow until the
 * layout said so. The other tables have carried theirs since 0001; these are
 * the same numbers as `CAPS` in src/content/types.ts, checked in the same
 * place, for the same reason: the admin counts characters against them and this
 * is what stops anything else from getting round it.
 *
 * Skills is measured as the joined row rather than per entry. The row wraps as
 * one run, so its total length is what decides how many lines it costs — and
 * a per-entry limit would permit forty short ones.
 *
 * Named constraints so a violation reports which rule it broke. An anonymous
 * check tells the admin only that the row was rejected.
 */

alter table public.settings
  add constraint settings_tagline_length
    check (char_length(tagline) <= 120),
  add constraint settings_skills_length
    check (char_length(array_to_string(skills, ', ')) <= 200),
  add constraint settings_og_tagline_length
    check (char_length(og_tagline) <= 200);
