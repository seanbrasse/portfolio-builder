'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import type { Asset, Experience, Project, SiteSettings } from '@/content/types';
import { formatMonth, formatRange, isoRange } from '@/lib/format';

/** Cards per notch of wheel travel. Tuned so a normal flick moves about one. */
const WHEEL = 0.0016;

/** How fast the eased position closes on the target, per second. */
const EASE = 9;

/**
 * How long after the reader stops before the carousel settles onto a card.
 * Long enough that consecutive wheel notches read as one gesture, short enough
 * that letting go feels like it lands rather than drifts.
 */
const SETTLE = 160;

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
  const settle = useRef(0);
  /**
   * Card spacing, mirrored from CSS. `paint()` runs sixty times a second and
   * cannot afford a `getComputedStyle` per frame, so `fit()` — which already
   * runs on every resize, and so on every breakpoint crossing — reads it once
   * and leaves it here.
   */
  const spacing = useRef(0.62);

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
        `translate(calc(-50% + ${offset * spacing.current * 100}%), -50%) scale(${scale})`;
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
    const region = node.closest<HTMLElement>('.work');
    // The timeline, not the heading. The heading is screen-reader-only now, so
    // it is out of flow and its top is not where the block's content starts —
    // anchoring on it would count the block's own slack as chrome.
    const head = region?.querySelector<HTMLElement>('.timeline');

    const fit = () => {
      if (!region || !head) return;

      const chrome = body ? body.offsetHeight : 96;

      /**
       * The height budget, taken from the region rather than from the stage.
       *
       * The stage's own height is now written by this function, so reading it
       * back to decide how tall it should be is circular. The work region is a
       * grid track that fills the screen, so its height is independent of
       * anything here — subtract the parts of it that are not the stage and
       * what is left is the stage's budget.
       *
       * Measured from the timeline down and from the region's bottom up, never
       * from the region's top. The block is bottom-aligned, so the space above
       * it is slack, and counting that as chrome would shrink the card to make
       * room for the emptiness the shrinking creates.
       */
      const regionBox = region.getBoundingClientRect();
      const stageBox = node.getBoundingClientRect();
      const above = stageBox.top - head.getBoundingClientRect().top;
      const below = regionBox.bottom - stageBox.bottom;

      // A little back, so a rounding error cannot put the card over the edge.
      const budget = regionBox.height - above - below;
      const available = budget - chrome - 4;
      // The tunables live in the stylesheet, because all of them change at a
      // breakpoint. Read on every pass, so crossing one is picked up.
      const style = getComputedStyle(node);
      const read = (name: string, fallback: number) =>
        parseFloat(style.getPropertyValue(name)) || fallback;

      spacing.current = read('--spacing', 0.62);
      const locked = read('--locked', 0) === 1;

      const byWidth = Math.min(
        node.clientWidth * read('--card-fraction', 0.62),
        read('--card-max', 700),
      );

      /**
       * Off the lock, the budget is the viewport rather than the region.
       *
       * The region is sized by its own content there — which includes the card
       * — so measuring it is circular, and taking width alone is what left the
       * contact details hanging off the bottom of a phone. The document is the
       * honest frame: everything above the stage plus everything below it is
       * fixed by the copy, so what is left of the viewport is what the card may
       * have.
       *
       * Positions are converted to document coordinates before subtracting, so
       * the answer does not depend on where the page happens to be scrolled to
       * when a resize fires.
       *
       * Self-correcting in both directions. Too tall and this shrinks the card,
       * which shortens the document, which is measured again next pass; too
       * short and it grows into the slack. The deadband is what stops that
       * settling into a wobble.
       */
      if (!locked) {
        const fromTop = stageBox.top + window.scrollY;
        /**
         * Heights, not positions.
         *
         * Every earlier attempt at this measured how far down something sat and
         * got the same answer wrong three ways: the root's `scrollHeight` is
         * clamped to the viewport, the frame carries `min-height: 100dvh`, and
         * the footer is pushed to the bottom by an auto margin. All three report
         * where the empty space ends rather than where the content does, so the
         * slack gets counted as chrome, the budget comes out short, and the card
         * shrinks to make room for the emptiness that shrinking creates.
         *
         * Adding up what is actually below the stage cannot be fooled by any of
         * them: the rest of `main` is the controls, and the footer's own height
         * is its height wherever it has been pushed to.
         */
        const region = node.closest('main');
        const footer = document.querySelector<HTMLElement>('.site-footer');
        const beneath =
          (region ? region.getBoundingClientRect().bottom - stageBox.bottom : 0) +
          (footer?.offsetHeight ?? 0);

        /**
         * A floor, not a hard bound. On a very short window — or at large text
         * sizes, or 400% zoom — the page genuinely cannot hold all of this, and
         * squeezing the card to nothing to avoid a scrollbar would trade a
         * scrollbar for an unreadable card. Below this it stops shrinking and
         * the page scrolls, which is what WCAG 1.4.10 asks for anyway.
         *
         * 78 rather than 84 because rounding the card onto a 16px grid costs up
         * to fifteen pixels of width, and at 360x640 that was the difference
         * between fitting and overflowing by three.
         */
        const room = Math.max(window.innerHeight - fromTop - beneath - chrome - 4, 78);

        const only = toGrid(Math.min(byWidth, room * (16 / 9)));
        // No slack added: the card *is* this height now, so a margin here is
        // just height the page does not have, and `even` already rounds up.
        node.style.setProperty('--card-h', `${even(wellHeight(only) + chrome)}px`);
        if (Math.abs(only - (parseFloat(node.style.getPropertyValue('--card-w')) || 0)) < 2) return;
        node.style.setProperty('--card-w', `${only}px`);
        paint();
        return;
      }

      const byHeight = Math.max(available, 80) * (16 / 9);
      /**
       * Three cards wide, not one: the neighbours sit `--spacing` out and
       * scaled down, so the stack covers about `2 * spacing + 0.87` card widths
       * and spills well past the text column it is centred in. Bounding on the
       * column alone let the outer cards run off a narrow screen.
       *
       * Only while locked, where all three have to be on screen at once. Below
       * it the neighbours are meant to be mostly off the edge, and applying
       * this would crush the card to a third of its width to keep cards visible
       * that nobody is trying to see.
       */
      const bySpan = (window.innerWidth - 48) / (2 * spacing.current + 0.87);
      const next = toGrid(Math.min(byHeight, byWidth, bySpan));

      /**
       * Written every pass, deadband or not: the copy can rewrap without the
       * width moving, and the stage's height has to follow the body it holds.
       * Two pixels over, so a rounded height cannot leave the card a pixel
       * proud of the stage it is centred in.
       *
       * Clamped to the budget, because on a window barely over the scroll-lock
       * threshold the budget is genuinely smaller than the smallest card. The
       * stage is a fixed height now, so an unclamped value cannot be absorbed
       * the way a flexible one was — the block grows past its grid track and
       * climbs into the intro above it. Clamping lets the card overflow the
       * stage instead, which is what a too-short window did before.
       */
      const height = even(wellHeight(next) + chrome);
      node.style.setProperty('--card-h', `${even(Math.min(height, Math.max(budget, 0)))}px`);

      const current = parseFloat(node.style.getPropertyValue('--card-w')) || 0;
      if (Math.abs(next - current) < 2) return;

      node.style.setProperty('--card-w', `${next}px`);
      paint();
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    if (body) observer.observe(body);
    // The region carries the budget, so a viewport change has to be seen here
    // — the stage is a fixed height now and no longer resizes on its own.
    if (region) observer.observe(region);

    /**
     * Off the lock the budget is the viewport's height, and nothing being
     * observed necessarily changes when that does — a rotation or a browser
     * toolbar sliding away can leave every element the same size and every box
     * in a different place.
     */
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
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

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(settle.current);
    },
    [],
  );

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
  /**
   * Settle onto a card once the reader stops.
   *
   * A wheel has no end event, so "stopped" is the absence of another notch for
   * a while. Every notch pushes the timer back, which is what keeps a long
   * scroll from snapping mid-gesture; when they stop, the carousel closes on
   * the nearest card rather than resting between two of them with both half
   * faded.
   */
  const snapSoon = useCallback(() => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => seek(Math.round(target.current)), SETTLE);
  }, [seek]);

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      const pageScrolls = document.documentElement.scrollHeight > window.innerHeight;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (pageScrolls && !horizontal) return;

      const amount = horizontal ? event.deltaX : event.deltaY;
      seek(target.current + amount * WHEEL);
      snapSoon();
    },
    [seek, snapSoon],
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
          //
          // Mouse only. On touch, cancelling the default action here also
          // cancels the pan the browser was about to start, so a finger that
          // came to scroll the page finds it frozen. `touch-action: pan-y` is
          // what governs there, and it needs the default left alone.
          if (event.pointerType === 'mouse') event.preventDefault();
          window.clearTimeout(settle.current);
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

