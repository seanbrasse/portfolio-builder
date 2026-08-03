'use client';

import { useEffect, useRef, useState } from 'react';

import { autosaveProject } from './actions';

/**
 * Autosave the project editor's edits to its one allowed draft.
 *
 * The project form is long and its fields are uncontrolled, so a stray refresh
 * used to lose everything typed since the last manual save. This watches the
 * surrounding form and, a beat after the typing stops, saves the current values
 * as a draft — the same slot the "Save as draft" button writes to, so a refresh
 * reloads the draft (the page already merges it over the live row) and picks up
 * where you left off. Nothing goes live until you press Save & publish.
 *
 * How it stays out of the way:
 *  - Debounced: it fires ~a second after the last edit, not on every keystroke.
 *  - Idempotent: it serialises the form and skips the save when nothing actually
 *    changed since the last one, so focus churn and no-op events cost nothing.
 *  - Best-effort flush: it also saves when the tab is hidden and when an image
 *    upload announces itself (`admin-autosave-flush`), and it stands down while a
 *    manual submit is in flight so the two never race.
 *
 * It only renders for an existing project. A new one has no draft slot yet; its
 * first manual save creates the row and lands on the edit page, where this takes
 * over. It reaches the form with `closest('form')`, like the other form helpers.
 */

const DEBOUNCE_MS = 1000;

type State = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function Autosave() {
  const anchor = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const form = anchor.current?.closest('form');
    if (!form) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let saving = false;
    let rerun = false;
    // The last state we know is persisted, so a save that would write the same
    // thing is skipped. Seeded with what the page loaded (the draft, if any).
    let lastSaved = serialize(form);

    function serialize(node: HTMLFormElement): string {
      const parts: string[] = [];
      for (const [key, value] of new FormData(node).entries()) {
        parts.push(`${key}=${typeof value === 'string' ? value : ''}`);
      }
      return parts.join('');
    }

    async function save() {
      const node = anchor.current?.closest('form');
      if (!node) return;

      const snapshot = serialize(node);
      if (snapshot === lastSaved) {
        // Nothing new since the last save — leave the status as it was.
        return;
      }
      if (saving) {
        // A save is in flight; run once more when it finishes.
        rerun = true;
        return;
      }

      saving = true;
      setState('saving');
      try {
        const result = await autosaveProject(new FormData(node));
        if (result.ok) {
          lastSaved = snapshot;
          setMessage('');
          setState('saved');
        } else {
          setMessage(result.error);
          setState('error');
        }
      } catch {
        setMessage('Could not autosave just now — your changes are still here; try Save.');
        setState('error');
      } finally {
        saving = false;
        if (rerun) {
          rerun = false;
          void save();
        }
      }
    }

    function schedule() {
      setState('pending');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void save();
      }, DEBOUNCE_MS);
    }

    function flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      void save();
    }

    function onSubmit() {
      // A manual save is taking over; drop the pending autosave and treat the
      // submitted values as the new baseline so we don't immediately re-save.
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const node = anchor.current?.closest('form');
      if (node) lastSaved = serialize(node);
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }

    form.addEventListener('input', schedule);
    form.addEventListener('change', schedule);
    form.addEventListener('submit', onSubmit);
    window.addEventListener('admin-autosave-flush', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      form.removeEventListener('input', schedule);
      form.removeEventListener('change', schedule);
      form.removeEventListener('submit', onSubmit);
      window.removeEventListener('admin-autosave-flush', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={anchor} className="admin-autosave" data-state={state} role="status" aria-live="polite">
      {state === 'saving' ? (
        <>
          <span className="admin-spinner" aria-hidden="true" />
          Saving draft…
        </>
      ) : state === 'pending' ? (
        'Unsaved changes…'
      ) : state === 'saved' ? (
        'Draft saved'
      ) : state === 'error' ? (
        message
      ) : (
        'Autosaves your changes as a draft'
      )}
    </div>
  );
}
