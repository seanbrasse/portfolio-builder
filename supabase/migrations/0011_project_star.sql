-- STAR breakdown for a project: Situation, Task, Action, Result. The single
-- free-form summary stays as the short teaser shown on the carousel card; these
-- optional sections are the fuller story rendered (scrollable) in the modal, so
-- the write-up can be structured and as long as it needs to be.
alter table public.projects
  add column if not exists situation text not null default '',
  add column if not exists task text not null default '',
  add column if not exists action text not null default '',
  add column if not exists result text not null default '';
