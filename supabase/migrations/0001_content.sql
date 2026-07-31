-- The content model, as tables.
--
-- These mirror src/content/types.ts one for one, because src/content/db.ts maps
-- rows straight onto those types and the rendering layer never learns that the
-- content moved. A column that does not correspond to a field is a column the
-- site cannot show.
--
-- Ids are text, not uuid. The content model has always identified things by a
-- readable slug — `mailchimp`, `pass-the-interview` — and those ids are what
-- link a project to the employer it was built at. Foreign keys cascade on
-- update so renaming one in the admin does not orphan the other.

-- The previous schema. Five tables from an earlier design that this one
-- replaces: it had no education, no project dates, no alt text, and identified
-- rows by uuid with a separate sort_order. All five were empty — 0 rows each —
-- so this drops nothing but the shape.
drop table if exists public.project_media cascade;
drop table if exists public.projects cascade;
drop table if exists public.experiences cascade;
drop table if exists public.skills cascade;
drop table if exists public.profile cascade;

-- ---------------------------------------------------------------------------
-- Who is allowed to write
-- ---------------------------------------------------------------------------

-- An allowlist of exactly one identity (AUTH-1). By email rather than by user
-- id, because the id does not exist until the first sign-in and the policy has
-- to be right before then.
create table public.admin_emails (
  email text primary key
);

alter table public.admin_emails enable row level security;
-- No policies at all: nothing reaches this table through the API. It is read
-- only by the function below, which runs as its owner.

/**
 * Security definer so that a policy on another table can consult the allowlist
 * without the caller needing to see it. Without this the subquery would be
 * subject to admin_emails' own RLS, find nothing, and silently deny every
 * write — a policy that fails closed for the wrong reason is the hardest kind
 * to debug.
 */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
-- Signed-in only. The middleware asks this after establishing a user, so anon
-- never has a reason to call it and the answer for anon is always false.
grant execute on function public.is_admin() to authenticated;

/**
 * The longest string in an array.
 *
 * A helper only because a check constraint may not contain a subquery, and
 * "no bullet over 120 characters" is inherently an aggregate over the array.
 * Immutable because it is a pure function of its argument, which is what makes
 * it legal in a constraint at all.
 */
create or replace function public.longest(items text[])
returns integer
language sql
immutable
-- Pinned, because this runs inside a check constraint and would otherwise use
-- whatever search_path the writing session happens to have.
set search_path = ''
as $$
  select coalesce(max(char_length(item)), 0) from unnest(items) as item;
$$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

-- One row, enforced by the primary key rather than by convention. `id` can only
-- ever be true, so a second row is a constraint violation instead of a silent
-- fork where half the site reads one and half the other.
create table public.settings (
  id boolean primary key default true check (id),
  display_name text not null default '',
  tagline text not null default '',
  availability_status text not null default 'selective'
    check (availability_status in ('open', 'selective', 'not_looking')),
  roles_open_to text[] not null default '{}',
  skills text[] not null default '{}',
  -- A degree is not a job, so it does not live in experiences — it has no
  -- impact bullets and no employer, and putting it there would make every
  -- consumer of that list special-case it. It is where the timeline starts.
  education_school text not null default '',
  education_credential text not null default '',
  education_start_date text not null default ''
    check (education_start_date ~ '^\d{4}-\d{2}$'),
  location text not null default '',
  contact_email text not null default '',
  resume_href text not null default '/resume.pdf',
  links jsonb not null default '[]'::jsonb,
  og_tagline text not null default '',
  updated_at timestamptz not null default now()
);

