/**
 * The read API over the issue.
 *
 * Everything the rendering layer knows about content goes through here, so
 * Phase 2 can swap the hardcoded module for database queries by changing this
 * file alone. Lookups are indexed once at module load rather than scanned per
 * panel, because a page renders every panel and `find()` in a render path is
 * how a static site quietly becomes quadratic.
 */

import { issue } from './issue';
import { CAPS } from './types';
import type {
  Experience,
  Issue,
  Metric,
  Page,
  Project,
  SiteSettings,
  Testimonial,
} from './types';

function index<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

const experiencesById = index(issue.experiences);
const projectsById = index(issue.projects);
const metricsById = index(issue.metrics);
const testimonialsById = index(issue.testimonials);

export function getSettings(): SiteSettings {
  return issue.settings;
}

/** Published pages only, in issue order. This is the reader's issue. */
export function getPages(): Page[] {
  return issue.pages.filter((page) => page.status === 'published');
}

export function getPage(slug: string): Page | undefined {
  return getPages().find((page) => page.slug === slug);
}

export function getFirstPage(): Page {
  const [first] = getPages();
  if (!first) throw new Error('The issue has no published pages.');
  return first;
}

export function getExperience(id: string): Experience | undefined {
  return experiencesById.get(id);
}

export function getProject(id: string): Project | undefined {
  return projectsById.get(id);
}

export function getMetric(id: string): Metric | undefined {
  return metricsById.get(id);
}

/**
 * Unapproved quotes are invisible to the rendering layer entirely — this
 * returns `undefined` for them rather than a row with a flag the caller might
 * forget to check.
 */
export function getTestimonial(id: string): Testimonial | undefined {
  const row = testimonialsById.get(id);
  return row?.approved ? row : undefined;
}

export function getExperiences(): Experience[] {
  return issue.experiences;
}

export function getProjects(): Project[] {
  return issue.projects;
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
export function validateIssue(content: Issue = issue): ContentProblem[] {
  const problems: ContentProblem[] = [];

  const tooLong = (where: string, value: string, cap: number) => {
    if (value.length > cap) {
      problems.push({
        where,
        problem: `${value.length} characters, cap is ${cap}`,
      });
    }
  };

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

export type { Experience, Issue, Metric, Page, Project, SiteSettings, Testimonial };
