-- Star (pin) a project so it always sits at the front of the carousel.
--
-- A single boolean on the project rather than an ordering column: the ask is
-- "always at the top", not "in this exact hand-sorted order". Starred projects
-- lead, and among themselves they keep the same newest-first order everything
-- else uses, so nothing new has to be maintained by hand.
--
-- Additive and safe to run on a live table: NOT NULL is fine because every
-- existing row takes the default. The projects_write policy from 0001 already
-- covers the new column, so no policy change is needed.
alter table public.projects
  add column if not exists starred boolean not null default false;

-- The public list is read newest-first and re-sorted starred-first in the app;
-- this index keeps the ordering cheap if the table ever grows.
create index if not exists projects_starred_date
  on public.projects (starred desc, date desc);
