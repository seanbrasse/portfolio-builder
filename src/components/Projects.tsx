import type { Experience, Project } from '@/content/types';

/**
 * Projects, as a horizontally scrolling rail.
 *
 * Native `scroll-snap` on a real scroll container, not a JS carousel. The
 * browser already implements keyboard scrolling, touch momentum, scrollbar
 * dragging and reduced motion; a carousel reimplements all four.
 *
 * There is no expand-to-grid control any more. It existed because a rail hides
 * cards behind an interaction, and a grid was the escape hatch — but the page
 * is one screen now and a grid has nowhere to expand into. The rail is the
 * page's subject rather than one section of it, which is a different bargain:
 * a visitor who scrolls the rail is doing the thing the page is for.
 *
 * A server component again, now that there is no state.
 */
export function Projects({
  projects,
  employers,
}: {
  projects: Project[];
  employers: Record<string, Experience>;
}) {
  return (
    <div
      className="project-rail"
      // A scrollable region has to be focusable and named, or a keyboard user
      // cannot reach the cards past the first.
      tabIndex={0}
      role="region"
      aria-label="Projects, scroll horizontally"
    >
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          employer={project.experienceId ? employers[project.experienceId] : undefined}
        />
      ))}
    </div>
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
