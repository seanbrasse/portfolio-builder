'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Experience, Project } from '@/content/types';
import { formatMonth, formatRange, isoRange } from '@/lib/format';

const ADVANCE_MS = 5200;

/**
 * The timeline and the carousel, which are one component because they share one
 * index. The timeline marks where the card currently in the middle sits in the
 * career; advancing the carousel moves the marker, and stopping the carousel
 * stops the marker with it.
 */
export function Work({
  projects,
  experiences,
}: {
  projects: Project[];
  experiences: Experience[];
}) {
  const count = projects.length;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [detail, setDetail] = useState<Project | null>(null);
  const [gallery, setGallery] = useState(false);
  const drag = useRef<{ x: number } | null>(null);

  const employers = useMemo(
    () => Object.fromEntries(experiences.map((item) => [item.id, item])),
    [experiences],
  );

  const go = useCallback(
    (delta: number) => setActive((current) => (current + delta + count) % count),
    [count],
  );

  /**
   * Advance on a timer, unless something says not to.
   *
   * `held` covers hover and keyboard focus; `playing` is the explicit control.
   * Both matter: hover is not available to a keyboard user and focus is not
   * available to a mouse user, and WCAG 2.2.2 wants a mechanism that is not
   * either of them. A dialog being open stops it too — nothing should be
   * moving behind a modal.
   *
   * Reduced motion does not slow the carousel down, it stops it starting. An
   * animation that a reader asked not to see is not improved by being gentle.
   */
  useEffect(() => {
    if (!playing || held || detail || gallery) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => go(1), ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [playing, held, detail, gallery, go]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(count - 1);
    else return;
    event.preventDefault();
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <Timeline
        experiences={experiences}
        projects={projects}
        activeProject={projects[active]}
        onPick={(index) => setActive(index)}
      />

      <div
        className="carousel"
        role="group"
        aria-roledescription="carousel"
        aria-label="Selected work"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => (drag.current = { x: event.clientX })}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={() => setHeld(false)}
      >
        <div className="carousel-stage">
          {projects.map((project, index) => {
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
                {/* The whole card opens the detail. A button rather than a
                    click handler on the article, so it is reachable, announced
                    and activated by keyboard without any of that being
                    reimplemented. */}
                <button
                  type="button"
                  className="project-open"
                  onClick={() => setDetail(project)}
                >
                  <span className="sr-only">Open {project.title}</span>
                </button>

                <CardFace
                  project={project}
                  employer={project.experienceId ? employers[project.experienceId] : undefined}
                />
              </article>
            );
          })}
        </div>

        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => setPlaying((on) => !on)}
            aria-label={playing ? 'Pause the carousel' : 'Play the carousel'}
          >
            {playing ? '❙❙' : '▶'}
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

          <button type="button" className="gallery-button" onClick={() => setGallery(true)}>
            All projects
          </button>
        </div>
      </div>

      <Dialog open={detail !== null} onClose={() => setDetail(null)} label={detail?.title ?? ''}>
        {detail ? (
          <ProjectDetail
            project={detail}
            employer={detail.experienceId ? employers[detail.experienceId] : undefined}
          />
        ) : null}
      </Dialog>

      <Dialog open={gallery} onClose={() => setGallery(false)} label="All projects" wide>
        <Gallery
          projects={projects}
          employers={employers}
          onOpen={(project) => {
            setGallery(false);
            setDetail(project);
          }}
        />
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------
   Timeline
------------------------------------------------------------------------- */

/** Months since epoch, for placing a date on a line. */
function months(iso: string) {
  const [year, month] = iso.split('-').map(Number);
  return year * 12 + (month - 1);
}

/**
 * The career on one line: years, where each job started and ended, and the
 * projects distributed along it.
 *
 * Everything is placed as a percentage between the first start and today, so
 * the spacing is real elapsed time rather than one slot per item — a job held
 * for four months and one held for three years should not look the same.
 */
