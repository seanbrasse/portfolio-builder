/**
 * The read API over the issue.
 *
 * Everything the rendering layer knows about content goes through here, which
 * is what made moving the content into a database a change to this file rather
 * than to every page. Callers ask for settings, experiences and projects; where
 * those live is not their business and never was.
 *
 * Two sources, one shape:
 *
 *   • The database, when it is configured. Row-level security does the
 *     filtering, so an unpublished project is absent rather than fetched and
 *     discarded.
 *
 *   • `issue.ts`, when it is not — or when a read fails. A deploy without the
 *     environment variables set, a local checkout, a database having a bad
 *     afternoon: all of them serve the module. A portfolio that renders content
 *     from the last deploy beats one that renders an empty hero.
 *
 * Everything is async now, because a database read is. Nothing here is called
 * from a client component; the page, the metadata, the OG image and the
 * structured data are all server-side, so this costs a keyword and nothing
 * else.
 */

import { cache } from 'react';

import { readIssue } from './db';
import { issue as fallback } from './issue';
import { CAPS } from './types';
import { hasDatabase } from '@/lib/supabase/config';
import type {
  Education,
  Experience,
  Issue,
  Metric,
  Project,
  SiteSettings,
  Testimonial,
} from './types';

/**
 * One read per request, however many callers ask.
 *
 * A single page render asks for settings from the layout's metadata, the page
 * body, the OG image and the structured data. `cache` collapses those into one
 * round trip and hands every caller the same object, which also means they
 * cannot disagree about what the content is midway through a render.
 */
export const getIssue = cache(async (): Promise<Issue> => {
  if (!hasDatabase()) return fallback;
  return (await readIssue()) ?? fallback;
});

function index<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getSettings(): Promise<SiteSettings> {
  return (await getIssue()).settings;
}

export async function getExperience(id: string): Promise<Experience | undefined> {
  return index((await getIssue()).experiences).get(id);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return index((await getIssue()).projects).get(id);
}

export async function getMetric(id: string): Promise<Metric | undefined> {
  return index((await getIssue()).metrics).get(id);
}

/**
 * Unapproved quotes are invisible to the rendering layer entirely — this
 * returns `undefined` for them rather than a row with a flag the caller might
 * forget to check. The database enforces the same rule in its read policy, so
 * this is the second of two locks rather than the only one.
 */
export async function getTestimonial(id: string): Promise<Testimonial | undefined> {
  const row = index((await getIssue()).testimonials).get(id);
  return row?.approved ? row : undefined;
}

export async function getExperiences(): Promise<Experience[]> {
  return (await getIssue()).experiences;
}

/**
 * Oldest first, which is how the timeline reads them and how a reader says
 * them out loud — you went to one school and then another, not the reverse.
 * The database is asked in this order rather than sorted here, so the two
 * cannot drift.
 */
export async function getEducation(): Promise<Education[]> {
  return (await getIssue()).education;
}

export async function getProjects(): Promise<Project[]> {
  return (await getIssue()).projects;
}

export type ContentProblem = { where: string; problem: string };

/**
 * The field caps from the PRD, checked rather than trusted.
 *
 * In Phase 2 these same caps live in the admin as character counters
 * (ADMIN-5); until then this is what stops a 300-character summary from
 * silently overflowing a panel. Returns problems rather than throwing so the
 * caller can report all of them at once.
 */
export function validateIssue(content: Issue = fallback): ContentProblem[] {
  const problems: ContentProblem[] = [];

  const tooLong = (where: string, value: string, cap: number) => {
    if (value.length > cap) {
      problems.push({
        where,
        problem: `${value.length} characters, cap is ${cap}`,
      });
    }
  };

  // The intro's three fields. Checked as the string that actually renders —
  // skills as the joined row, because that is what wraps.
  tooLong('settings tagline', content.settings.tagline, CAPS.tagline);
  tooLong('settings skills', content.settings.skills.join(', '), CAPS.skills);
  tooLong('settings social card description', content.settings.ogTagline, CAPS.ogTagline);

  for (const experience of content.experiences) {
    tooLong(`experience ${experience.id} summary`, experience.summary, CAPS.experienceSummary);
    if (experience.impactBullets.length > CAPS.impactBulletCount) {
      problems.push({
        where: `experience ${experience.id}`,
        problem: `${experience.impactBullets.length} impact bullets, max is ${CAPS.impactBulletCount}`,
      });
    }
    experience.impactBullets.forEach((bullet, i) => {
      tooLong(`experience ${experience.id} bullet ${i + 1}`, bullet, CAPS.impactBullet);
    });
  }

  for (const project of content.projects) {
    tooLong(`project ${project.id} summary`, project.summary, CAPS.projectSummary);
    if (project.context === 'professional' && !project.experienceId) {
      problems.push({
        where: `project ${project.id}`,
        problem: 'professional projects must name the employer they were built at',
      });
    }
  }

  for (const testimonial of content.testimonials) {
    tooLong(`testimonial ${testimonial.id} quote`, testimonial.quote, CAPS.quote);
  }

  // ACC-2: alt text is required by the type, but an empty string satisfies the
  // type and defeats the point.
  for (const project of content.projects) {
    project.images.forEach((image, i) => {
      if (!image.alt.trim()) {
        problems.push({
          where: `project ${project.id} image ${i + 1}`,
          problem: 'alt text is empty',
        });
      }
    });
  }

  return problems;
}

/**
 * Enforced at module load on the server, which means `next build` fails on a
 * capped field that overflows. A test file would work too, but it can be
 * skipped and this cannot — and since every public page is statically
 * generated, a build that fails here is a page that never ships broken.
 *
 * Guarded on `window` so the check is stripped from the client bundle: it is a
 * build-time assertion, not shipped code.
 */
if (typeof window === 'undefined') {
  const problems = validateIssue();
  if (problems.length > 0) {
    const detail = problems.map((p) => `  • ${p.where}: ${p.problem}`).join('\n');
    throw new Error(
      `Content violates the field caps in src/content/types.ts:\n${detail}\n\n` +
        'Shorten the copy — the caps exist because the panels cannot hold more.',
    );
  }
}

export type { Education, Experience, Issue, Metric, Project, SiteSettings, Testimonial };