/**
 * Card widths are rounded down to a multiple of this.
 *
 * The well is 16:9, so a width divisible by 16 makes its height a whole number
 * of pixels — and a card whose parts are whole pixels is a card whose centring
 * translate is one too. Rounding down rather than to nearest, because every
 * bound this is applied to is a maximum.
 */
const GRID = 16;

/**
 * The card's rule, both sides. `box-sizing` is border-box everywhere, so the
 * well is this much narrower than the card — and it is the well that has to
 * divide by 16, not the card. Coupled to `.project-card`'s border-width in the
 * stylesheet; if that changes, this does.
 */
const BORDER = 2;

/** An even number at least as large, so `translate(-50%)` is a whole pixel. */
function even(value: number) {
  return Math.ceil(value / 2) * 2;
}

/** A card width whose 16:9 well is a whole number of pixels tall. */
function toGrid(bound: number) {
  return Math.max(Math.floor((bound - BORDER) / GRID) * GRID, GRID) + BORDER;
}

/** The well's height, given that card width. Exact by construction. */
function wellHeight(cardWidth: number) {
  return ((cardWidth - BORDER) * 9) / 16;
}

/** The least whitespace two labels on the line may sit apart. */
const GUTTER = 20;

/** The same, for year ticks, which are shorter and can sit closer. */
const YEAR_GAP = 10;

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

  const ordered = [...experiences].sort((a, b) => a.startDate.localeCompare(b.startDate));

  /**
   * The line is not to scale, on purpose.
   *
   * Four years of a degree and five years of work are almost the same length in
   * months, so an honest axis spends nearly half its width on a stretch with
   * one mark on it — and crams every job, every project and the cursor's whole
   * useful travel into the other half. The line is meant to show a career, and
   * the years before it started are context rather than subject.
   *
   * So the scale breaks once, at the first job. Everything before it shares
   * `LEAD` percent; everything after shares the rest. Both halves stay linear,
   * which keeps the mapping monotonic and reversible — this is a different
   * scale, not a scrambled one, and a reader can still tell that later is
   * further right.
   *
   * The break is signposted rather than hidden: the lead is drawn in a lighter
   * rule, and the year ticks that no longer fit are dropped instead of being
   * allowed to overprint each other. Bunched years under a faint rule read as
   * "compressed", which is what has happened.
   */
  const LEAD = 18;
  const careerStart = ordered.length > 0 ? monthsOf(ordered[0].startDate) : min;
  const runway = Math.max(careerStart - min, 1);
  const career = Math.max(max - careerStart, 1);

  const place = (t: number) =>
    t <= careerStart
      ? ((t - min) / runway) * LEAD
      : LEAD + ((t - careerStart) / career) * (100 - LEAD);

  const at = (iso: string) => place(monthsOf(iso));

  const years = [];
  for (let year = Math.ceil(min / 12); year * 12 <= max; year += 1) {
    years.push({ year, left: place(year * 12) });
  }

  return {
    /** Where the scale changes, as a percentage. The rule is drawn in two
     *  pieces so the compressed stretch can be shown as one. */
    lead: LEAD,
    ticks: years,
    // The degree is a join like any other as far as the line is concerned: a
    // tick where something started. It is first because it started first.
    /**
     * Each join carries its own dates now, rather than the line drawing the
     * companies and a parallel list carrying the ranges. Two lists of the same
     * four things is two places to change and one place to forget; the badge is
     * the thing you point at, so the dates belong on it.
     */
    joins: [
      {
        id: 'education',
        label: education.school,
        sub: education.credential,
        logo: undefined as Asset | undefined,
        range: `from ${formatMonth(education.startDate)}`,
        iso: education.startDate,
        left: at(education.startDate),
      },
      ...ordered.map((item) => ({
        id: item.id,
        label: item.company,
        sub: item.role,
        logo: item.logo,
        range: formatRange(item.startDate, item.endDate),
        iso: isoRange(item.startDate, item.endDate),
        left: at(item.startDate),
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
  const track = useRef<HTMLDivElement>(null);

  /**
   * Which badge is showing its dates.
   *
   * `sticky` is the difference between a hover and a tap. A pointer that moves
   * away should take the tooltip with it; a tap has no "away" to move to, so
   * clicking pins it until something else is clicked. One state rather than
   * two, because a hover and a tap cannot both be showing at once.
   */
  const [open, setOpen] = useState<{ id: string; sticky: boolean } | null>(null);

  // A pinned tooltip closes the way a menu does — on anything else, or on
  // Escape. Without this a tap on a phone leaves it up with no way back.
  useEffect(() => {
    if (!open?.sticky) return;

    const away = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.('.timeline-join')) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };

    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  /**
   * Which row each label sits in.
   *
   * Two joins eight months apart are about ninety pixels apart on a nine-year
   * line, and the labels they carry are wider than that — PayPal and Intuit
   * Mailchimp overlapped by a third of a label. No amount of type tuning fixes
   * that, because the positions are the data: the line is time, and July 2022
   * and April 2023 really are that close together.
   *
   * So a label that will not fit beside its neighbour moves up a row and grows
   * a leader back down to its own tick. Greedy, left to right, first row with
   * clearance wins — which keeps everything on row 0 when there is room and
   * only stacks the ones that genuinely collide.
   *
   * Widths are measured rather than estimated. A label's width depends on the
   * font that actually loaded, and guessing it is how a layout that passes on
   * one machine overlaps on another.
   */
  useEffect(() => {
    const node = track.current;
    if (!node) return;

    const stack = () => {
      const joins = [...node.querySelectorAll<HTMLElement>('.timeline-join')];
      const width = node.clientWidth;
      if (joins.length === 0 || width === 0) return;

      // The right edge of the last label placed in each row, in pixels.
      const edges: number[] = [];
      // A row has to be at least as tall as the tallest thing standing in it,
      // or lifting a label by one row leaves it short of clearing the one
      // below and overflowing the top of the track.
      let tallest = 0;

      for (const join of joins) {
        const label = join.querySelector<HTMLElement>('.timeline-company');
        const box = label?.getBoundingClientRect();
        const left = (parseFloat(join.style.left) / 100) * width;
        const right = left + (box?.width ?? 0) + GUTTER;

        let row = edges.findIndex((edge) => left >= edge);
        if (row === -1) row = edges.length;
        edges[row] = right;
        tallest = Math.max(tallest, box?.height ?? 0);

        join.style.setProperty('--row', String(row));
      }

      node.style.setProperty('--rows', String(edges.length));
      node.style.setProperty('--row-h', `${Math.ceil(tallest) + 4}px`);

      /**
       * Years, thinned.
       *
       * The warp crushes the pre-career years together — four of them into
       * eighteen percent of the line — and four labels in fifty pixels is not a
       * scale, it is a smudge. Any year that would collide with the last one
       * kept is dropped, left to right, so what survives is a legible sample
       * that gets denser where the line has room.
       *
       * Measured in three passes rather than one: everything is un-hidden
       * first, then every box is read, then the decisions are written. Reading
       * and writing in the same loop would measure some of them against the
       * layout the earlier ones had already changed.
       */
      const years = [...node.querySelectorAll<HTMLElement>('.timeline-year')];
      for (const year of years) year.removeAttribute('data-crowded');

      const boxes = years.map((year) => year.getBoundingClientRect());
      let occupied = -Infinity;

      years.forEach((year, index) => {
        if (boxes[index].left < occupied + YEAR_GAP) year.setAttribute('data-crowded', '');
        else occupied = boxes[index].right;
      });
    };

    stack();
    const observer = new ResizeObserver(stack);
    observer.observe(node);
    return () => observer.disconnect();
  }, [geometry]);

  return (
    <div className="timeline">
      {/* The rule, the years and the marks are decoration — a position on a
          line is not information anyone can hear, and each is hidden
          individually. The joins are not: they are buttons now, and a
          focusable control inside an `aria-hidden` subtree is unreachable by
          keyboard while still being in the tab order. */}
      <div className="timeline-track" ref={track}>
        {/* Two pieces, because the scale changes between them. The lighter one
            covers the years before the first job, which are compressed. */}
        <span
          aria-hidden="true"
          className="timeline-rule timeline-rule-lead"
          style={{ left: 0, width: `${geometry.lead}%` }}
        />
        <span
          aria-hidden="true"
          className="timeline-rule"
          style={{ left: `${geometry.lead}%`, width: `${100 - geometry.lead}%` }}
        />

        {geometry.ticks.map((tick) => (
          <span
            key={tick.year}
            aria-hidden="true"
            className="timeline-year"
            style={{ left: `${tick.left}%` }}
          >
            {tick.year}
          </span>
        ))}

        {/* An ordered list, because the order is the meaning — this is a
            sequence in time, and it should say so without the rule needing to
            be described. */}
        <ol className="timeline-joins">
          {geometry.joins.map((join) => {
            const showing = open?.id === join.id;

            return (
              <li key={join.id} className="timeline-join" style={{ left: `${join.left}%` }}>
                <button
                  type="button"
                  className="timeline-company"
                  /* The whole fact, in one string. The name and role are hidden
                     by CSS on a narrow screen and the dates are never rendered
                     as text, so nothing here can be assembled from what happens
                     to be on screen. */
                  aria-label={`${join.label} — ${join.sub}, ${join.range}`}
                  onPointerEnter={(event) => {
                    // Mouse only. A touch fires this on tap and would show the
                    // tooltip and then immediately pin it.
                    if (event.pointerType !== 'mouse') return;
                    setOpen((current) => (current?.sticky ? current : { id: join.id, sticky: false }));
                  }}
                  onPointerLeave={() => setOpen((current) => (current?.sticky ? current : null))}
                  onClick={() =>
                    setOpen((current) =>
                      current?.id === join.id && current.sticky
                        ? null
                        : { id: join.id, sticky: true },
                    )
                  }
                  onFocus={() =>
                    setOpen((current) =>
                      current?.id === join.id ? current : { id: join.id, sticky: false },
                    )
                  }
                  onBlur={() => setOpen((current) => (current?.sticky ? current : null))}
                >
                  <Badge name={join.label} logo={join.logo} />
                  <span className="timeline-text">
                    <span className="timeline-name">{join.label}</span>
                    {/* The role, in the secondary face. Two lines of the same
                        typeface at the same size read as one wrapped label; the
                        change of face is what separates the place from the
                        job. */}
                    <span className="timeline-role">{join.sub}</span>
                  </span>
                </button>

                {/* Flipped past halfway, so a tooltip on a late join opens back
                    across the line it belongs to rather than off the edge of a
                    phone — where the page clips overflow and it would simply
                    not be there. */}
                <span
                  className="timeline-detail"
                  data-open={showing || undefined}
                  data-flip={join.left > 50 || undefined}
                  aria-hidden="true"
                >
                  <span className="timeline-detail-company">{join.label}</span>
                  <span className="timeline-detail-role">{join.sub}</span>
                  <time dateTime={join.iso}>{join.range}</time>
                </span>
              </li>
            );
          })}
        </ol>

        {geometry.marks.map((mark) => (
          <span
            key={mark.id}
            aria-hidden="true"
            className="timeline-mark"
            style={{ left: `${mark.left}%` }}
          />
        ))}

        {/* Rides the carousel's continuous position, so it slides between two
            projects rather than snapping to whichever is nearest. Placed from
            the animation frame, which is why it is a ref. */}
        <span ref={cursorRef} aria-hidden="true" className="timeline-cursor" />
      </div>

      {/* Only the projects. The companies used to be listed here too, and are
          now the buttons above — one set of facts, one place to change them. */}
      <ol className="sr-only">
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
                  {employer ? <Badge name={employer.company} logo={employer.logo} /> : null}
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
   Badges
------------------------------------------------------------------------- */

/**
 * Initials, for an employer with no logo file.
 *
 * Capitalised words only, so "University at Buffalo" is UB rather than UAB —
 * the connector is not part of how anyone shortens the name. One-word names
 * keep one letter; "PP" for PayPal would be inventing an abbreviation nobody
 * uses.
 */
function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

/**
 * A company's mark.
 *
 * Draws a monogram unless the experience carries a real logo asset. That
 * default is deliberate: a company logo is a trademark, and Intuit and PayPal
 * both publish guidelines governing how theirs may be shown. This site does not
 * fetch one, approximate one, or ship one it was not given — supply an `Asset`
 * on the experience and it renders instead.
 *
 * Decorative either way. The company's name is set beside it in every place
 * this appears, so the mark is never the only thing carrying the fact.
 */
function Badge({ name, logo }: { name: string; logo?: Asset }) {
  if (logo) {
    return (
      <img
        className="badge"
        src={logo.src}
        alt=""
        width={logo.width}
        height={logo.height}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="badge badge-mono" aria-hidden="true">
      {monogram(name)}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Cards
------------------------------------------------------------------------- */

/**
 * Whether the visitor has asked for less movement.
 *
 * Read at render rather than in CSS, because a stylesheet cannot stop a video
 * playing — `autoplay` has to actually not be set. `useSyncExternalStore` keeps
 * the answer in the platform rather than in a second copy React owns, and the
 * server has no opinion at all.
 */
const QUIET = '(prefers-reduced-motion: reduce)';

function watchMotion(onChange: () => void) {
  const query = window.matchMedia(QUIET);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    watchMotion,
    () => window.matchMedia(QUIET).matches,
    () => false,
  );
}

function Shot({ project }: { project: Project }) {
  const [shot] = project.images;
  const reduced = useReducedMotion();

  if (!shot) {
    return (
      <div className="project-shot-empty" aria-hidden="true">
        No screenshot yet
      </div>
    );
  }

  /**
   * A clip of the thing running says more than a still of it stopped.
   *
   * Muted, looping and inline, so it behaves like an image rather than like
   * media — and `poster` carries the still. Autoplay is dropped and controls
   * appear under `prefers-reduced-motion`: something moving on its own is
   * exactly what that setting is asking not to happen, and a play button is the
   * honest alternative to silently showing nothing.
   */
  if (shot.media === 'video') {
    return (
      <video
        className="project-shot"
        src={shot.src}
        poster={shot.poster}
        aria-label={shot.alt}
        width={640}
        height={360}
        muted
        playsInline
        loop
        controls={reduced}
        autoPlay={!reduced}
        preload="metadata"
      />
    );
  }

  return <img className="project-shot" src={shot.src} alt={shot.alt} width={640} height={360} />;
}

/**
 * How far along it is — but only when that is news.
 *
 * Every finished project carrying a "shipped" badge is a column of the same
 * word, which reads as decoration rather than information. The two states worth
 * saying out loud are the ones that change how the work should be read.
 */
function Status({ status }: { status: Project['status'] }) {
  if (status === 'shipped') return null;
  return (
    <span className="project-status" data-status={status}>
      {status === 'building' ? 'Still building' : 'Archived'}
    </span>
  );
}

function CardFace({ project, employer }: { project: Project; employer?: Experience }) {
  return (
    <>
      <Shot project={project} />
      <div className="project-body">
        <p className="project-context">
          {employer ? <Badge name={employer.company} logo={employer.logo} /> : null}
          {employer ? employer.company : 'Personal project'}
          <Status status={project.status} />
        </p>
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
          {employer ? <Badge name={employer.company} logo={employer.logo} /> : null}
          {employer ? `Built at ${employer.company}` : 'Personal project'} ·{' '}
          {formatMonth(project.date)}
          {project.duration ? ` · ${project.duration}` : ''}
          <Status status={project.status} />
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
