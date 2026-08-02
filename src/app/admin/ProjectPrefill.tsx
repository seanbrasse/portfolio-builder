'use client';

import { useRef, useState, useTransition } from 'react';

import { prefillProject } from './actions';
import type { Prefill } from '@/lib/prefill';

/**
 * Paste a link, get a first draft.
 *
 * This sits above the create form and does one thing: takes a URL — a GitHub
 * repo, a live site — sends it to `prefillProject`, and pours what comes back
 * into the form's fields as editable defaults. It writes nothing itself; the
 * editor reviews the draft and presses Save like any other project.
 *
 * It reaches into the surrounding form the same way `OgPreview` does — finding
 * it with `closest('form')` and addressing fields by their `name`. The fields
 * are uncontrolled, so setting `.value` sticks and is what `FormData` reads on
 * submit; the native value setter plus an `input` event is used so anything
 * listening (and React itself, defensively) sees the change.
 */

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Set a value the way React expects, so uncontrolled and controlled both take it. */
function setValue(el: Fillable | null, value: string) {
  if (!el) return;
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Two animation frames: long enough for React to render any link rows we added. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export function ProjectPrefill() {
  const root = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [filled, setFilled] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    const form = root.current?.closest('form');
    if (!form) return;

    setError('');
    setFilled(false);

    start(async () => {
      const result = await prefillProject(url);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      await applyPrefill(form, result.data);
      setFilled(true);
    });
  }

  return (
    <div ref={root} className="admin-prefill" aria-busy={pending}>
      <span className="field-label">Start from a link</span>
      <p className="admin-note">
        Paste a GitHub repo or a live URL and Claude drafts the fields below from
        it. Everything it fills in is a starting point — review and edit before
        saving.
      </p>
      <div className="admin-prefill-row">
        <input
          type="url"
          value={url}
          disabled={pending}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://github.com/you/project"
          aria-label="Link to fill the form from"
          onKeyDown={(event) => {
            // Enter here should fetch, not submit the whole project form.
            if (event.key === 'Enter') {
              event.preventDefault();
              if (url.trim() && !pending) run();
            }
          }}
        />
        <button
          type="button"
          className="admin-button"
          disabled={pending || !url.trim()}
          onClick={run}
        >
          {pending ? (
            <>
              <span className="admin-spinner" aria-hidden="true" />
              Reading the link…
            </>
          ) : (
            'Fetch & fill'
          )}
        </button>
      </div>
      {pending ? (
        <p className="admin-note admin-prefill-status" role="status">
          Fetching the source and drafting the fields — this can take a few
          seconds.
        </p>
      ) : error ? (
        <p className="admin-error" role="status">
          {error}
        </p>
      ) : filled ? (
        <p className="admin-ok" role="status">
          Filled from the link. Review the fields below, then save.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Pour a whole draft into the form.
 *
 * Scalar fields first, then the links (which may need rows added), so the
 * caller awaits one thing. Split out from the component so its DOM-filling —
 * the part with the timing subtleties — can be exercised on its own.
 */
export async function applyPrefill(form: HTMLFormElement, d: Prefill) {
  const field = <T extends Fillable>(name: string) => form.querySelector<T>(`[name="${name}"]`);

  setValue(field('id'), d.id);
  setValue(field('title'), d.title);
  setValue(field('date'), d.date);
  setValue(field('context'), d.context);
  setValue(field('summary'), d.summary);
  setValue(field('impact'), d.impact);
  setValue(field('tech'), d.tech.join(', '));
  setValue(field('situation'), d.situation);
  setValue(field('task'), d.task);
  setValue(field('action'), d.action);
  setValue(field('result'), d.result);

  await fillLinks(form, d.links);
}

/**
 * Pour the drafted links into the `LinkRows` group.
 *
 * That group renders one empty row to start and grows by a button, so to hold
 * more than one link we click the button the needed number of times, wait for
 * React to render the new rows, then fill every row in order. The source's own
 * links lead the list, so row one is the repo the editor pasted.
 */
async function fillLinks(form: HTMLFormElement, links: { label: string; url: string; type: string }[]) {
  if (links.length === 0) return;

  const rows = () => form.querySelectorAll<HTMLInputElement>('input[name="link_url"]').length;
  const addButton = Array.from(form.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'Add link',
  );

  // One click, one paint, repeat. `LinkRows` grows from a stale `rows` closure,
  // so two clicks in the same tick both read the old length and add only one
  // row between them — the paint in between is what lets the next click see the
  // row the last one added. The guard is a floor against a missing button.
  for (let guard = 0; addButton && rows() < links.length && guard < 24; guard += 1) {
    addButton.click();
    await nextPaint();
  }

  const labels = form.querySelectorAll<HTMLInputElement>('input[name="link_label"]');
  const urls = form.querySelectorAll<HTMLInputElement>('input[name="link_url"]');
  const types = form.querySelectorAll<HTMLSelectElement>('select[name="link_type"]');

  links.forEach((link, i) => {
    setValue(labels[i] ?? null, link.label);
    setValue(urls[i] ?? null, link.url);
    setValue(types[i] ?? null, link.type);
  });
}