function Timeline({
  experiences,
  projects,
  activeProject,
  onPick,
}: {
  experiences: Experience[];
  projects: Project[];
  activeProject?: Project;
  onPick: (index: number) => void;
}) {
  const { spans, ticks, marks, place } = useMemo(() => {
    const starts = experiences.map((item) => months(item.startDate));
    const ends = experiences.map((item) =>
      item.endDate ? months(item.endDate) : months(latestDate(projects, experiences)),
    );
    const min = Math.min(...starts);
    const max = Math.max(...ends, ...projects.map((p) => months(p.date)));
    const span = Math.max(max - min, 1);
    const at = (iso: string) => ((months(iso) - min) / span) * 100;

    const firstYear = Math.floor(min / 12);
    const lastYear = Math.floor(max / 12);
    const years = [];
    for (let year = firstYear; year <= lastYear; year += 1) {
      years.push({ year, left: ((year * 12 - min) / span) * 100 });
    }

    return {
      place: at,
      ticks: years.filter((tick) => tick.left >= -2 && tick.left <= 102),
      spans: experiences.map((item) => ({
        id: item.id,
        company: item.company,
        left: at(item.startDate),
        width: at(item.endDate ?? latestDate(projects, experiences)) - at(item.startDate),
        range: formatRange(item.startDate, item.endDate),
        iso: isoRange(item.startDate, item.endDate),
      })),
      marks: projects.map((project, index) => ({
        index,
        id: project.id,
        title: project.title,
        date: project.date,
        left: at(project.date),
      })),
    };
  }, [experiences, projects]);

  return (
    <div className="timeline">
      {/* The bar itself is decoration; the list below carries the same facts as
          text, so nothing here is only a position on a line. */}
      <div className="timeline-track" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick.year} className="timeline-year" style={{ left: `${tick.left}%` }}>
            {tick.year}
          </span>
        ))}

        {spans.map((span) => (
          <span
            key={span.id}
            className="timeline-span"
            style={{ left: `${span.left}%`, width: `${Math.max(span.width, 1.5)}%` }}
          >
            <span className="timeline-company">{span.company}</span>
          </span>
        ))}

        {marks.map((mark) => (
          <span
            key={mark.id}
            className="timeline-mark"
            data-active={mark.id === activeProject?.id || undefined}
            style={{ left: `${mark.left}%` }}
          />
        ))}
      </div>

      <ol className="sr-only">
        {spans.map((span) => (
          <li key={span.id}>
            {span.company}, <time dateTime={span.iso}>{span.range}</time>
          </li>
        ))}
        {marks.map((mark) => (
          <li key={mark.id}>
            <button type="button" onClick={() => onPick(mark.index)}>
              {mark.title}, {formatMonth(mark.date)}
            </button>
          </li>
        ))}
      </ol>

      <p className="timeline-now" aria-live="polite">
        {activeProject ? `${activeProject.title} · ${formatMonth(activeProject.date)}` : ''}
      </p>
    </div>
  );
}

function latestDate(projects: Project[], experiences: Experience[]) {
  const all = [...projects.map((p) => p.date), ...experiences.map((e) => e.startDate)];
  return all.sort().at(-1) ?? '2026-01';
}

/* -------------------------------------------------------------------------
   Dialogs
------------------------------------------------------------------------- */

/**
 * A native `<dialog>`. The focus trap, the Escape key, the inert background and
 * the top layer are all the platform's — reimplementing any of them is how
 * modals end up leaking focus to the page behind.
 */
function Dialog({
  open,
  onClose,
  label,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      data-wide={wide || undefined}
      aria-label={label}
      onClose={onClose}
      // The backdrop is part of the dialog's own box, so a click lands on the
      // dialog itself — comparing the target is what separates "clicked
      // outside" from "clicked the panel".
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-panel">
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {children}
      </div>
    </dialog>
  );
}

/* -------------------------------------------------------------------------
   Gallery
------------------------------------------------------------------------- */

function Gallery({
  projects,
  employers,
  onOpen,
}: {
  projects: Project[];
  employers: Record<string, Experience>;
  onOpen: (project: Project) => void;
}) {
  const [company, setCompany] = useState('all');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');

  const companies = useMemo(() => {
    const seen = new Map<string, string>();
    for (const project of projects) {
      const employer = project.experienceId ? employers[project.experienceId] : undefined;
      seen.set(employer?.id ?? 'personal', employer?.company ?? 'Personal');
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [projects, employers]);

  const shown = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (company === 'all') return true;
      return (project.experienceId ?? 'personal') === company;
    });
    return [...filtered].sort((a, b) =>
      order === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
  }, [projects, company, order]);

  return (
    <>
      <h2 className="dialog-title">All projects</h2>

      <div className="gallery-filters">
        <label className="field">
          <span className="field-label">Company</span>
          <select value={company} onChange={(event) => setCompany(event.target.value)}>
            <option value="all">All</option>
            {companies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Sort</span>
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as 'newest' | 'oldest')}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>

        {/* Announced, so a filter that empties the list is not silence. */}
        <p className="gallery-count" aria-live="polite">
          {shown.length} of {projects.length}
        </p>
      </div>

      <ul className="gallery-grid">
        {shown.map((project) => {
          const employer = project.experienceId ? employers[project.experienceId] : undefined;
          return (
            <li key={project.id}>
              <button type="button" className="gallery-item" onClick={() => onOpen(project)}>
                <span className="gallery-item-meta">
                  {employer ? employer.company : 'Personal'} · {formatMonth(project.date)}
                </span>
                <span className="gallery-item-title">{project.title}</span>
                <span className="gallery-item-summary">{project.summary}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* -------------------------------------------------------------------------
   Cards
------------------------------------------------------------------------- */

function Shot({ project }: { project: Project }) {
  const [shot] = project.images;
  if (shot) {
    return <img className="project-shot" src={shot.src} alt={shot.alt} width={640} height={360} />;
  }
  return (
    <div className="project-shot-empty" aria-hidden="true">
      No screenshot yet
    </div>
  );
}

function CardFace({ project, employer }: { project: Project; employer?: Experience }) {
  return (
    <>
      <Shot project={project} />
      <div className="project-body">
        <p className="project-context">{employer ? employer.company : 'Personal project'}</p>
        <h3 className="project-title">{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <ul className="tech-row">
          {project.tech.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ProjectDetail({ project, employer }: { project: Project; employer?: Experience }) {
  return (
    <>
      <Shot project={project} />
      <div className="detail-body">
        <p className="project-context">
          {employer ? `Built at ${employer.company}` : 'Personal project'} ·{' '}
          {formatMonth(project.date)}
        </p>
        <h2 className="dialog-title">{project.title}</h2>
        <p className="detail-summary">{project.summary}</p>
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
