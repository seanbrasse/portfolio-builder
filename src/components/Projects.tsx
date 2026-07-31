'use client';

import { useState } from 'react';

import type { Experience, Project } from '@/content/types';

/**
 * Projects, as a scroll-snap rail that expands to a grid.
 *
 * The rail is native horizontal scrolling with snap points, not a JS carousel.
 * The browser already handles keyboard scrolling, touch momentum, scrollbar
 * dragging and reduced motion; a carousel reimplements all four and, unlike
 * scrolling, hides every card past the first behind a control most visitors
 * never touch.
 *
 * That last part is why the expand button exists. A rail is still serial
 * access — you see two cards and have to act to see the third. `Show all`
 * turns the same cards into a grid, so nothing is ever more than one click
 * from being visible at once. Same DOM either way: this toggles a class, it
 * does not mount a second copy of the list, so nothing is duplicated for a
 * screen reader and no card is ever in the document twice.
 */
export function Projects({
  projects,
  employers,
}: {
  projects: Project[];
  employers: Record<string, Experience>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        className={expanded ? 'project-grid' : 'project-rail'}
        // Scrollable regions need to be reachable and labelled for keyboard
        // users; in grid form there is nothing to scroll, so the role goes.
        {...(expanded ? {} : { tabIndex: 0, role: 'region', 'aria-label': 'Projects, scrollable' })}
      >
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            employer={project.experienceId ? employers[project.experienceId] : undefined}
          />
        ))}
      </div>

      {/* Only worth offering when there is something off-screen to reveal. */}
      {projects.length > 2 ? (
        <button
          type="button"
          className="button rail-toggle"
          data-variant="ghost"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Show as a row' : `Show all ${projects.length} projects`}
        </button>
      ) : null}
    </>
  );
}

function ProjectCard({ project, employer }: { project: Project; employer?: Experience }) {
  const [shot] = project.images;
  const logo = employer?.logo;

  return (
    <article className="project-card">
      {shot ? (
        <img className="project-shot" src={shot.src} alt={shot.alt} width={640} height={400} />
      ) : (
        /* COMP-4: a labelled empty state, not a broken frame. The card still
           says what the project is; this is honest about having no shot yet. */
        <div className="project-shot-empty" aria-hidden="true">
          No screenshot yet
        </div>
      )}

      <div className="project-body">
        <p className="project-context">
          {logo ? (
            <img
              className="project-logo"
              src={logo.src}
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
            />
          ) : null}
          {employer ? `Built at ${employer.company}` : 'Personal project'}
        </p>

        <h3 className="project-title">{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <p className="project-impact">{project.impact}</p>

        <ul className="tech-row">
          {project.tech.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {project.links.length > 0 ? (
          <p className="project-links">
            {project.links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label} ↗
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </article>
  );
}
