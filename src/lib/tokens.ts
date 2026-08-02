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

export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Light is the default. Both themes are first-class two-tone translations of
 * each other — warm off-white and near-black, or near-black and cream — and the
 * site now opens in the light one, with the toggle one click from dark. The OG
 * social card is rendered in this same default so a shared link previews in the
 * design system's colours.
 */
export const DEFAULT_THEME: Theme = 'light';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * Theme ids this site has shipped under. `four-color` and `noir` named a comic
 * palette that no longer exists; a stored choice should survive the rename
 * rather than silently reverting, which reads as the toggle forgetting.
 */
const LEGACY_THEME_IDS: Record<string, Theme> = {
  'four-color': 'light',
  noir: 'dark',
};

export function normalizeTheme(value: unknown): Theme | null {
  if (isTheme(value)) return value;
  if (typeof value === 'string' && value in LEGACY_THEME_IDS) return LEGACY_THEME_IDS[value];
  return null;
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
  /**
   * The mat a floating panel is mounted on — the cream border a photograph gets
   * when it is laid on a page, rather than the black rule a panel gets when it
   * is printed into one. This is the difference between a page whose panels
   * tile and a page whose panels sit on top of a picture.
   */
  matte: string;
  /** The shadow a floating panel casts on whatever it is lying on. */
  matteShade: string;
  /** Ink at reduced presence, for rules and secondary text. */
  inkMuted: string;
  /** A raised surface — cards, the header, chips. */
  surface: string;
  /** A recessed one, for an image well or an empty state. */
  surfaceSunk: string;
  /** Hairline separators. `ruleStrong` is the one you can actually see. */
  rule: string;
  ruleStrong: string;
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
/**
 * Dark: near-black and cream, and essentially nothing else.
 *
 * Two values carry the entire page. That is the design rather than a
 * limitation — restraint is what the reference actually looks like, and every
 * colour added past the second is one more thing competing with the type.
 * The accent is a single warm ember, used on links and focus and nowhere
 * decorative; the moment it starts filling shapes, the page stops being
 * two-tone and starts being a colour scheme.
 *
 * The ground is not pure black. #000 with cream on it vibrates at large sizes
 * and looks like a terminal rather than paper; a near-black with a warm cast
 * reads as ink.
 */
const dark: Palette = {
  paper: '#0D0D0D',
  paperLit: '#121212',
  ink: '#F1ECE1',
  matte: '#1A1A1A',
  matteShade: '#000000',
  // Cream at reduced presence rather than a grey. A neutral grey against a
  // warm cream reads as a second, dirtier colour.
  inkMuted: '#9C968B',
  surface: '#141414',
  surfaceSunk: '#101010',
  rule: '#242424',
  ruleStrong: '#333333',
  accentA: '#E4693B',
  accentB: '#F1ECE1',
  accentC: '#E4693B',
  screen: '#242424',
  balloon: '#141414',
  onAccent: '#0D0D0D',
  onAccentB: '#0D0D0D',
  onAccentC: '#0D0D0D',
  titleAccent: '#F1ECE1',
  railBg: '#0D0D0D',
  railFg: '#F1ECE1',
  // The ember is under AA on near-black at body size, so links are set in ink
  // and carry an underline. Colour was never the thing marking them.
  link: '#F1ECE1',
  metricShadow: '#0D0D0D',
  shadowInk: '#000000',
  focus: '#E4693B',
  duotoneDark: '#0D0D0D',
  duotoneLight: '#E4693B',
};

/**
 * Light: the same two-tone idea inverted. Warm off-white and near-black, not
 * the newsprint cream the comic used — that cream was a period reference and
 * this is not referencing a period.
 */
const light: Palette = {
  paper: '#F4F1EA',
  paperLit: '#FAF8F3',
  ink: '#141414',
  matte: '#FFFFFF',
  matteShade: '#141414',
  inkMuted: '#5F5A52',
  surface: '#FAF8F3',
  surfaceSunk: '#EDE9E0',
  rule: '#E0DBD1',
  ruleStrong: '#C6C0B4',
  accentA: '#C24A1E',
  accentB: '#141414',
  accentC: '#C24A1E',
  screen: '#E0DBD1',
  balloon: '#FAF8F3',
  onAccent: '#FAF8F3',
  onAccentB: '#FAF8F3',
  onAccentC: '#FAF8F3',
  titleAccent: '#141414',
  railBg: '#141414',
  railFg: '#FAF8F3',
  link: '#141414',
  metricShadow: '#F4F1EA',
  shadowInk: '#141414',
  focus: '#C24A1E',
  duotoneDark: '#141414',
  duotoneLight: '#C24A1E',
};

export const PALETTES: Record<Theme, Palette> = {
  dark,
  light,
};

const CUSTOM_PROPERTY: Record<keyof Palette, string> = {
  paper: '--paper',
  paperLit: '--paper-lit',
  ink: '--ink',
  matte: '--matte',
  matteShade: '--matte-shade',
  inkMuted: '--ink-muted',
  surface: '--surface',
  surfaceSunk: '--surface-sunk',
  rule: '--rule',
  ruleStrong: '--rule-strong',
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
    // Light is the base on `:root`, so the default — and any no-JS or
    // pre-script paint — is the light palette; dark is the explicit override the
    // toggle and the theme script switch to.
    `:root{${declarations(PALETTES.light)}}`,
    `[data-theme="dark"]{${declarations(PALETTES.dark)}}`,
  ].join('');
}
