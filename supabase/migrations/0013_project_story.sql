-- Replace the STAR breakdown with a single cohesive story.
--
-- 0011 split the write-up into four fields (situation/task/action/result). In
-- practice that reads as a form, not a story — the opened card should tell the
-- project the way you would in an interview: a cohesive paragraph or two. So the
-- four fields collapse into one `story` column, and the editor guides the writer
-- toward STAR as a shape rather than breaking the project into it.
--
-- The existing STAR content is preserved: it is joined, in order, into `story`
-- (blank line between the parts) before the columns are dropped.

alter table public.projects
  add column story text not null default '' check (char_length(story) <= 5000);

update public.projects
set story = btrim(
  concat_ws(
    E'\n\n',
    nullif(situation, ''),
    nullif(task, ''),
    nullif(action, ''),
    nullif(result, '')
  ),
  E'\n'
)
where situation <> '' or task <> '' or action <> '' or result <> '';

alter table public.projects
  drop column situation,
  drop column task,
  drop column action,
  drop column result;
