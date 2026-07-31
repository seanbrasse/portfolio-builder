'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import type { Result } from './actions';

/**
 * A form that reports what happened.
 *
 * Server actions return a `Result` rather than throwing, so the failure a
 * database constraint produces — a summary over 200 characters, a professional
 * project with no employer — arrives as a sentence under the button instead of
 * an error page that loses everything typed. The constraints are the same ones
 * the panels have; being told about them here is the point of having them.
 */
export function Form({
  action,
  children,
  submit = 'Save',
}: {
  action: (form: FormData) => Promise<Result>;
  children: React.ReactNode;
  submit?: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<Result | null>(null);
  const node = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={node}
      className="admin-form"
      /**
       * `noValidate` so the browser does not silently swallow the submit.
       *
       * A React form action bypasses the native submit event, which means a
       * field failing its `pattern` can stop the submit with no visible reason.
       * Validity is checked explicitly instead: `reportValidity` shows the
       * browser's own message on the offending field and focuses it, and the
       * summary below names how many there are, so a failure at the bottom of a
       * long form is not silent at the top.
       */
      noValidate
      action={(form) => {
        const element = node.current;
        if (element && !element.checkValidity()) {
          element.reportValidity();
          const bad = element.querySelectorAll(':invalid').length;
          setState({
            ok: false,
            error:
              bad === 1
                ? 'One field needs fixing — it is highlighted above.'
                : `${bad} fields need fixing — the first is highlighted above.`,
          });
          return;
        }

        start(async () => {
          const result = await action(form);
          setState(result);
          // The list this form sits beside is server-rendered, so a save that
          // does not refresh leaves the page showing what it showed before.
          if (result.ok) router.refresh();
        });
      }}
    >
      {children}

      {/* Sticky, because these forms are longer than a screen and a Save button
          you have to go looking for is a Save button that does not get pressed.
          It is also where every failure is reported, so the message and the
          control that produced it stay together. */}
      <div className="admin-actions">
        <button type="submit" className="admin-button" disabled={pending}>
          {pending ? 'Saving…' : submit}
        </button>

        {state ? (
          <p className={state.ok ? 'admin-ok' : 'admin-error'} role="status">
            {state.ok ? 'Saved. The live site has been rebuilt.' : state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/**
 * A destructive action, behind a confirmation.
 *
 * Deleting a project takes its images with it — that is a foreign key cascade,
 * not something this can undo — so the confirmation is the only thing between a
 * misclick and losing the row.
 */
export function DeleteButton({
  action,
  label,
  confirm: question,
}: {
  action: () => Promise<Result>;
  label: string;
  confirm: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className="admin-button admin-danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!window.confirm(question)) return;
            const result = await action();
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
      >
        {pending ? 'Working…' : label}
      </button>
      {error ? (
        <p className="admin-error" role="status">
          {error}
        </p>
      ) : null}
    </>
  );
}
