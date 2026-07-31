/**
 * Education becomes a table.
 *
 * It was three columns on `settings` — school, credential, start date — which
 * encoded three assumptions that turned out to be wrong: that there is exactly
 * one school, that it has no end date, and that it has no logo. A singleton is
 * the right shape for a fact there can only be one of, and "where I studied" is
 * not one of those.
 *
 * Modelled on `experiences` rather than merged into it. A degree still is not a
 * job: it has no role, no impact bullets, and no projects pointing at it as
 * their employer, so folding the two together would make every consumer of that
 * list special-case half its rows. What the two genuinely share is what the
 * timeline needs — a name, a subtitle, a date range, and a mark — and that is
 * the shape both now have.
 *
 * Deliberately narrower than `experiences`: no summary, no impact bullets. The
 * timeline renders a label, a subtitle and a range, and nothing renders anything
 * else, so columns for them would be inventing a requirement.
 */

create table public.education (
  id text primary key,
  school text not null,
  -- The subtitle under the school on the timeline: 'B.S. Computer Science'.
  credential text not null default '',
  location text not null default '',
  -- ISO yyyy-mm, matching experiences: the content model has month precision
  -- and a date column would invent a day that then shows up in whatever
  -- formats it.
  start_date text not null check (start_date ~ '^\d{4}-\d{2}$'),
  -- Null means still enrolled, exactly as a null end date on a job means still
  -- employed. The timeline reads it the same way and prints 'Present'.
  end_date text check (end_date ~ '^\d{4}-\d{2}$'),
  -- The school's mark, on the same terms as a company's: one per row, read by
  -- the timeline badge. Null draws a monogram instead.
  logo_src text,
  logo_alt text not null default '',
  logo_width integer,
  logo_height integer,
  links jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.education enable row level security;

-- The same pair as every other content table: published rows are public, and
-- everything is the owner's. `is_admin()` is callable by anon as of 0002, which
-- is what makes the left-hand side of this reachable at all.
create policy education_read on public.education
  for select using (published or public.is_admin());
create policy education_write on public.education
  for all using (public.is_admin()) with check (public.is_admin());

/**
 * Move the one row that exists.
 *
 * Keyed 'education' because that is the id the timeline join already used, so
 * the row that appears here is the same join by the same name rather than a new
 * one that happens to look like it. Skipped when the columns are empty — a
 * database seeded but never filled in should end up with no schools, not one
 * blank one.
 */
insert into public.education (id, school, credential, start_date)
select 'education', education_school, education_credential, education_start_date
from public.settings
where id = true
  and trim(education_school) <> ''
  and education_start_date ~ '^\d{4}-\d{2}$'
on conflict (id) do nothing;

/**
 * `settings.education_*` is left in place on purpose, unread from this point.
 *
 * Dropping it in the same migration would mean the currently deployed build —
 * which still selects those columns and would get undefined for them — renders
 * a timeline with no start. Migrations run against production the moment they
 * are applied; the code that stops reading these columns arrives when the
 * deployment does. Leaving them costs three unread columns and removes the
 * window where the two disagree. A later migration drops them once nothing
 * deployed reads them.
 */
