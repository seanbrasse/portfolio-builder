/**
 * The database read layer.
 *
 * Every function here returns one of the shapes in `types.ts` — the same shapes
 * `issue.ts` exports — because the whole point of the indirection in `index.ts`
 * is that the rendering layer never learns where content came from. A row that
 * cannot be mapped onto those types is a schema that has drifted from the
 * model, and the fix is the migration, not a cast.
 *
 * Reads use the anon key and go through row-level security, so an unpublished
 * project is invisible here for the same reason it is invisible to anyone with
 * the key: the database will not return it. Draft state is not something this
 * layer has to remember to filter.
 */

import { createClient } from '@supabase/supabase-js';

import type {
  Asset,
  Education,
  Experience,
  Issue,
  Link,
  Project,
  SiteSettings,
  Testimonial,
} from './types';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase/config';

/**
 * A plain anon client, deliberately not the cookie-backed one.
 *
 * Reading the session would mean touching `cookies()`, and a page that touches
 * cookies cannot be statically generated — the public page would go from a file
 * on a CDN to a function invocation per visitor, to personalise content that is
 * identical for everyone. Public reads are anonymous by definition; the admin
 * has its own client for the requests where identity matters.
 *
 * Caching is left to the page, and that is load-bearing in both directions. The
 * route's `revalidate` governs how long this response is held; the bug being
 * fixed here was `force-static`, which pinned it forever. Forcing `no-store` to
 * escape that is the opposite mistake — it was tried, and it turned the page
 * dynamic, so every visitor paid for a database round trip and the build could
 * no longer prerender at all.
 */
function anon() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type SettingsRow = {
  display_name: string;
  tagline: string;
  availability_status: SiteSettings['availabilityStatus'];
  roles_open_to: string[];
  skills: string[];
  // `education_school`, `education_credential` and `education_start_date` are
  // still columns on this table and are deliberately absent here. 0003 moved
  // education to its own table and left the originals behind so that the
  // deployment reading them could retire on its own schedule; naming them here
  // would be the second source of truth that move existed to remove.
  location: string;
  contact_email: string;
  resume_href: string;
  links: Link[];
  og_tagline: string;
  og_subtitle: string;
};

type EducationRow = {
  id: string;
  school: string;
  credential: string;
  location: string;
  start_date: string;
  end_date: string | null;
  logo_src: string | null;
  logo_alt: string;
  logo_width: number | null;
  logo_height: number | null;
  links: Link[];
};

type ExperienceRow = {
  id: string;
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string | null;
  summary: string;
  impact_bullets: string[];
  logo_src: string | null;
  logo_alt: string;
  logo_width: number | null;
  logo_height: number | null;
  links: Link[];
};

type ImageRow = {
  id: string;
  project_id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  kind: Asset['kind'];
  media: 'image' | 'video';
  poster: string | null;
  fit: 'cover' | 'contain';
  scale: number | null;
  focal_x: number | null;
  focal_y: number | null;
};

type ProjectRow = {
  id: string;
  title: string;
  context: Project['context'];
  experience_id: string | null;
  summary: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  impact: string;
  status: Project['status'];
  duration: string;
  tech: string[];
  links: Link[];
  date: string;
  starred: boolean;
};

type TestimonialRow = {
  id: string;
  quote: string;
  author_name: string;
  author_role: string;
  author_company: string;
  experience_id: string | null;
  approved: boolean;
};

function toSettings(row: SettingsRow): SiteSettings {
  return {
    displayName: row.display_name,
    tagline: row.tagline,
    availabilityStatus: row.availability_status,
    rolesOpenTo: row.roles_open_to,
    skills: row.skills,
    location: row.location,
    contactEmail: row.contact_email,
    resumeHref: row.resume_href,
    links: row.links ?? [],
    ogTagline: row.og_tagline,
    ogSubtitle: row.og_subtitle,
  };
}

/**
 * The mark on a row, if one has been uploaded.
 *
 * Returned as an `Asset` so that a logo and a screenshot are the same kind of
 * thing to everything downstream. Undefined when there is no file, which is
 * what makes the badge fall back to a monogram rather than render a broken
 * image — the absence has to survive the mapping.
 *
 * Takes the four columns rather than a row type, because schools and companies
 * carry an identical set of them and the mapping does not care which it is
 * looking at. That is the whole reason a school can have a logo at all.
 */
function toLogo(row: {
  id: string;
  logo_src: string | null;
  logo_alt: string;
  logo_width: number | null;
  logo_height: number | null;
}): Asset | undefined {
  if (!row.logo_src) return undefined;
  return {
    id: `${row.id}-logo`,
    src: row.logo_src,
    alt: row.logo_alt,
    width: row.logo_width ?? 0,
    height: row.logo_height ?? 0,
    kind: 'logo',
  };
}

