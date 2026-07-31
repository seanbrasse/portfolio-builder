/**
 * Content model.
 *
 * These types mirror the database schema in section 5 of the PRD one-for-one,
 * because Phase 2 replaces the hardcoded module in `issue.ts` with queries
 * that return exactly these shapes. Field caps that the PRD enforces in the
 * admin are enforced here by `validateIssue()` instead — same rule, earlier
 * failure. A panel that cannot hold its copy should break the build, not the
 * layout.
 */

import type { TemplateId } from '@/lib/templates';

export type AvailabilityStatus = 'open' | 'selective' | 'not_looking';

export type LinkType = 'live' | 'repo' | 'case_study' | 'press';

export type Link = {
  label: string;
  url: string;
  type?: LinkType;
};

export type AssetTreatment = 'duotone' | 'grayscale' | 'none';

export type Asset = {
  id: string;
  src: string;
  /**
   * `video` renders a muted, looping, inline clip — a screen recording of the
   * thing working, which for shipped product work says more than a still.
   * Under `prefers-reduced-motion` it does not autoplay and shows controls.
   */
  media?: 'image' | 'video';
  /** Video only: a still shown before the clip loads. */
  poster?: string;
  /** ACC-2 / MEDIA-3: not optional, at the type level. */
  alt: string;
  width: number;
  height: number;
  kind: 'screenshot' | 'logo' | 'avatar' | 'document';
  /** MEDIA-4: the point that must survive any crop. 0..1 in both axes. */
  focalPoint?: { x: number; y: number };
  treatment?: AssetTreatment;
};

export type SiteSettings = {
  displayName: string;
  tagline: string;
  issueNumber: string;
  availabilityStatus: AvailabilityStatus;
  rolesOpenTo: string[];
  location: string;
  contactEmail: string;
  resumeHref: string;
  links: Link[];
  ogTagline: string;
};

export type Experience = {
  id: string;
  company: string;
  role: string;
  location: string;
  /** ISO yyyy-mm. A null end means current. */
  startDate: string;
  endDate: string | null;
  /** Cap 200. */
  summary: string;
  /** Max 3, each cap 120. */
  impactBullets: string[];
  logo?: Asset;
  /**
   * Screenshots or screen recordings of the shipped work. The first is the
   * panel's media; the rest are held for a lightbox.
   */
  media?: Asset[];
  /** Anything public — a press link, a docs page, a live surface. */
  links?: Link[];
};

export type Project = {
  id: string;
  title: string;
  context: 'professional' | 'personal';
  /** Links a professional project back to the employer it was built at. */
  experienceId?: string;
  /** Cap 200. */
  summary: string;
  /** The one number. */
  impact: string;
  tech: string[];
  links: Link[];
  images: Asset[];
  date: string;
};

export type Testimonial = {
  id: string;
  /** Cap 180. Balloons cannot hold more. */
  quote: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  experienceId?: string;
  /** Nothing renders unless this is true. See the note in `issue.ts`. */
  approved: boolean;
  /** MOTION-4: opt in per testimonial, off by default. */
  typeOn?: boolean;
};

export type Metric = {
  id: string;
  value: string;
  label: string;
};

/**
 * A piece of art that crosses panel borders, positioned in page percentages.
 * Decoration only — see `components/Breakout.tsx`.
 */
export type Breakout = {
  kind: 'skyline-band' | 'speed-streak' | 'burst-star';
  x: number;
  y: number;
  w: number;
  h?: number;
  rotate?: number;
  accent?: 'a' | 'b' | 'c';
  opacity?: number;
};

export type PanelOverrides = {
  /** Which of the three spot colors this panel flats with. */
  accent?: 'a' | 'b' | 'c';
  /**
   * How heavily the flat is laid down.
   *
   * `tint` is a wash over the paper, for panels carrying body copy.
   * `solid` is the flat at full strength with the lettering inverted on top —
   * the loud panels a comic page needs so it does not read as beige. Contrast
   * is easier on a solid panel than a tinted one, not harder: light type on a
   * saturated flat clears AA comfortably, where dark type over a pale wash and
   * a halftone dot does not.
   */
  fill?: 'tint' | 'solid';
  /** Halftone screen on or off for this panel. */
  screen?: boolean;
  /** Radiating rays behind the content. One per page at most. */
  rays?: boolean;
  /**
   * The panel's outline.
   *
   * A comic page is not a grid of rectangles — edges cant, panels lean, and
   * the gutter between two leaning panels is a diagonal, which is most of what
   * makes a page read as laid out rather than tabulated.
   *
   * `canted` cuts one corner. `lean-l` / `lean-r` make the panel a
   * parallelogram, which suits a tall panel. `band-up` / `band-down` slant a
   * wide band — both edges the same way, so the band keeps its full height and
   * a run of them leaves parallel diagonal gutters.
   */
  shape?: 'rect' | 'canted' | 'lean-l' | 'lean-r' | 'band-up' | 'band-down';
  /**
   * How the panel is edged.
   *
   * `ink` is a printed panel: a black rule, flush with its neighbours, sharing
   * a gutter. `mat` is a mounted one — a cream mat and a shadow, laid on top of
   * whatever is behind it rather than tiled beside it. `none` removes the edge
   * entirely, for a panel that *is* the page rather than one on it.
   *
   * Mounting only means anything over a `bleed: 'page'` panel. A mat on paper
   * is a thick white border and a shadow on paper is a mistake.
   */
  frame?: 'ink' | 'mat' | 'none';
  /**
   * Degrees of tilt. Small values only — this is a printing skew, not a fan.
   *
   * Nothing uses it, and a grid panel should not: rotating a rectangle grows
   * its bounding box by `height * sin θ`, and the grid lays out the box. Half a
   * degree on a 330px panel eats 1.4px off the near corner and adds it to the
   * far one, so a 9px gutter runs 7.5px at one end and 10.4px at the other.
   * That taper is exactly the inconsistency the split gutters exist to remove,
   * and it costs more than the hand-set wobble is worth. Reserved for a panel
   * that has no grid neighbours to be out of parallel with.
   */
  tilt?: number;
  /**
   * Stacking order, for panels that share grid area and overlap. Higher sits
   * on top. Leave unset for the common case where panels tile.
   */
  layer?: number;
  /**
   * `page` makes this panel the whole leaf, with every other panel on the page
   * layered over part of it. Not a column in a two-track grid — the difference
   * shows in the gutters, which become this panel's own art showing between
   * the panels laid on top of it.
   */
  bleed?: 'page';
};

