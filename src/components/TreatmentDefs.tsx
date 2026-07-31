import { PALETTES } from '@/lib/tokens';

/** '#D6291F' -> [0.839, 0.161, 0.122] */
function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

type DuotoneProps = {
  id: string;
  dark: string;
  light: string;
};

function Duotone({ id, dark, light }: DuotoneProps) {
  const [dr, dg, db] = channels(dark);
  const [lr, lg, lb] = channels(light);

  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      {/* Flatten to luminance first, then remap that single axis onto the
          two-color ramp. Doing it in one step would tint rather than duotone. */}
      <feColorMatrix
        type="matrix"
        values="0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0"
      />
      <feComponentTransfer>
        <feFuncR type="table" tableValues={`${dr} ${lr}`} />
        <feFuncG type="table" tableValues={`${dg} ${lg}`} />
        <feFuncB type="table" tableValues={`${db} ${lb}`} />
      </feComponentTransfer>
    </filter>
  );
}

/**
 * MEDIA-5 / MODE-6: image treatment lives here, not in the uploaded file.
 *
 * Both filters ship on every page and CSS picks between them by theme, so
 * switching to noir re-tints every screenshot on the next paint with no
 * refetch and nothing baked. Plain view simply never references them, which
 * is what makes the treatment reversible rather than destructive.
 */
export function TreatmentDefs() {
  const sunset = PALETTES.sunset;
  const noir = PALETTES.noir;

  return (
    <svg className="treatment-defs" aria-hidden="true" focusable="false">
      <defs>
        <Duotone
          id="treatment-duotone"
          dark={sunset.duotoneDark}
          light={sunset.duotoneLight}
        />
        <Duotone id="treatment-duotone-noir" dark={noir.duotoneDark} light={noir.duotoneLight} />
      </defs>
    </svg>
  );
}