create table public.experiences (
  id text primary key,
  company text not null,
  role text not null,
  location text not null default '',
  -- ISO yyyy-mm. Stored as text rather than date because the content model has
  -- month precision and a date column would invent a day that then shows up in
  -- whatever formats it.
  start_date text not null check (start_date ~ '^\d{4}-\d{2}$'),
  end_date text check (end_date ~ '^\d{4}-\d{2}$'),
  -- The caps from src/content/types.ts, enforced where the data is rather than
  -- only where it renders. The admin counts characters against the same
  -- numbers; this is what stops anything else from getting round them.
  summary text not null default '' check (char_length(summary) <= 200),
  impact_bullets text[] not null default '{}'
    check (
      coalesce(array_length(impact_bullets, 1), 0) <= 3
      and public.longest(impact_bullets) <= 120
    ),
  -- The company's mark. One per employer, which is what makes it consistent
  -- across the timeline and every project built there: both read this row.
  logo_src text,
  logo_alt text not null default '',
  logo_width integer,
  logo_height integer,
  links jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.projects (
  id text primary key,
  title text not null,
  context text not null default 'personal'
    check (context in ('professional', 'personal')),
  experience_id text
    references public.experiences (id) on update cascade on delete set null,
  summary text not null default '' check (char_length(summary) <= 200),
  impact text not null default '',
  tech text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  date text not null check (date ~ '^\d{4}-\d{2}$'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  -- A professional project has to name the employer it was built at, or the
  -- card has a company badge with no company behind it.
  constraint professional_needs_employer
    check (context <> 'professional' or experience_id is not null)
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id text not null
    references public.projects (id) on update cascade on delete cascade,
  src text not null,
  -- Not nullable and not empty. Alt text is required by the type as well, but
  -- an empty string satisfies a type and defeats the point (ACC-2).
  alt text not null check (char_length(trim(alt)) > 0),
  width integer not null default 0,
  height integer not null default 0,
  kind text not null default 'screenshot'
    check (kind in ('screenshot', 'logo', 'avatar', 'document')),
  -- The point that must survive any crop. 0..1 in both axes (MEDIA-4).
  focal_x real check (focal_x between 0 and 1),
  focal_y real check (focal_y between 0 and 1),
  sort_order integer not null default 0
);

create index project_images_project on public.project_images (project_id, sort_order);

create table public.testimonials (
  id text primary key,
  quote text not null check (char_length(quote) <= 180),
  author_name text not null,
  author_role text not null default '',
  author_company text not null default '',
  experience_id text
    references public.experiences (id) on update cascade on delete set null,
  -- False by default, and that default is the feature. A quote nobody has
  -- cleared must not be able to reach the page by being forgotten about.
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security (AUTH-4)
--
-- Public read of what is published, writes for the one allowed identity. This
-- is the same rule the middleware enforces, stated again at the data layer, so
-- that a leaked anon key on its own cannot deface the site.
-- ---------------------------------------------------------------------------

alter table public.settings enable row level security;
alter table public.experiences enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.testimonials enable row level security;

create policy settings_read on public.settings
  for select using (true);
create policy settings_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy experiences_read on public.experiences
  for select using (published or public.is_admin());
create policy experiences_write on public.experiences
  for all using (public.is_admin()) with check (public.is_admin());

create policy projects_read on public.projects
  for select using (published or public.is_admin());
create policy projects_write on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

-- An image is as visible as the project holding it. Checking the parent here
-- rather than duplicating a published flag is what stops the two disagreeing.
create policy project_images_read on public.project_images
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.published
    )
  );
create policy project_images_write on public.project_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy testimonials_read on public.testimonials
  for select using (approved or public.is_admin());
create policy testimonials_write on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects is a shared table, so these are dropped first rather than
-- assumed absent: a name collision here fails the whole migration.
drop policy if exists media_read on storage.objects;
drop policy if exists media_write on storage.objects;
drop policy if exists media_update on storage.objects;
drop policy if exists media_delete on storage.objects;

-- No read policy, deliberately. The bucket is public, and a public bucket
-- serves object URLs without consulting row-level security — so a broad SELECT
-- policy here would add nothing except the ability to *list* every file in the
-- bucket, which is a different and unwanted permission.
create policy media_write on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());
create policy media_update on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());
create policy media_delete on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