export type PanelContent =
  /**
   * `body` is the page's opening paragraph, set inside the establishing shot
   * rather than in a panel beside it. Optional because the hero carried none
   * when it was one panel among several on a tiled page; a hero that *is* the
   * page has the room, and the lead copy belongs in the picture.
   */
  | { type: 'hero'; body?: string }
  | { type: 'experience'; ref: string }
  | { type: 'project'; ref: string }
  | { type: 'testimonial'; ref: string }
  | { type: 'metric'; ref: string }
  | { type: 'cta' }
  | { type: 'image'; ref: string }
  | {
      type: 'text';
      heading: string;
      body: string;
      /**
       * The shape the copy sits in. A comic page does not set every block of
       * text in the same box: narration goes in a caption, a voice goes in a
       * balloon. `plain` is the caption case.
       */
      blurb?: 'plain' | 'balloon';
    }
  /**
   * An establishing shot: a panel that carries a drawing rather than copy.
   *
   * This is the slot a figure goes in once one exists. Until then it holds the
   * skyline, so the composition the reference calls for — one big image beside
   * a stack of text panels — is the real composition and not a blank box
   * waiting for art.
   */
  | { type: 'art'; art: 'skyline' }
  /* -------------------------------------------------------------------------
     Artifacts: the work itself, drawn rather than photographed.

     A portfolio wants to show the thing that was built. Most of what is worth
     showing here cannot be screenshotted — a form builder inside Mailchimp and
     an onboarding flow inside PayPal are both someone else's proprietary UI,
     and a screenshot of either is not mine to publish. Reconstructing the
     artifact instead is not a workaround for that, it is the only lawful
     option, and it happens to be the better one: a code block stays
     selectable, a diagram stays themeable, a chart stays correct at any zoom,
     and every one of them is readable by a screen reader and rendered in plain
     view. A painted panel is none of those things.

     Nothing here may state a fact that the surrounding copy does not. These
     are evidence for a claim the panel already makes, not a place to hide one.
  ------------------------------------------------------------------------- */
  /**
   * A fragment of real source. `lines` rather than one string with newlines:
   * a template literal in the content file carries whatever indentation the
   * surrounding code happened to have, and reindenting the content file then
   * silently reindents the page.
   */
  | {
      type: 'code';
      caption: string;
      language: string;
      lines: string[];
      /** Lines to mark as the changed ones, 1-indexed into `lines`. */
      highlight?: number[];
    }
  /** A pipeline, drawn as labelled stages. */
  | { type: 'flow'; caption: string; steps: string[] }
  /**
   * One measurement, before and against. Deliberately not a general charting
   * kind: every number on this site is a single before/after, and a chart
   * component that can draw anything is a component nobody can read the
   * accessible name of.
   */
  | {
      type: 'chart';
      caption: string;
      label: string;
      from: number;
      to: number;
      unit: string;
    }
  /** An API surface, as the method/path table it actually is. */
  | {
      type: 'endpoints';
      caption: string;
      rows: { method: string; path: string }[];
    }
  /** COMP-4: a slot deliberately left quiet. Renders as a blank inked panel. */
  | { type: 'empty' };

export type Panel = {
  /** The named grid area in the page's template. */
  slot: string;
  content: PanelContent;
  overrides?: PanelOverrides;
};

/**
 * MOTION-3 / the noise budget: at most one of these per page, so the type is
 * a single optional field rather than a panel kind. It overlays a panel
 * instead of occupying a slot, which is how SFX actually sit on a comic page.
 * `aria-hidden` at render (ACC-6).
 */
export type Sfx = {
  text: string;
  /** Which slot in the template it stamps over. */
  slot: string;
  /** Degrees. Negative tilts counter-clockwise. */
  rotate?: number;
};

export type Page = {
  id: string;
  slug: string;
  /** Shown in the issue index rail. */
  title: string;
  /** The yellow caption box. */
  caption: string;
  templateId: TemplateId;
  panels: Panel[];
  sfx?: Sfx;
  /** Art that crosses this page's panel borders. Decoration only. */
  breakouts?: Breakout[];
  status: 'draft' | 'published';
  /** Overrides the site tagline in this page's social card. */
  ogTagline?: string;
};

export type Issue = {
  settings: SiteSettings;
  pages: Page[];
  experiences: Experience[];
  projects: Project[];
  testimonials: Testimonial[];
  metrics: Metric[];
};

export const CAPS = {
  experienceSummary: 200,
  impactBullet: 120,
  impactBulletCount: 3,
  projectSummary: 200,
  quote: 180,
} as const;
