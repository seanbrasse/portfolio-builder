'use client';

import { useRef, useState, useTransition } from 'react';

import { draftProject } from './actions';
import type { Prefill, ReviewField } from '@/lib/prefill';

/**
 * Draft a project from a doc, notes, or a link — for a new project or an old one.
 *
 * One tool does both jobs, because they are the same job: you paste a source
 * (a GitHub repo, a live URL, notes, or a whole write-up), Claude reads it, and
 * it proposes values for the fields. On a new project the fields are empty so the
 * proposals are a first draft; on an existing one they carry the current text so
 * the proposals are edits. Either way you review the prose fields one at a time
 * and apply what you want — nothing is saved until you press Save.
 *
 * The prose fields (title, summary, story, impact, tech) show as before/after
 * cards you apply or dismiss. The structural fields (id, date, links, and the
 * personal/professional kind) have no meaningful "before" on a blank form, so on
 * a new project they are filled directly; on an existing project they are left
 * alone — you are editing copy, not rebuilding the scaffolding.
 *
 * It reaches the surrounding form with `closest('form')` and addresses fields by
 * their `name`, the same way the rest of the admin form-fillers do. The fields
 * are uncontrolled, so the native value setter plus an `input` event is what
 * makes a set value stick and be read by `FormData` on submit.
 */

const FIELDS: { name: ReviewField; label: string }[] = [
  { name: 'title', label: 'Title' },
  { name: 'summary', label: 'Card summary' },
  { name: 'story', label: 'Story' },
  { name: 'impact', label: 'Impact' },
  { name: 'tech', label: 'Tech' },
];

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Set a value the React-safe way, so the uncontrolled field takes and keeps it. */
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

/** The drafted value for a review field, as the string its form field wants. */
function draftValue(draft: Prefill, name: ReviewField): string {
  return name === 'tech' ? draft.tech.join(', ') : (draft[name] ?? '');
}

type Item = {
  name: ReviewField;
  label: string;
  current: string;
  suggested: string;
};

/** Shown once every suggestion has been applied or dismissed. */
const DONE_NOTE = 'Done — review the fields below, then save as a draft or publish.';

