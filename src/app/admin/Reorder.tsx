'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import type { Result } from './actions';

/**
 * Move an image up or down its project's order.
 *
 * Two buttons rather than a drag handle, deliberately: the image preview beside
 * these already claims the pointer for setting the focal point, so a drag to
 * reorder in the same place would fight it. Up and down are unambiguous, work
 * from the keyboard, and the ends simply disable.
 *
 * The actions are passed in already bound to this image's id, so the id never
 * travels from the client — the page closes over it in a server action.
 */
export function Reorder({
  up,
  down,
  isFirst,
  isLast,
}: {
  up: () => Promise<Result>;
  down: () => Promise<Result>;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const move = (action: () => Promise<Result>) =>
    start(async () => {
      const result = await action();
      if (result.ok) router.refresh();
    });

  return (
    <span className="admin-reorder">
      <button
        type="button"
        className="admin-reorder-button"
        aria-label="Move earlier"
        disabled={pending || isFirst}
        onClick={() => move(up)}
      >
        ↑
      </button>
      <button
        type="button"
        className="admin-reorder-button"
        aria-label="Move later"
        disabled={pending || isLast}
        onClick={() => move(down)}
      >
        ↓
      </button>
    </span>
  );
}
