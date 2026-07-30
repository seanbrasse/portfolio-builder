/**
 * The single source of truth for every color in the system.
 *
 * MODE-5: component code contains zero hex literals. Components read CSS
 * custom properties; those custom properties are generated from this file and
 * injected once in the root layout. The OG image generator (which runs in
 * Satori and cannot resolve CSS variables) imports these values directly.
 *
 * Adding a theme means adding a key here. It does not mean touching components.
 */

export const THEMES = ['four-color', 'noir'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'four-color';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * Every token a panel can reference. Keys become `--<kebab-key>` custom
 * properties, so the two palettes are structurally forced to stay in sync:
 * a missing key in `noir` is a TypeScript error, not a visual bug found later.
 */
export type Palette = {
  /** Page stock behind the panels. */
  paper: string;
  /** Panel interior — a shade lighter than the page, the way a flat sits on newsprint. */
  paperLit: string;
  /** Border ink, body text, everything drawn. */
  ink: string;
  /** Ink at reduced presence, for rules and secondary text. */
  inkMuted: string;
  /** The three spot colors. In noir these collapse toward one accent. */
  accentA: string;
  accentB: string;
  accentC: string;
  /** Halftone dot color. */
  screen: string;
  /** Speech balloon fill. */
  balloon: string;
  /** Text on a saturated `accentA` fill. */
  onAccent: string;
  /**
   * Text on a saturated `accentB` fill. Separate from `onAccent` because the
   * two accents sit on opposite sides of the lightness midpoint in noir —
   * amber takes dark type, steel takes light — so one shared value cannot
   * serve both.
   */
  onAccentB: string;
  /**
   * Text on an `accentC` fill — caption boxes, the CTA button, chip hovers.
   * Separate from `onAccent` because yellow and amber are light surfaces in
   * both themes and always need dark text, while `accentA` is dark in
   * four-color and light in noir. Collapsing the two is how a caption box
   * ends up bone-on-amber at 2.2:1.
   */
  onAccentC: string;
  /** Display type that should read as the page's lead color. */
  titleAccent: string;
  /** The issue index rail, which stays dark chrome in both themes. */
  railBg: string;
  railFg: string;
  /** Body link color. Must clear 4.5:1 on `paper` in both themes. */
  link: string;
  /**
   * The hard offset behind metric numerals. Has to read as a *shadow* against
   * the numeral itself, so it tracks the glyph: a light offset under dark
   * four-color numerals, a dark one under noir's bone.
   */
  metricShadow: string;
  /**
   * A hard offset that must stay dark in both palettes. `ink` inverts to bone
   * in noir, which turns a drop shadow into a highlight and takes the cover
   * lockup under AA.
   */
  shadowInk: string;
  /** Focus ring (ACC-7). */
  focus: string;
  /** Duotone shadow/highlight pair applied to screenshots (MODE-6). */
  duotoneDark: string;
  duotoneLight: string;
};

/**
 * Four-color: newsprint palette. Paper cream, one red, one blue, one yellow,
 * black ink.
 *
 * ACC-3 note: no spot color in this palette carries small text. Measured
 * against the composited panel background — a halftone dot over a flat, not
 * the flat alone — red lands near 3:1 at 14px and yellow far below it. The
 * accents are therefore used as fills, flags, and shadows, with `ink` doing
 * the lettering. The audit in `tests/contrast.mjs` is what these values
 * are tuned against; do not adjust them without re-running it.
 */
const fourColor: Palette = {
  paper: '#EFE4CE',
  paperLit: '#FBF4E3',
  ink: '#14110F',
  inkMuted: '#57514A',
  // Deepened from a brighter pillarbox red. As a solid flat it has to carry
  // cream lettering *and* the gold rays crossing behind it, and the brighter
  // value left no headroom once the rays lightened the ground.
  accentA: '#C4201A', // red    — fills, flags, bullet markers
  accentB: '#154A9E', // blue   — display type and links
  accentC: '#F5C518', // yellow — backgrounds and shadows, never text
  screen: '#1B57B5',
  balloon: '#FDF9EF',
  onAccent: '#FBF4E3',
  onAccentB: '#FBF4E3',
  onAccentC: '#14110F',
  titleAccent: '#154A9E',
  railBg: '#14110F',
  railFg: '#FBF4E3',
  link: '#154A9E',
  metricShadow: '#F5C518',
  shadowInk: '#14110F',
  focus: '#154A9E',
  duotoneDark: '#14110F',
  duotoneLight: '#D6291F',
};

/**
 * Noir: a second art direction, not a grayscale filter. Ink black and bone
 * white, heavier blacks, colder halftone.
 *
 * Open question #2 in the PRD asked which spot color noir gets, and noted that
 * desaturated red being the obvious answer is itself a reason to look
 * elsewhere. This uses a sodium-vapor amber — streetlight through a window
 * blind. It reads as noir without borrowing the four-color red, and it is
 * warm enough to stay legible on near-black at 11.9:1.
 */
const noir: Palette = {
  paper: '#131315',
  paperLit: '#1C1C1F',
  ink: '#E8E3D8',
  inkMuted: '#8B867C',
  accentA: '#C98F2E', // sodium amber — the one spot color
  // Dark enough to take light lettering as a solid flat. A mid steel looked
  // fine as a tint and failed as a ground.
  accentB: '#3B424C', // cold steel, for structure rather than emphasis
  accentC: '#C98F2E',
  screen: '#3A3D44',
  balloon: '#24242A',
  onAccent: '#131315',
  onAccentB: '#E8E3D8',
  onAccentC: '#131315',
  // Bone, not amber: noir gets one spot color and the SFX earns it. A name
  // set in the accent would spend the budget on the quietest element.
  titleAccent: '#E8E3D8',
  railBg: '#0B0B0C',
  railFg: '#E8E3D8',
  // Noir's `accentB` is dark structural steel, far under AA as body text.
  // Links get the amber instead.
  link: '#C98F2E',
  metricShadow: '#0B0B0C',
  shadowInk: '#08080A',
  focus: '#C98F2E',
  duotoneDark: '#0B0B0C',
  duotoneLight: '#C98F2E',
};

export const PALETTES: Record<Theme, Palette> = {
  'four-color': fourColor,
  noir,
};

const CUSTOM_PROPERTY: Record<keyof Palette, string> = {
  paper: '--paper',
  paperLit: '--paper-lit',
  ink: '--ink',
  inkMuted: '--ink-muted',
  accentA: '--accent-a',
  accentB: '--accent-b',
  accentC: '--accent-c',
  screen: '--screen',
  balloon: '--balloon',
  onAccent: '--on-accent',
  onAccentB: '--on-accent-b',
  onAccentC: '--on-accent-c',
  titleAccent: '--title-accent',
  railBg: '--rail-bg',
  railFg: '--rail-fg',
  link: '--link',
  metricShadow: '--metric-shadow',
  shadowInk: '--shadow-ink',
  focus: '--focus',
  duotoneDark: '--duotone-dark',
  duotoneLight: '--duotone-light',
};

function declarations(palette: Palette): string {
  return (Object.keys(CUSTOM_PROPERTY) as (keyof Palette)[])
    .map((key) => `${CUSTOM_PROPERTY[key]}:${palette[key]}`)
    .join(';');
}

/**
 * The whole theming system as one stylesheet. Rendered into the document head
 * so the first paint already has both palettes and no component ever needs to
 * know a color value.
 */
export function themeStylesheet(): string {
  return [
    `:root{${declarations(PALETTES['four-color'])}}`,
    `[data-theme="noir"]{${declarations(PALETTES.noir)}}`,
  ].join('');
}