export function ProjectDraft({ creating }: { creating: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function form() {
    return root.current?.closest('form') ?? null;
  }

  function fieldEl(name: string) {
    return form()?.querySelector<Fillable>(`[name="${name}"]`) ?? null;
  }

  function run() {
    setError('');
    setNote('');

    start(async () => {
      const current: Record<string, string> = {};
      for (const { name } of FIELDS) current[name] = fieldEl(name)?.value ?? '';

      const result = await draftProject(input, current);
      if (!result.ok) {
        setError(result.error);
        setItems([]);
        return;
      }

      const draft = result.data;

      // A new project has no scaffolding yet, so fill the structural fields the
      // review cards don't cover — id, date, kind, and the source's links. An
      // existing project keeps its own; this flow only edits its copy.
      if (creating) await applyScaffold(draft);

      // One card per prose field the draft would change. A value equal to what
      // is already there is not a suggestion.
      const next: Item[] = [];
      for (const field of FIELDS) {
        const suggested = draftValue(draft, field.name);
        if (!suggested.trim()) continue;
        if (suggested.trim() === (current[field.name] ?? '').trim()) continue;
        next.push({ ...field, current: current[field.name] ?? '', suggested });
      }

      setItems(next);
      if (next.length > 0) {
        setNote(creating ? 'Filled the basics from your source. Review the suggestions below and apply the rest.' : '');
      } else {
        setNote(
          creating
            ? 'Drafted the fields from your source — review them below, then save as a draft or publish.'
            : 'No changes suggested — the fields already read well.',
        );
      }
    });
  }

  /** Fill the fields that have no before/after to review, for a new project. */
  async function applyScaffold(draft: Prefill) {
    // Don't clobber anything already typed; a blank field is the signal to fill.
    if (!fieldEl('id')?.value.trim()) setValue(fieldEl('id'), draft.id);
    if (!fieldEl('date')?.value.trim()) setValue(fieldEl('date'), draft.date);
    setValue(fieldEl('context'), draft.context);
    await fillLinks(draft.links);
  }

  /**
   * Pour the drafted links into the `LinkRows` group.
   *
   * That group renders one empty row and grows by a button, so to hold more than
   * one link we click the button the needed number of times, waiting a paint
   * between clicks — `LinkRows` grows from a stale length closure, so two clicks
   * in one tick both read the old count and add only one row. Skipped entirely if
   * the editor has already started a link row, so we never fight their input.
   */
  async function fillLinks(links: Prefill['links']) {
    const node = form();
    if (!node || links.length === 0) return;

    const urls = () => node.querySelectorAll<HTMLInputElement>('input[name="link_url"]');
    const alreadyHasOne = Array.from(urls()).some((el) => el.value.trim());
    if (alreadyHasOne) return;

    const addButton = Array.from(node.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Add link',
    );
    for (let guard = 0; addButton && urls().length < links.length && guard < 24; guard += 1) {
      addButton.click();
      await nextPaint();
    }

    const labels = node.querySelectorAll<HTMLInputElement>('input[name="link_label"]');
    const rows = node.querySelectorAll<HTMLInputElement>('input[name="link_url"]');
    const types = node.querySelectorAll<HTMLSelectElement>('select[name="link_type"]');
    links.forEach((link, i) => {
      setValue(labels[i] ?? null, link.label);
      setValue(rows[i] ?? null, link.url);
      setValue(types[i] ?? null, link.type);
    });
  }

  // Applying or dismissing closes that field's card. When the last one is
  // handled the list empties and the box returns to its paste-and-suggest state,
  // ready for another pass — and clears the pasted source, since that pass is
  // done and the box should read empty for the next doc.
  function closeOut() {
    setNote(DONE_NOTE);
    setInput('');
  }

  function apply(name: ReviewField) {
    const item = items.find((entry) => entry.name === name);
    if (!item) return;
    setValue(fieldEl(name), item.suggested);
    const next = items.filter((entry) => entry.name !== name);
    setItems(next);
    if (next.length === 0) closeOut();
    else setNote('');
  }

  function applyAll() {
    for (const item of items) setValue(fieldEl(item.name), item.suggested);
    setItems([]);
    closeOut();
  }

  function dismiss(name: ReviewField) {
    const next = items.filter((entry) => entry.name !== name);
    setItems(next);
    if (next.length === 0) closeOut();
    else setNote('');
  }

  return (
    <div ref={root} className="admin-suggest" aria-busy={pending}>
      <span className="field-label">
        {creating ? 'Start from a doc, notes, or a link' : 'Suggest edits from a doc or link'}
      </span>
      <p className="admin-note">
        {creating
          ? 'Paste a GitHub repo, a live URL, notes, or a write-up and Claude drafts the fields below from it. Review each suggestion and apply what you want — then save as a draft or publish.'
          : 'Paste notes, a write-up, or a link and Claude proposes edits to the fields below. Review each one and apply what you want — then save as a draft or publish.'}
      </p>
      <textarea
        className="admin-suggest-input"
        rows={4}
        value={input}
        disabled={pending}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste a GitHub repo, a URL, notes, or a document…"
      />
      <div className="admin-suggest-actions">
        <button
          type="button"
          className="admin-button"
          disabled={pending || !input.trim()}
          onClick={run}
        >
          {pending ? (
            <>
              <span className="admin-spinner" aria-hidden="true" />
              Reading…
            </>
          ) : creating ? (
            'Draft the fields'
          ) : (
            'Suggest edits'
          )}
        </button>
        {items.length > 1 ? (
          <button type="button" className="admin-button admin-quiet" onClick={applyAll}>
            Apply all ({items.length})
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="admin-error" role="status">
          {error}
        </p>
      ) : note ? (
        <p className="admin-ok" role="status">
          {note}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="admin-suggest-list">
          {items.map((item) => (
            <li key={item.name} className="suggest-item">
              <div className="suggest-item-head">
                <span className="field-label">{item.label}</span>
                <span className="suggest-item-buttons">
                  <button
                    type="button"
                    className="admin-button admin-button-sm"
                    onClick={() => apply(item.name)}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button-sm admin-quiet"
                    onClick={() => dismiss(item.name)}
                  >
                    Dismiss
                  </button>
                </span>
              </div>
              <div className="suggest-diff">
                <div className="suggest-side">
                  <span className="suggest-side-label">Current</span>
                  <p className="suggest-text suggest-current">{item.current || '(empty)'}</p>
                </div>
                <div className="suggest-side">
                  <span className="suggest-side-label">Suggested</span>
                  <p className="suggest-text suggest-new">{item.suggested}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
