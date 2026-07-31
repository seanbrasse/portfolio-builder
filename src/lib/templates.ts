/**
 * Page templates (PRD section 6).
 *
 * A fixed library of named CSS grids, not a canvas. Each template declares the
 * `grid-template-areas` map that places its panels, plus the `slots` list that
 * fixes the order they are read in.
 *
 * That order is *declared*, never derived from the grid. Deriving it is how
 * comic pages end up read out of sequence: a grid that looks like left-to-
 * right often is not, and the DOM has to match the reading order regardless
 * (ACC-1). Because the layout and the sequence come from the same `slots`
 * array, the two cannot drift apart.
 *
 * COMP-5: templates live in code on purpose. Adding one is a deploy. That
 * happens rarely and it keeps art direction under version control.
 */

export type Template = {
  id: string;
  name: string;
  /** Rows of the grid, as `grid-template-areas` strings. */
  areas: string[];
  /** Column track sizing. */
  columns: string;
  /**
   * Row track sizing. Fractional, so the bands divide the leaf's fixed height
   * between them by weight — a band carrying more copy is given more of it.
   */
  rows: string;
  /**
   * Canonical order. This is DOM order, tab order, and the animation stagger
   * order — all three are the same list.
   */
  slots: string[];
};

export const TEMPLATES = {
  /**
   * Origin. The hero runs the width, then an uneven pair, then three unequal
   * columns. Nothing here is a repeat() — equal tracks are what made the old
   * pages read as tabulated rather than laid out.
   */
  'hero-2-3': {
    id: 'hero-2-3',
    name: 'Hero, two, three',
    areas: ['hero  hero  hero', 'left  left  right', 'a     b     c'],
    columns: '1.18fr 0.72fr 1.02fr',
    rows: '0.88fr 1.06fr 1.06fr',
    slots: ['hero', 'left', 'right', 'a', 'b', 'c'],
  },
  'stack-3': {
    id: 'stack-3',
    name: 'Three bands',
    areas: ['a', 'b', 'c'],
    columns: 'minmax(0, 1fr)',
    rows: '1.14fr 0.92fr 0.98fr',
    slots: ['a', 'b', 'c'],
  },
  'stack-4': {
    id: 'stack-4',
    name: 'Four bands',
    areas: ['a', 'b', 'c', 'd'],
    columns: 'minmax(0, 1fr)',
    // A slope costs a band the height of its clearance, so the two sloped
    // bands are given it back — but not out of the first band, which carries
    // three bullets and lost its last one when it paid for them.
    rows: '1.1fr 1.12fr 1.02fr 0.82fr',
    slots: ['a', 'b', 'c', 'd'],
  },
  /**
   * A tall panel down one side with three stacked beside it.
   *
   * The splash carries an image rather than copy — that is what it is for, and
   * it is the natural home for a figure once one exists. It takes the narrower
   * track on purpose: a tall panel reads as large from its height, and giving
   * it the wider column as well leaves the stack too cramped to letter.
   */
  'splash-side': {
    id: 'splash-side',
    name: 'Splash and three',
    areas: ['splash a', 'splash b', 'splash c'],
    columns: '0.88fr 1.26fr',
    rows: '1.04fr 1.0fr 0.96fr',
    slots: ['splash', 'a', 'b', 'c'],
  },
  'splash-4': {
    id: 'splash-4',
    name: 'Splash four',
    areas: ['a b', 'c d'],
    columns: '1.22fr 0.86fr',
    rows: '0.94fr 1.1fr',
    slots: ['a', 'b', 'c', 'd'],
  },
  'hero-2': {
    id: 'hero-2',
    name: 'Hero and two',
    areas: ['hero hero', 'a    b'],
    columns: '1.24fr 0.84fr',
    rows: '1.2fr 1fr',
    slots: ['hero', 'a', 'b'],
  },
  'full-bleed': {
    id: 'full-bleed',
    name: 'Full bleed',
    areas: ['a'],
    columns: 'minmax(0, 1fr)',
    rows: '1fr',
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
