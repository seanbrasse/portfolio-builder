'use client';

import { useRef, useState, useTransition } from 'react';

import { suggestProjectEdits } from './actions';
import type { SuggestField } from '@/lib/prefill';

/**
 * Suggest edits to an existing project from a pasted doc or link.
 *
 * Unlike the new-project prefill, which fills a blank form, this is a review
 * step: you paste a source, Claude proposes changes to the fields that already
 * have content, and you apply them one at a time (or all at once). Applying a
 * suggestion writes it into the form field — editable, and saved with the same
 * Save-as-draft / Save & publish buttons as any other edit — so nothing changes
 * on the site until you choose to publish.
 *
 * It reaches the surrounding form with `closest('form')`, the same way the
 * prefill box does, to read the current values and to write applied ones.
 */

const FIELDS: { name: SuggestField; label: string; multiline: boolean }[] = [
  { name: 'title', label: 'Title', multiline: false },
  { name: 'summary', label: 'Card summary', multiline: true },
  { name: 'story', label: 'Story', multiline: true },
  { name: 'impact', label: 'Impact', multiline: false },
  { name: 'tech', label: 'Tech', multiline: false },
];

type Fillable = HTMLInputElement | HTMLTextAreaElement;

/** Set a value the React-safe way, so the uncontrolled field takes and keeps it. */
function setValue(el: Fillable | null, value: string) {
  if (!el) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

type Item = {
  name: SuggestField;
  label: string;
  multiline: boolean;
  current: string;
  suggested: string;
};

/** Shown once every suggestion has been applied or dismissed. */
const DONE_NOTE = 'Done — review the fields below, then save as a draft or publish.';

export function SuggestEdits() {
  const root = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function fieldEl(name: string) {
    return root.current?.closest('form')?.querySelector<Fillable>(`[name="${name}"]`) ?? null;
  }

  function run() {
    setError('');
    setNote('');

    start(async () => {
      const current: Record<string, string> = {};
      for (const { name } of FIELDS) current[name] = fieldEl(name)?.value ?? '';

      const result = await suggestProjectEdits(input, current);
      if (!result.ok) {
        setError(result.error);
        setItems([]);
        return;
      }

      // Keep only fields the model actually changed — a suggestion equal to
      // what is already there is not a suggestion.
      const next: Item[] = [];
      for (const field of FIELDS) {
        const suggested = result.data[field.name];
        if (suggested === undefined) continue;
        if (suggested.trim() === (current[field.name] ?? '').trim()) continue;
        next.push({ ...field, current: current[field.name] ?? '', suggested });
      }

      setItems(next);
      if (next.length === 0) setNote('No changes suggested — the fields already read well.');
    });
  }

  // Applying or dismissing closes that field's card. When the last one is
  // handled the list empties and the box is back to its paste-and-suggest state,
  // ready for another pass — no stale cards lingering until a refresh.
  function apply(name: SuggestField) {
    const item = items.find((entry) => entry.name === name);
    if (!item) return;
    setValue(fieldEl(name), item.suggested);
    const next = items.filter((entry) => entry.name !== name);
    setItems(next);
    setNote(next.length === 0 ? DONE_NOTE : '');
  }

  function applyAll() {
    for (const item of items) setValue(fieldEl(item.name), item.suggested);
    setItems([]);
    setNote(DONE_NOTE);
  }

  function dismiss(name: SuggestField) {
    const next = items.filter((entry) => entry.name !== name);
    setItems(next);
    setNote(next.length === 0 ? DONE_NOTE : '');
  }

  return (
    <div ref={root} className="admin-suggest" aria-busy={pending}>
      <span className="field-label">Suggest edits from a doc or link</span>
      <p className="admin-note">
        Paste notes, a write-up, or a link and Claude proposes edits to the
        fields below. Review each one and apply what you want — then save as a
        draft or publish.
      </p>
      <textarea
        className="admin-suggest-input"
        rows={4}
        value={input}
        disabled={pending}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste a document, notes, or a URL…"
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
