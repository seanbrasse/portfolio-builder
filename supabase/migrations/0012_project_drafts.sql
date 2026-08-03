-- Draft variations of published projects (ADMIN-3/4/8).
--
-- A project is either a plain draft (a `projects` row with published = false —
-- its own columns are the draft, and nothing about it is on the site yet) or it
-- is published. A published project may additionally carry ONE pending draft:
-- staged edits that are not live yet. Those staged edits live here, one row per
-- published project, keyed by its id — the primary key is what enforces "at most
-- one draft variation".
--
-- Only the editable text fields are staged; images stay shared with the live
-- version and are edited in place. The payload is a jsonb blob rather than a
-- column-per-field so this table does not have to track every future project
-- column — the admin maps it, and publishing writes it back to the typed,
-- constrained columns on `projects`.
--
-- This table is admin-only. Unlike `projects`, no row here is ever public, so a
-- leaked anon key cannot read staged, unpublished edits.

create table public.project_drafts (
  project_id text primary key
    references public.projects (id) on update cascade on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.project_drafts enable row level security;

-- No read for anyone but the owner: a pending draft is unpublished by
-- definition, so there is no public-read half to this policy.
create policy project_drafts_all on public.project_drafts
  for all using (public.is_admin()) with check (public.is_admin());
