/**
 * Page templates (PRD section 6).
 *
 * A fixed library of named CSS grids, not a canvas. Each template declares two
 * things and only two things:
 *
 *   1. `areas`  — the desktop `grid-template-areas` map.
 *   2. `mobileOrder` — the reading order used by guided view below 768px.
 *
 * The mobile order is *declared*, never derived from the grid. Deriving it is
 * how comic pages end up read out of sequence: a grid that looks like left-to-
 * right often is not, and the DOM has to match the reading order regardless
 * (ACC-1). Because both the desktop grid and the mobile sequence come from the
 * same `slots` array, DOM order and reading order cannot drift apart.
 *
 * COMP-5: templates live in code on purpose. Adding one is a deploy. That
 * happens rarely and it keeps art direction under version control.
 */

export type Template = {
  id: string;
  name: string;
  /** Rows of the desktop grid, as `grid-template-areas` strings. */
  areas: string[];
  /** Column track sizing. */
  columns: string;
  /** Row track sizing. */
  rows: string;
  /**
   * Canonical order. This is DOM order, tab order, guided-view order, and the
   * animation stagger order — all four are the same list.
   */
  slots: string[];
};

export const TEMPLATES = {
  'hero-2-3': {
    id: 'hero-2-3',
    name: 'Hero, two, three',
    areas: ['hero  hero  hero', 'left  left  right', 'a     b     c'],
    columns: 'repeat(3, minmax(0, 1fr))',
    rows: 'minmax(250px, auto) minmax(200px, auto) minmax(200px, auto)',
    slots: ['hero', 'left', 'right', 'a', 'b', 'c'],
  },
  'stack-3': {
    id: 'stack-3',
    name: 'Three bands',
    areas: ['a', 'b', 'c'],
    columns: 'minmax(0, 1fr)',
    rows: 'repeat(3, minmax(200px, auto))',
    slots: ['a', 'b', 'c'],
  },
  'splash-4': {
    id: 'splash-4',
    name: 'Splash four',
    areas: ['a b', 'c d'],
    columns: 'repeat(2, minmax(0, 1fr))',
    rows: 'repeat(2, minmax(260px, auto))',
    slots: ['a', 'b', 'c', 'd'],
  },
  'hero-2': {
    id: 'hero-2',
    name: 'Hero and two',
    areas: ['hero hero', 'a    b'],
    columns: 'repeat(2, minmax(0, 1fr))',
    rows: 'minmax(300px, auto) minmax(220px, auto)',
    slots: ['hero', 'a', 'b'],
  },
  'full-bleed': {
    id: 'full-bleed',
    name: 'Full bleed',
    areas: ['a'],
    columns: 'minmax(0, 1fr)',
    rows: 'minmax(420px, auto)',
    slots: ['a'],
  },
} satisfies Record<string, Template>;

/** A page can only name a template that exists. */
export type TemplateId = keyof typeof TEMPLATES;

export function getTemplate(id: TemplateId): Template {
  return TEMPLATES[id];
}

/** The inline style that realizes a template as a desktop grid. */
export function gridStyle(template: Template): React.CSSProperties {
  return {
    gridTemplateAreas: template.areas.map((row) => `"${row}"`).join(' '),
    gridTemplateColumns: template.columns,
    gridTemplateRows: template.rows,
  };
}
