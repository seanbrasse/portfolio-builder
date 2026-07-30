/**
 * A drawn New York skyline, as the establishing shot behind the hero panel.
 *
 * Outline only — no fill, no photograph. A comic establishes a place with a
 * few confident lines and then gets on with it, and an outline also survives
 * the theme switch for free: it inherits `currentColor`, so it inks itself in
 * whichever palette is active instead of needing a second asset.
 *
 * Decorative, so `aria-hidden`. The panel says "New York, NY" in text.
 */
export function Skyline() {
  return (
    <svg
      className="skyline"
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* The silhouette, drawn as one continuous run of setbacks the way a
          skyline actually reads from across a river. */}
      <path
        className="skyline-profile"
        d="M0 320 V236 H52 V254 H88 V196 H120 V224 H150 V132 H162 V96 H170 V38 H178 V96 H186 V132 H222
           V206 H252 V184 H296 V238 H330 V162 H366 V202 H400 V104 H412 V72 H420 V26 H428 V72 H436 V104
           H476 V186 H508 V222 H548 V158 H578 V196 H612 V120 H626 V88 H634 V44 H642 V88 H650 V120
           H688 V178 H716 V228 H752 V200 H788 V142 H822 V184 H856 V96 H870 V64 H878 V20 H886 V64 H894 V96
           H930 V172 H960 V214 H996 V190 H1032 V242 H1068 V212 H1104 V232 H1148 V206 H1200 V320"
      />

      {/* Water towers. Nothing says the place faster in two dozen pixels. */}
      <path className="skyline-detail" d="M262 184 v-16 h4 v-8 h22 v8 h4 v16 M266 160 l8 -12 h14 l8 12" />
      <path className="skyline-detail" d="M722 228 v-14 h4 v-7 h20 v7 h4 v14 M726 207 l7 -11 h13 l7 11" />

      {/* A few lit floors, drawn as rules rather than windows. */}
      <g className="skyline-detail">
        <path d="M126 250 h18 M126 266 h18 M126 282 h18" />
        <path d="M340 190 h20 M340 206 h20 M340 222 h20" />
        <path d="M482 214 h20 M482 230 h20 M482 246 h20" />
        <path d="M828 210 h22 M828 226 h22 M828 242 h22" />
        <path d="M1040 262 h22 M1040 278 h22" />
      </g>

      {/* The bridge, far right, so the eye has somewhere to leave. */}
      <path
        className="skyline-detail"
        d="M1108 232 q46 -34 92 -2 M1128 320 v-76 M1170 320 v-84 M1108 244 h92"
      />
    </svg>
  );
}
