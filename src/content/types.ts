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
  /**
   * How the image sits in a fixed well. `cover` fills and crops, `contain`
   * shows the whole image letterboxed. Undefined means contain — the safer
   * default for a screenshot that is rarely the well's shape, since it shows the
   * whole thing rather than silently cropping it.
   */
  fit?: 'cover' | 'contain';
  /**
   * How far the image is zoomed into its well. 1 shows it at the chosen fit;
   * above 1 magnifies it from the focal point and lets the well crop the edges —
   * the slight crop that neither fit gives on its own. Undefined means 1.
   */
  scale?: number;
  /**
   * The point that must survive the crop, 0..1 in both axes. It anchors the
   * `cover` crop and, at any fit, the point a `scale` above 1 zooms toward — so
   * it is meaningful under `contain` too once the image is zoomed.
   */
  focalPoint?: { x: number; y: number };
  treatment?: AssetTreatment;
};

export type SiteSettings = {
  displayName: string;
  tagline: string;
  availabilityStatus: AvailabilityStatus;
  rolesOpenTo: string[];
  /**
   * The short list, for the one-screen layout. Every entry here also appears
   * somewhere else in this file — in an experience summary, a bullet, or a
   * project's tech — because a skills list is a summary of evidence, and one
   * that names things the rest of the page cannot support is the least
   * believable thing on a portfolio.
   */
  skills: string[];
  location: string;
  contactEmail: string;
  resumeHref: string;
  links: Link[];
  ogTagline: string;
};

/**
 * A school. Where the timeline starts, and usually more than one of them.
 *
 * A degree is not a job, so this is not an `Experience` — there is no role, no
 * impact bullets, and no project points at a school as the employer it was
 * built at. Folding the two together would make every consumer of that list
 * special-case half its rows.
 *
 * What the two do share is exactly what the timeline asks of them: a name, a
 * line under it, a date range, and a mark. That shape is why a school can carry
 * a logo on the same terms a company does, and why the line can order the two
 * together without knowing which is which.
 *
 * This was once three fields on `SiteSettings`, which quietly asserted that
 * there is one school, that it never ended, and that it has no logo.
 */
export type Education = {
  id: string;
  school: string;
  /** The line under the school: 'B.S. Computer Science'. */
  credential: string;
  location: string;
  /** ISO yyyy-mm. */
  startDate: string;
  /** ISO yyyy-mm. Null means still enrolled, as it does on a job. */
  endDate: string | null;
  logo?: Asset;
  links: Link[];
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

/**
 * How far along a project is. `shipped` is the default and the quiet one — a
 * badge on every card saying "finished" is wallpaper, so only the other two
 * render.
 */
export type ProjectStatus = 'shipped' | 'building' | 'archived';

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
  status: ProjectStatus;
  /** How long it took, in whatever unit reads best: "3 months", "a weekend". */
  duration: string;
  tech: string[];
  links: Link[];
  images: Asset[];
  date: string;
  /** Pinned to the front of the carousel, ahead of the newest-first order. */
  starred?: boolean;
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

export type Issue = {
  settings: SiteSettings;
  education: Education[];
  experiences: Experience[];
  projects: Project[];
  testimonials: Testimonial[];
  metrics: Metric[];
};

export const CAPS = {
  experienceSummary: 200,
  impactBullet: 120,
  impactBulletCount: 3,
  /**
   * The card clamps this to two lines, so a long summary is not a layout risk
   * there — it is the modal that shows the whole thing, and 500 is room for a
   * real paragraph about the project rather than a single sentence.
   */
  projectSummary: 500,
  quote: 180,
  /**
   * The line under the name, on a page that does not scroll. It is set large
   * and each line it takes comes off the work below it, which is the whole
   * subject of the page — so this is a soft limit on how far that trade goes,
   * not a layout hard stop. Roomy enough now for a two-sentence line.
   */
  tagline: 180,
  /**
   * The skills row, measured as the comma-separated string rather than per
   * entry — the row wraps as one run, so its total length is what decides how
   * many lines it costs. About twenty short entries.
   */
  skills: 200,
  /**
   * The social card description. Not a layout limit: most platforms truncate
   * the visible card around 160-200, but the full text still serves search
   * snippets and link unfurls that show more, so there is headroom above where
   * the card cuts off before it is written for nobody.
   */
  ogTagline: 300,
} as const;
