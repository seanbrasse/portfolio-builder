'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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
  const router = useRouter();

  return (
    <form
      className="admin-form"
      action={(form) =>
        start(async () => {
          const result = await action(form);
          setState(result);
          // The list this form sits beside is server-rendered, so a save that
          // does not refresh leaves the page showing what it showed before.
          if (result.ok) router.refresh();
        })
      }
    >
      {children}

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
