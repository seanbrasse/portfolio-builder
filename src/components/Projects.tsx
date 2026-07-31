'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Experience, Project } from '@/content/types';

/**
 * Projects, as a real carousel: three cards visible, the middle one raised over
 * the two beside it.
 *
 * This replaced a native `scroll-snap` rail, and it is worth saying what that
 * cost. A scroll container gets keyboard scrolling, touch momentum, scrollbar
 * dragging and reduced-motion handling from the browser for free; a carousel
 * has to implement all four itself, and most do not. So this one does:
 *
 *   - Previous/next buttons, always labelled.
 *   - Arrow keys, Home and End, when the carousel has focus.
 *   - Pointer swipe, which covers touch and mouse drag with one code path.
 *   - Transitions that disappear under `prefers-reduced-motion` — the cards
 *     still move, they just arrive rather than travel.
 *
 * Only the centre card is in the tab order. The side cards are visible but
 * partly covered, and sending focus to a link underneath another card is worse
 * than not being able to reach it — `inert` takes them out until they are
 * brought to the middle, which the buttons and arrow keys can always do.
 *
 * Positions wrap, so the middle is never empty at either end and the layout is
 * the same at every index.
 */
export function Projects({
  projects,
  employers,
}: {
  projects: Project[];
  employers: Record<string, Experience>;
}) {
  const count = projects.length;
  const [active, setActive] = useState(0);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const go = useCallback(
    (delta: number) => setActive((current) => (current + delta + count) % count),
    [count],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(count - 1);
    else return;
    event.preventDefault();
  };

  // Pointer rather than touch events: one path covers finger, pen and mouse
  // drag, and it does not fight the click that follows a tap.
  const onPointerDown = (event: React.PointerEvent) => {
    drag.current = { x: event.clientX, moved: false };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    // Far enough to be a swipe rather than a click on a card.
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className="carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label="Selected work"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <div className="carousel-stage">
        {projects.map((project, index) => {
          // Signed distance from the middle, wrapped, so index 0 sits beside
          // the last card rather than against an empty edge.
          let offset = (index - active + count) % count;
          if (offset > count / 2) offset -= count;

          const visible = Math.abs(offset) <= 1;

          return (
            <article
              key={project.id}
              className="project-card"
              data-offset={Math.max(-2, Math.min(2, offset))}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              aria-hidden={!visible || undefined}
              inert={offset !== 0}
            >
              <ProjectCard
                project={project}
                employer={project.experienceId ? employers[project.experienceId] : undefined}
              />
            </article>
          );
        })}
      </div>

      <div className="carousel-controls">
        <button type="button" className="carousel-arrow" onClick={() => go(-1)} aria-label="Previous project">
          ←
        </button>

        <ol className="carousel-dots">
          {projects.map((project, index) => (
            <li key={project.id}>
              <button
                type="button"
                className="carousel-dot"
                aria-current={index === active || undefined}
                aria-label={`Show ${project.title}`}
                onClick={() => setActive(index)}
              />
            </li>
          ))}
        </ol>

        <button type="button" className="carousel-arrow" onClick={() => go(1)} aria-label="Next project">
          →
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ project, employer }: { project: Project; employer?: Experience }) {
  const [shot] = project.images;
  const logo = employer?.logo;

  return (
    <>
      {shot ? (
        <img className="project-shot" src={shot.src} alt={shot.alt} width={640} height={400} />
      ) : (
        /* A labelled empty state, not a broken frame. The card still says what
           the project is; this is honest about having no shot yet. */
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
    </>
  );
}
