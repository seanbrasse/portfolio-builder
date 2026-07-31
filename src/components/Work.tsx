'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Experience, Project, SiteSettings } from '@/content/types';
import { formatMonth, formatRange, isoRange } from '@/lib/format';

/** Cards per notch of wheel travel. Tuned so a normal flick moves about one. */
const WHEEL = 0.0016;

/** How fast the eased position closes on the target, per second. */
const EASE = 9;

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
  education,
}: {
  projects: Project[];
  experiences: Experience[];
  education: SiteSettings['education'];
}) {
  const count = projects.length;
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Project | null>(null);
  const [gallery, setGallery] = useState(false);
  const drag = useRef<{ x: number; from: number } | null>(null);
  const dragged = useRef(false);

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
  const target = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  /**
   * Where each project sits on the timeline, as a percentage. Shared between
   * the line, which draws a dot per project, and the cursor, which slides
   * between those dots as the carousel moves — they have to agree, so they
   * come from one calculation rather than two.
   */
  const geometry = useMemo(
    () => timelineGeometry(experiences, projects, education),
    [experiences, projects, education],
  );

  // Layout is a pure function of position, so it can be called from the frame
  // loop and from a jump, and the two cannot disagree.
  const paint = useCallback(() => {
    const node = stage.current;
    if (!node) return;

    const cards = node.querySelectorAll<HTMLElement>('.project-card');

    // Signed distance from the middle, wrapped, so the first card sits beside
    // the last rather than against an empty edge.
    // Wrapped, so the carousel is a cycle: the newest card sits beside the
    // oldest and there is no end to run into in either direction.
    const offsets = Array.from(cards, (_, index) => {
      let offset = (index - position.current) % count;
      if (offset > count / 2) offset -= count;
      if (offset < -count / 2) offset += count;
      return offset;
    });

    /**
     * Depth is a rank, not a threshold on distance.
     *
     * Thresholds cannot promise a card count. With four cards the two furthest
     * are equidistant every time the carousel is halfway between two of them —
     * both land on the same side of any cutoff, and four cards are on screen
     * instead of three. Ranking sorts that out by construction: nearest is the
     * front, the next two are its neighbours, everything else is hidden, and
     * that holds at every position and for any number of projects.
     */
    const rank = offsets
      .map((offset, index) => ({ index, distance: Math.abs(offset) }))
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => entry.index);

    cards.forEach((card, index) => {
      const offset = offsets[index];
      const distance = Math.abs(offset);
      const scale = Math.max(1 - distance * 0.13, 0.7);

      // Both axes. The card hangs from `top: 50%`, so the Y half-offset is what
      // centres it — writing only the X translate here left the card centred
      // horizontally and dropped a half-height below the middle.
      card.style.transform =
        `translate(calc(-50% + ${offset * SPACING * 100}%), -50%) scale(${scale})`;
      card.style.zIndex = String(Math.round(100 - distance * 10));

      /**
       * Opacity comes from that rank, and CSS owns it.
       *
       * Ramping opacity off raw distance means a card is only fully solid at
       * the exact instant it is dead centre. Every other moment the front card
       * is slightly transparent and the one behind shows through it, which is a
       * permanent crossfade — the card on top never looks like it is on top.
       *
       * Rank is discrete and changes once, when two cards swap places. So the
       * depth goes in an attribute and the stylesheet transitions between the
       * three values: the front card sits at full strength for the whole time
       * it is the front card, and the exchange is a short crossfade at the
       * moment the order actually changes.
       *
       * Transform stays per-frame. Only opacity is transitioned, and only
       * because the value it smooths is a step rather than a stream.
       */
      const place = rank.indexOf(index);
      const depth = place === 0 ? '0' : place <= 2 ? '1' : '2';
      if (card.dataset.depth !== depth) card.dataset.depth = depth;

      // `toggleAttribute`, not `dataset.centre = undefined`. Assigning
      // undefined to a dataset property stringifies it, so the attribute is
      // present with the value "undefined" and still matches `[data-centre]`.
      card.toggleAttribute('data-centre', depth === '0');
    });

    // The cursor sits between the two projects the position is between, which
    // is what makes it track the carousel rather than snap to whichever card
    // happens to be nearest.
    if (cursor.current && geometry.marks.length > 0) {
      const clamped = Math.max(0, Math.min(position.current, geometry.marks.length - 1));
      const lower = Math.floor(clamped);
      const upper = Math.min(lower + 1, geometry.marks.length - 1);
      const blend = clamped - lower;
      const left =
        geometry.marks[lower].left + (geometry.marks[upper].left - geometry.marks[lower].left) * blend;
      cursor.current.style.left = `${left}%`;
    }
  }, [count, geometry]);

  /**
   * The card's width is a function of the height available to it.
   *
   * A full-width 16:9 well means the image is exactly `width * 9/16` tall, so
   * asking how wide the card should be and asking how much room there is are
   * the same question — and CSS cannot answer it, because a percentage width
   * cannot be derived from a parent's height. Measuring the stage is the only
   * honest way round, and a ResizeObserver does it without polling.
   *
   * The body's height is read from the DOM rather than assumed, so changing the
   * card's copy or padding cannot silently push the image out of the frame.
   */
  useEffect(() => {
    const node = stage.current;
    if (!node) return;

    const body = node.querySelector<HTMLElement>('.project-body');

    /**
     * Converges rather than computing once.
     *
     * The body's height depends on the card's width — a narrower card wraps the
     * summary onto another line — and the width depends on the body's height.
     * A single pass measures the body at whatever width the card happened to
     * have and lands wrong, which is what left the card taller than the stage.
     *
     * So the body is observed too, and each pass re-measures. The 2px deadband
     * is what stops that becoming a loop: once a change is smaller than a
     * couple of pixels nothing is written, no resize fires, and it settles.
     */
    const fit = () => {
      const chrome = body ? body.offsetHeight : 96;
      // A little back, so a rounding error cannot put the card over the edge.
      const available = node.clientHeight - chrome - 4;
      const byHeight = Math.max(available, 80) * (16 / 9);
      const byWidth = Math.min(node.clientWidth * 0.5, 680);
      const next = Math.round(Math.min(byHeight, byWidth));

      const current = parseFloat(node.style.getPropertyValue('--card-w')) || 0;
      if (Math.abs(next - current) < 2) return;

      node.style.setProperty('--card-w', `${next}px`);
      paint();
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    if (body) observer.observe(body);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(paint, [paint]);

  /**
   * The loop no longer advances anything. It closes the gap between where the
   * carousel is and where the reader has asked it to be, and then stops.
   *
   * Keeping the eased follow rather than writing the target straight to the
   * cards is what preserves the feel of the old drift: a wheel notch is a
   * discrete event, and applying it directly would make the carousel jump by
   * that much instantly. Easing turns a series of notches into continuous
   * travel, and a flick that lands several notches at once still resolves as
   * one smooth move.
   *
   * It cancels itself when the gap closes, so an idle page runs no frames.
   */
  const run = useCallback(() => {
    if (frame.current) return;

    let last = performance.now();
    const step = (now: number) => {
      // Elapsed time, not a fixed step, or the carousel closes twice as fast
      // on a 120Hz display as it does on a 60Hz one.
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      const gap = target.current - position.current;
      if (Math.abs(gap) < 0.0005) {
        position.current = target.current;
        paint();
        frame.current = 0;
        return;
      }

      position.current += gap * Math.min(delta * EASE, 1);
      paint();

      const rounded = ((Math.round(position.current) % count) + count) % count;
      setActive((current) => (current === rounded ? current : rounded));

      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  }, [paint, count]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /**
   * Move the carousel. The target is not clamped — it runs off either end and
   * the paint wraps it, which is what makes the cycle endless in both
   * directions rather than stopping at the oldest project.
   */
  const seek = useCallback(
    (to: number) => {
      target.current = to;
      setActive(((Math.round(to) % count) + count) % count);
      run();
    },
    [count, run],
  );

  /**
   * The wheel drives it, but only where the page has no scrolling of its own to
   * give up. On the locked one-screen layout there is nothing else a vertical
   * wheel could do, so taking it is free. Below that breakpoint the page is an
   * ordinary scrolling document and hijacking the wheel would trap the reader
   * in the carousel — there, horizontal intent still works and so does drag.
   */
  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      const pageScrolls = document.documentElement.scrollHeight > window.innerHeight;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (pageScrolls && !horizontal) return;

      const amount = horizontal ? event.deltaX : event.deltaY;
      seek(target.current + amount * WHEEL);
    },
    [seek],
  );

  const go = useCallback(
    (delta: number) => seek(Math.round(target.current) + delta),
    [seek],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
    else if (event.key === 'Home') seek(0);
    else if (event.key === 'End') seek(count - 1);
    else return;
    event.preventDefault();
  };

  // Drag scrubs rather than stepping. The carousel is the reader's to move
  // now, so a half-drag should leave it half-way rather than snapping back.
  const onPointerMove = (event: React.PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    if (Math.abs(event.clientX - start.x) > 6) dragged.current = true;
    const width = stage.current?.clientWidth ?? 1;
    seek(start.from - ((event.clientX - start.x) / width) * 2.2);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    // Settle on a card so the carousel never rests between two.
    seek(Math.round(target.current));
  };

  return (
    <>
      <Timeline
        geometry={geometry}
        activeProject={projects[active]}
        cursorRef={cursor}
        onPick={seek}
      />

      <div
        className="carousel"
        role="group"
        aria-roledescription="carousel"
        aria-label="Selected work"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onPointerDown={(event) => {
          // Stops the container taking focus from a pointer, so the focus ring
          // is only ever the keyboard's. `:focus-visible` is meant to do this
          // on its own and does not for a `tabindex` container in Chrome — a
          // click leaves the ring up for the whole time the reader is dragging
          // through the cards. Keyboard focus still lands here and is still
          // shown, which is the part that matters.
          event.preventDefault();
          dragged.current = false;
          drag.current = { x: event.clientX, from: target.current };
        }}
        // A drag has to swallow the click that follows it. Without this, pulling
        // the carousel sideways also counts as a click on whichever card the
        // pointer went down on, and scrubbing opens a dialog every time.
        onClickCapture={(event) => {
          if (!dragged.current) return;
          dragged.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
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
          <ol className="carousel-dots">
            {projects.map((project, index) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="carousel-dot"
                  aria-current={index === active || undefined}
                  aria-label={`Show ${project.title}`}
                  onClick={() => seek(index)}
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

type Geometry = ReturnType<typeof timelineGeometry>;

/** Months since epoch, for placing a date on a line. */
function monthsOf(iso: string) {
  const [year, month] = iso.split('-').map(Number);
  return year * 12 + (month - 1);
}

/**
 * Where everything sits on the line, as percentages.
 *
 * Computed once and shared, because the line draws a dot per project and the
 * cursor slides between those dots — two calculations that disagree by a
 * rounding error would show as a cursor that never quite lands on a mark.
 *
 * Positions are elapsed time, not one slot per item: a degree that ran four
 * years and a job that ran seven months should not occupy the same width.
 */
function timelineGeometry(
  experiences: Experience[],
  projects: Project[],
  education: SiteSettings['education'],
) {
  const min = monthsOf(education.startDate);
  const max = Math.max(
    ...projects.map((project) => monthsOf(project.date)),
    ...experiences.map((item) => monthsOf(item.endDate ?? item.startDate)),
  );
  const span = Math.max(max - min, 1);
  const at = (iso: string) => ((monthsOf(iso) - min) / span) * 100;

  const years = [];
  for (let year = Math.ceil(min / 12); year * 12 <= max; year += 1) {
    years.push({ year, left: ((year * 12 - min) / span) * 100 });
  }

  const ordered = [...experiences].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return {
    ticks: years,
    // The degree is a join like any other as far as the line is concerned: a
    // tick where something started. It is first because it started first.
    joins: [
      {
        id: 'education',
        label: education.school,
        sub: education.credential,
        left: at(education.startDate),
      },
      ...ordered.map((item) => ({
        id: item.id,
        label: item.company,
        sub: item.role,
        left: at(item.startDate),
      })),
    ],
    spans: [
      {
        id: 'education',
        label: `${education.credential}, ${education.school}`,
        range: `from ${formatMonth(education.startDate)}`,
        iso: education.startDate,
      },
      ...ordered.map((item) => ({
        id: item.id,
        label: item.company,
        range: formatRange(item.startDate, item.endDate),
        iso: isoRange(item.startDate, item.endDate),
      })),
    ],
    marks: projects.map((project, index) => ({
      index,
      id: project.id,
      title: project.title,
      date: project.date,
      left: at(project.date),
    })),
  };
}

/**
 * The career as one continuous line: a rule end to end, a tick where each thing
 * started, and the projects distributed along it. Not a bar per job — the line
 * is the career, and cutting it into segments makes the gaps between jobs look
 * like part of the design rather than like nothing happening.
 */
function Timeline({
  geometry,
  activeProject,
  cursorRef,
  onPick,
}: {
  geometry: Geometry;
  activeProject?: Project;
  cursorRef: React.RefObject<HTMLSpanElement | null>;
  onPick: (index: number) => void;
}) {
  return (
    <div className="timeline">
      {/* Decoration. The same facts follow as a dated list, because a position
          on a line is not information anyone can hear. */}
      <div className="timeline-track" aria-hidden="true">
        <span className="timeline-rule" />

        {geometry.ticks.map((tick) => (
          <span key={tick.year} className="timeline-year" style={{ left: `${tick.left}%` }}>
            {tick.year}
          </span>
        ))}

        {geometry.joins.map((join) => (
          <span key={join.id} className="timeline-join" style={{ left: `${join.left}%` }}>
            <span className="timeline-company">
              {join.label}
              {/* The role, in the secondary face. Two lines of the same
                  typeface at the same size read as one wrapped label; the
                  change of face is what separates the place from the job. */}
              <span className="timeline-role">{join.sub}</span>
            </span>
          </span>
        ))}

        {geometry.marks.map((mark) => (
          <span key={mark.id} className="timeline-mark" style={{ left: `${mark.left}%` }} />
        ))}

        {/* Rides the carousel's continuous position, so it slides between two
            projects rather than snapping to whichever is nearest. Placed from
            the animation frame, which is why it is a ref. */}
        <span ref={cursorRef} className="timeline-cursor" />
      </div>

      <ol className="sr-only">
        {geometry.spans.map((span) => (
          <li key={span.id}>
            {span.label}, <time dateTime={span.iso}>{span.range}</time>
          </li>
        ))}
        {geometry.marks.map((mark) => (
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
