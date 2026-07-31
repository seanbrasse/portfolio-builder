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
  /** MEDIA-4: the point that must survive any crop. 0..1 in both axes. */
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
  /**
   * Where the timeline starts. A degree is not a job, so it is not in
   * `experiences` — it has no impact bullets and no employer, and putting it
   * there would mean every consumer of that list has to special-case it.
   */
  education: {
    school: string;
    credential: string;
    /** ISO yyyy-mm. */
    startDate: string;
  };
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
