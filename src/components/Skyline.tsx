/**
 * A drawn New York skyline, as the establishing shot behind the hero panel.
 *
 * Outline only — no fill, no photograph. A comic establishes a place with a
 * few confident lines and then gets on with it, and an outline also survives
 * the theme switch for free: it inherits `currentColor`, so it inks itself in
 * whichever palette is active instead of needing a second asset.
 *
 * "Somewhere with tall buildings" is not New York, so the drawing leans on the
 * four silhouettes that are only this city: the Brooklyn Bridge's masonry
 * towers with their paired gothic arches, One World Trade tapering to a spire,
 * the Empire State's setbacks and mooring mast, and the Chrysler's crown of
 * concentric arches. They sit closer together than geography allows — the
 * bridge is not a block from Midtown — which is what an illustrated skyline
 * has always done.
 *
 * `width: 100%; height: auto` rather than a fixed height: the intrinsic aspect
 * ratio then sizes the box, so `meet` has nothing to crop and the spires
 * cannot be sliced off the top.
 *
 * Decorative, so `aria-hidden`. The panel says "New York, NY" in text.
 */
export function Skyline() {
  return (
    <svg
      className="skyline"
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* The silhouette, drawn as one continuous run so it reads as a single
          horizon rather than a row of separate buildings. */}
      <path
        className="skyline-profile"
        d="M0 320 V262 H40 V278 H74 V246 H112 V266 H150 V232 H190 V252 H228 V220 H272 V240 H312
           V256 H334 L358 56 H402 L426 256 H452 V238 H486 V262 H512 V240 H520 V150 H560 V214 H586
           V190 H620 V232 H648 V246 H658 V196 H668 V148 H676 V52 H706 V148 H714 V196 H724 V246 H740
           V258 H780 V216 H788 V180 H796 V148 H806 A28 66 0 0 1 862 148 V180 H872 V216 H880
           V254 H906 V228 H940 V250 H978 V206 H1014 V244 H1046 V224 H1086 V262 H1120 V240 H1160
           V272 H1200 V320"
      />

      {/* One World Trade: the spire that makes it 1,776 feet. */}
      <path className="skyline-detail" d="M380 56 V4" />

      {/* Empire State: the crown block and the mast built to moor airships. */}
      <path className="skyline-detail" d="M683 52 V38 H699 V52 M691 38 V12" />

      {/* Chrysler: the crown is a stack of concentric arches, which is the one
          thing about it nobody mistakes for another building. */}
      <path className="skyline-detail" d="M834 82 V22" />
      <path className="skyline-detail" d="M811 148 A23 54 0 0 1 857 148" />
      <path className="skyline-detail" d="M817 148 A17 40 0 0 1 851 148" />
      <path className="skyline-detail" d="M823 148 A11 26 0 0 1 845 148" />
      <path className="skyline-detail" d="M828 148 A6 14 0 0 1 840 148" />

      {/* Lit floors, drawn as rules rather than windows. */}
      <g className="skyline-detail">
        <path d="M366 104 h28 M366 130 h28 M366 156 h28 M366 182 h28" />
        <path d="M682 84 h18 M682 102 h18 M682 120 h18" />
        <path d="M528 168 h24 M528 186 h24 M528 204 h24" />
        <path d="M986 224 h18 M986 240 h18 M986 256 h18" />
        <path d="M238 238 h26 M238 254 h26" />
      </g>

      {/* Water towers. Nothing says the place faster in two dozen pixels. */}
      <path
        className="skyline-detail"
        d="M456 238 v-14 h4 v-7 h20 v7 h4 v14 M460 217 l7 -11 h12 l7 11"
      />
      <path
        className="skyline-detail"
        d="M946 250 v-14 h4 v-7 h20 v7 h4 v14 M950 229 l7 -11 h12 l7 11"
      />

      {/* The Brooklyn Bridge, in the foreground — crossing in front of the
          waterfront rather than standing in the skyline behind it. */}
      <g className="skyline-detail">
        <path d="M0 278 Q160 260 320 278" />
        <path d="M0 284 Q160 266 320 284" />

        <path d="M70 272 V138 H110 V272 M64 138 h52" />
        <path d="M76 272 V236 L83 190 L90 236 V272 M94 272 V236 L101 190 L108 236 V272" />
        <path d="M218 272 V138 H258 V272 M212 138 h52" />
        <path d="M224 272 V236 L231 190 L238 236 V272 M242 272 V236 L249 190 L256 236 V272" />

        <path d="M0 262 Q44 240 90 140" />
        <path d="M90 140 Q164 230 238 140" />
        <path d="M238 140 Q284 244 320 268" />

        <path d="M127 274 V174 M146 274 V183 M164 274 V185 M182 274 V183 M201 274 V174" />
        <path d="M90 142 L48 276 M90 142 L132 274" />
        <path d="M238 142 L196 274 M238 142 L280 278" />
      </g>
    </svg>
  );
}
