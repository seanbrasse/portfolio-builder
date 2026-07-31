'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

/**
 * A one-value field that wraps instead of scrolling, and says how much room is
 * left.
 *
 * A single-line `<input>` hides the end of anything longer than the box, which
 * is a poor way to edit copy whose length is the thing you are managing — you
 * cannot see what you are cutting. A `<textarea>` shows all of it, and this one
 * grows to fit so there is no inner scrollbar either.
 *
 * Enter is swallowed. Every field this is used for holds a single value: a
 * tagline, a comma-separated list, one sentence of social copy. A newline in
 * any of them is invisible in the box and then reappears in the middle of a
 * meta tag. There is no case here where a line break belongs.
 *
 * `maxLength` is the actual limit — the browser stops the keystroke. The
 * counter exists so the limit is something you can see coming rather than one
 * you hit. The same numbers are checked in `validateIssue` and enforced as
 * constraints on the table, so this is the friendliest of three locks, not the
 * only one.
 *
 * The label is associated by id rather than wrapping the field. A wrapping
 * `<label>` contributes *all* of its text to the accessible name, so the
 * counter and the hint would be read out as part of what the field is called —
 * "Tagline 47 / 120 The line under your name…" — and the name would change on
 * every keystroke. Described-by keeps them as description, which is what they
 * are.
 */
export function Grow({
  name,
  label,
  max,
  defaultValue = '',
  hint,
  placeholder,
}: {
  name: string;
  label: string;
  max: number;
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const box = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const noteId = `${id}-note`;

  const fit = useCallback(() => {
    const node = box.current;
    if (!node) return;
    // Collapse first: scrollHeight cannot report a height smaller than the
    // element already has, so measuring without this makes the field grow and
    // never shrink.
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, []);

  // Before paint, so the field is never briefly one row tall on a value that
  // needs three.
  useLayoutEffect(fit, [fit, value]);

  /**
   * Width changes rewrap the text, which changes the height. Without this the
   * field keeps the height it had at the old width — too short, and scrolling
   * internally again.
   */
  useEffect(() => {
    const node = box.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fit]);

  const used = value.length;
  const room = max - used;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {/* Hidden from assistive tech: it changes on every keystroke, and the
            limit is already in the description below and enforced by the
            field itself. A number that re-announces itself per character is
            noise, not help. */}
        <span
          className="field-count"
          aria-hidden="true"
          /* Marked rather than coloured inline, so the stylesheet owns what
             "nearly full" and "full" look like in each theme. */
          data-state={room === 0 ? 'full' : room <= Math.ceil(max * 0.1) ? 'near' : undefined}
        >
          {used} / {max}
        </span>
      </label>

      <textarea
        ref={box}
        id={id}
        name={name}
        rows={1}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        aria-describedby={noteId}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        className="field-grow"
      />

      <span className="admin-note" id={noteId}>
        {hint ? `${hint} ` : ''}
        {`Up to ${max} characters.`}
      </span>
    </div>
  );
}
