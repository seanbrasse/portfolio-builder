/**
 * Sets `data-theme` before first paint.
 *
 * This has to be a blocking inline script rather than an effect: resolving the
 * theme in React means the browser paints sunset first and then repaints
 * noir, which is a white flash in a dark room — exactly the case MODE-8 exists
 * to handle.
 *
 * Precedence, highest first:
 *   1. `?theme=` in the URL, so a shared link carries its mode (section 7).
 *   2. A stored explicit choice.
 *   3. Sunset.
 *
 * `four-color` is accepted and mapped across. That is the id this theme shipped
 * under while the palette really was four-color, and anyone carrying it in
 * localStorage should keep their choice rather than watch the toggle appear to
 * forget it. The mapping is duplicated from `normalizeTheme` in tokens.ts
 * because this is a string that runs before any module has loaded.
 *
 * MODE-8 asked for `prefers-color-scheme: dark` to select noir on a first
 * visit. That is overridden deliberately: sunset is the art direction this
 * portfolio leads with, and a majority of people browse in dark mode, so
 * honouring the OS preference meant most first-time visitors never saw the
 * default palette at all. Noir stays one click away in the rail.
 */
const SCRIPT = `(function(){
  var d = document.documentElement;
  var theme;
  try {
    var q = new URLSearchParams(location.search).get('theme');
    theme = q || localStorage.getItem('comic-portfolio:theme');
    if (theme === 'four-color') theme = 'sunset';
    if (theme !== 'noir' && theme !== 'sunset') {
      theme = 'sunset';
    }
  } catch (e) {
    theme = 'sunset';
  }
  d.dataset.theme = theme;
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
