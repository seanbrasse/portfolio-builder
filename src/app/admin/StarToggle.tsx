'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { setProjectStar } from './actions';

/**
 * The pin control, one per project row.
 *
 * A filled star is the pinned project; an outline is not. Pinning is
 * single-slot — the server clears any other star before setting this one — so
 * after a click the whole list is refreshed to pick up the star that just came
 * off another row.
 *
 * `useOptimistic` fills (or empties) the star the instant it is pressed and
 * falls back to the server's answer when the refresh lands, so a failed write
 * simply reverts. A button rather than a link, so it sits inside the row's card
 * without nesting an action inside the row's edit link — the two would fight
 * over the click.
 */
export function StarToggle({ id, starred }: { id: string; starred: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(starred);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className="star-toggle"
      data-on={optimistic || undefined}
      aria-pressed={optimistic}
      aria-label={
        optimistic ? 'Pinned to the front — tap to unpin' : 'Pin to the front of the carousel'
      }
      title={optimistic ? 'Pinned to the front' : 'Pin to the front'}
      disabled={pending}
      onClick={() => {
        const next = !starred;
        start(async () => {
          setOptimistic(next);
          await setProjectStar(id, next);
          router.refresh();
        });
      }}
    >
      <span aria-hidden="true">{optimistic ? '★' : '☆'}</span>
    </button>
  );
}
