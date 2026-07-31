'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Experience, Project } from '@/content/types';
import { formatMonth, formatRange, isoRange } from '@/lib/format';

/** Cards per second. Slow enough to read a title as it passes. */
const DRIFT = 0.16;

/** How far apart the cards sit, as a fraction of a card's width. Under 1, so
 *  neighbours overlap rather than sit beside each other. */
const SPACING = 0.62;

/**
 * The timeline and the carousel, which are one component because they share one
 * position. The timeline marks where the card nearest the middle sits in the
 * career; the carousel drifting moves the marker, and stopping it stops the
 * marker with it.
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

  /**
   * Position is a float, not an index.
   *
   * A carousel that steps between integers can only ever jump; the cards are
   * either here or there, and a transition tweens between two states. Drifting
   * means position is continuous — 1.37 is a real place — and every card's
   * transform is a function of its distance from it. That is what produces
   * cards sliding steadily past each other rather than snapping.
   *
   * It lives in a ref and is written to the DOM directly from the animation
   * frame. Re-rendering four cards sixty times a second to move them is the
   * expensive way to do this, and React would be reconciling a tree whose only
   * change is a transform string. Only the *rounded* position goes into state,
   * because that is the one thing anything else needs to know.
   */
  const position = useRef(0);
  const stage = useRef<HTMLDivElement>(null);

  const paused = !playing || held || detail !== null || gallery;

  // Layout is a pure function of position, so it can be called from the frame
  // loop and from a jump, and the two cannot disagree.
  const paint = useCallback(() => {
    const node = stage.current;
    if (!node) return;

    const cards = node.querySelectorAll<HTMLElement>('.project-card');
    cards.forEach((card, index) => {
      let offset = (index - position.current) % count;
      if (offset > count / 2) offset -= count;
      if (offset < -count / 2) offset += count;

      const distance = Math.abs(offset);
      const scale = Math.max(1 - distance * 0.13, 0.7);
      // Fades out before it reaches the card on the far side, so nothing is
      // seen crossing the middle from behind.
      const opacity = distance > 1.55 ? 0 : Math.max(1 - distance * 0.42, 0);

      card.style.transform = `translateX(calc(-50% + ${offset * SPACING * 100}%)) scale(${scale})`;
      card.style.opacity = String(opacity);
      card.style.zIndex = String(Math.round(100 - distance * 10));
      // `toggleAttribute`, not `dataset.centre = undefined`. Assigning
      // undefined to a dataset property stringifies it, so the attribute is
      // present with the value "undefined" and still matches `[data-centre]` —
      // every card was getting the centre card's shadow.
      card.toggleAttribute('data-centre', distance < 0.5);
    });
  }, [count]);

  useEffect(paint, [paint]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      // Elapsed time, not a fixed increment per frame: a 120Hz display would
      // otherwise run the carousel at twice the speed of a 60Hz one, and a
      // dropped frame would make it stutter rather than catch up.
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      position.current = (position.current + delta * DRIFT) % count;
      paint();

      const rounded = Math.round(position.current) % count;
      setActive((current) => (current === rounded ? current : rounded));

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [paused, count, paint]);

  const jump = useCallback(
    (to: number) => {
      position.current = ((to % count) + count) % count;
      setActive(Math.round(position.current) % count);
      paint();
    },
    [count, paint],
  );

  const go = useCallback(
    (delta: number) => jump(Math.round(position.current) + delta),
    [jump],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
    else if (event.key === 'Home') jump(0);
    else if (event.key === 'End') jump(count - 1);
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
        onPick={jump}
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
        <div className="carousel-stage" ref={stage}>
          {projects.map((project, index) => {
            let offset = (index - active + count) % count;
            if (offset > count / 2) offset -= count;
            const near = Math.abs(offset) <= 1;

            return (
              <article
                key={project.id}
                className="project-card"
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                aria-hidden={!near || undefined}
                inert={index !== active}
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
                  onClick={() => jump(index)}
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
 * The career as one continuous line.
 *
 * A single rule end to end, a tick where each company was joined, and the
 * projects distributed along it. Not a bar per job: the line is the career, and
 * cutting it into segments makes the gaps between jobs look like part of the
 * design rather than like nothing happening.
 *
 * Everything is placed as a percentage of elapsed time rather than one slot per
 * item, so four months and three years do not occupy the same width.
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
  const { joins, ticks, marks, spans } = useMemo(() => {
    const end = months(latestDate(projects, experiences));
    const starts = experiences.map((item) => months(item.startDate));
    const min = Math.min(...starts);
    const max = Math.max(end, ...projects.map((p) => months(p.date)));
    const span = Math.max(max - min, 1);
    const at = (iso: string) => ((months(iso) - min) / span) * 100;

    const years = [];
    for (let year = Math.ceil(min / 12); year * 12 <= max; year += 1) {
      years.push({ year, left: ((year * 12 - min) / span) * 100 });
    }

    // Oldest first, so the line reads left to right the way time does.
    const ordered = [...experiences].sort((a, b) => a.startDate.localeCompare(b.startDate));

    return {
      ticks: years,
      joins: ordered.map((item) => ({
        id: item.id,
        company: item.company,
        left: at(item.startDate),
      })),
      spans: ordered.map((item) => ({
        id: item.id,
        company: item.company,
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
      {/* Decoration. The same facts follow as a dated list, because a position
          on a line is not information anyone can hear. */}
      <div className="timeline-track" aria-hidden="true">
        <span className="timeline-rule" />

        {ticks.map((tick) => (
          <span key={tick.year} className="timeline-year" style={{ left: `${tick.left}%` }}>
            {tick.year}
          </span>
        ))}

        {joins.map((join) => (
          <span key={join.id} className="timeline-join" style={{ left: `${join.left}%` }}>
            <span className="timeline-company">{join.company}</span>
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
