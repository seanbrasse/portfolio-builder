import type { Page } from '@/content/types';

import { getTemplate } from './templates';

/**
 * The issue as a physical object.
 *
 * A comic page is a fixed canvas, not a flow. Everything below is laid out at
 * `PAGE_W` x `PAGE_H` and then scaled to fit whatever window it is being read
 * in, which is what makes "no scrolling" achievable: the page cannot overflow
 * a box it was designed inside. It also means the composition is identical on
 * every screen, the way a printed page is.
 *
 * The canvas is deliberately squarer than a real comic (0.77 rather than
 * 0.65). Two tall pages side by side on a laptop force a scale factor low
 * enough to make body copy unreadable; trading some authenticity of proportion
 * buys back the legibility that the format exists to deliver.
 */
export const PAGE_W = 880;
export const PAGE_H = 1140;

export type Leaf =
  | { kind: 'cover' }
  | { kind: 'page'; page: Page };

export type Spread = {
  /** Null on the opening spread — a cover has no facing page. */
  left: Leaf | null;
  right: Leaf | null;
};

/**
 * Desktop reads as spreads, the way an open book does: the cover sits alone on
 * the right, then pages pair off. Mobile reads one leaf at a time.
 */
export function buildLeaves(pages: Page[]): Leaf[] {
  return [{ kind: 'cover' }, ...pages.map((page) => ({ kind: 'page' as const, page }))];
}

export function buildSpreads(leaves: Leaf[]): Spread[] {
  const [cover, ...rest] = leaves;
  const spreads: Spread[] = [{ left: null, right: cover ?? null }];

  for (let i = 0; i < rest.length; i += 2) {
    spreads.push({ left: rest[i] ?? null, right: rest[i + 1] ?? null });
  }

  return spreads;
}

/**
 * How many panels a leaf draws, which is what the facing page has to wait for.
 *
 * The ink-in runs as one sequence across the whole spread rather than two that
 * start together: a reader reads the left page and then the right one, so the
 * right page's first panel is offset by every panel on the left. The cover
 * contributes nothing — it has its own entrance and no panels.
 */
export function leafPanelCount(leaf: Leaf | null): number {
  if (!leaf || leaf.kind === 'cover') return 0;
  return getTemplate(leaf.page.templateId).slots.length;
}

/** Which spread a slug lives on, so a deep link opens the book to the right place. */
export function spreadIndexForSlug(spreads: Spread[], slug: string | null): number {
  if (!slug) return 0;
  const index = spreads.findIndex((spread) =>
    [spread.left, spread.right].some(
      (leaf) => leaf?.kind === 'page' && leaf.page.slug === slug,
    ),
  );
  return index === -1 ? 0 : index;
}

/** Which single leaf a slug is, for the mobile one-at-a-time reading. */
export function leafIndexForSlug(leaves: Leaf[], slug: string | null): number {
  if (!slug) return 0;
  const index = leaves.findIndex((leaf) => leaf.kind === 'page' && leaf.page.slug === slug);
  return index === -1 ? 0 : index;
}