function toEducation(row: EducationRow): Education {
  return {
    id: row.id,
    school: row.school,
    credential: row.credential,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    logo: toLogo(row),
    links: row.links ?? [],
  };
}

function toExperience(row: ExperienceRow): Experience {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    summary: row.summary,
    impactBullets: row.impact_bullets ?? [],
    logo: toLogo(row),
    links: row.links ?? [],
  };
}

function toAsset(row: ImageRow): Asset {
  return {
    id: row.id,
    src: row.src,
    alt: row.alt,
    width: row.width,
    height: row.height,
    kind: row.kind,
    media: row.media ?? 'image',
    poster: row.poster ?? undefined,
    fit: row.fit ?? 'contain',
    scale: row.scale ?? 1,
    focalPoint:
      row.focal_x === null || row.focal_y === null
        ? undefined
        : { x: row.focal_x, y: row.focal_y },
  };
}

function toProject(row: ProjectRow, images: Asset[]): Project {
  return {
    id: row.id,
    title: row.title,
    context: row.context,
    experienceId: row.experience_id ?? undefined,
    summary: row.summary,
    situation: row.situation ?? '',
    task: row.task ?? '',
    action: row.action ?? '',
    result: row.result ?? '',
    impact: row.impact,
    status: row.status ?? 'shipped',
    duration: row.duration ?? '',
    tech: row.tech ?? [],
    links: row.links ?? [],
    images,
    date: row.date,
    starred: row.starred ?? false,
  };
}

function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    quote: row.quote,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorCompany: row.author_company,
    experienceId: row.experience_id ?? undefined,
    approved: row.approved,
  };
}

/**
 * The whole issue in one pass.
 *
 * Five queries rather than a query per item: the page renders every experience
 * and every project, so fetching them one at a time is a round trip per row for
 * a page that always needs all of them. Images are fetched flat and grouped in
 * memory, which is one query instead of one per project.
 *
 * Returns null on any failure — an unreachable database, a schema mismatch, an
 * empty settings row — so the caller can fall back to the content module rather
 * than serve a half-empty page. A portfolio that renders yesterday's copy is a
 * better outcome than one that renders a blank hero.
 */
export async function readIssue(): Promise<Issue | null> {
  try {
    const supabase = anon();

    const [settings, education, experiences, projects, images, testimonials] = await Promise.all([
      supabase.from('settings').select('*').eq('id', true).maybeSingle(),
      // Oldest first, which is the order the timeline reads them in. Companies
      // come back newest first because the admin list and the structured data
      // both want the current one at the top; schools have no equivalent
      // "current" to surface.
      supabase.from('education').select('*').order('start_date', { ascending: true }),
      supabase.from('experiences').select('*').order('start_date', { ascending: false }),
      // Starred first, then newest — a pinned project leads the carousel; the
      // page re-applies the same order, this keeps the database's answer honest.
      supabase
        .from('projects')
        .select('*')
        .order('starred', { ascending: false })
        .order('date', { ascending: false }),
      supabase.from('project_images').select('*').order('sort_order', { ascending: true }),
      supabase.from('testimonials').select('*'),
    ]);

    /**
     * Say so, loudly, in the server log.
     *
     * The fallback is deliberate — last-known-good copy beats an empty hero —
     * but a silent one is indistinguishable from success, and a site quietly
     * serving content from a file while the owner edits a database is the worst
     * version of this. Whoever is reading the build or function log should be
     * able to see that it happened and why.
     */
    const failed =
      settings.error ??
      education.error ??
      experiences.error ??
      projects.error ??
      images.error ??
      testimonials.error;

    if (failed) {
      console.error('[content] database read failed, falling back to issue.ts:', failed.message);
      return null;
    }

    if (!settings.data) {
      console.error('[content] no settings row, falling back to issue.ts');
      return null;
    }

    const byProject = new Map<string, Asset[]>();
    for (const row of (images.data ?? []) as ImageRow[]) {
      const list = byProject.get(row.project_id);
      if (list) list.push(toAsset(row));
      else byProject.set(row.project_id, [toAsset(row)]);
    }

    return {
      settings: toSettings(settings.data as SettingsRow),
      education: ((education.data ?? []) as EducationRow[]).map(toEducation),
      experiences: ((experiences.data ?? []) as ExperienceRow[]).map(toExperience),
      projects: ((projects.data ?? []) as ProjectRow[]).map((row) =>
        toProject(row, byProject.get(row.id) ?? []),
      ),
      testimonials: ((testimonials.data ?? []) as TestimonialRow[]).map(toTestimonial),
      // Not in the database. The metrics panel belonged to the comic layout and
      // nothing renders it now; adding a table for a surface that does not
      // exist would be inventing a requirement.
      metrics: [],
    };
  } catch (problem) {
    console.error(
      '[content] database unreachable, falling back to issue.ts:',
      problem instanceof Error ? problem.message : problem,
    );
    return null;
  }
}
