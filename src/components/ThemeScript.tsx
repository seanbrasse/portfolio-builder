/**
 * Sets `data-theme` before first paint.
 *
 * A blocking inline script rather than an effect: resolving the theme in React
 * means the browser paints the default and then repaints the other one, which
 * on a near-black site is a full-screen white flash.
 *
 * Precedence, highest first:
 *   1. `?theme=` in the URL, so a shared link carries its mode.
 *   2. A stored explicit choice.
 *   3. Light.
 *
 * `four-color` and `noir` are accepted and mapped across — they are the ids
 * this site shipped under while it was a comic, and a stored choice should
 * survive the rename rather than appearing to be forgotten. The mapping is
 * duplicated from `normalizeTheme` in tokens.ts because this is a string that
 * runs before any module has loaded.
 *
 * Light is the default rather than following `prefers-color-scheme`: the theme
 * is a design choice, not an OS preference, and someone whose OS is dark should
 * still open on the site as drawn. The toggle is one click away.
 */
const SCRIPT = `(function(){
  var d = document.documentElement;
  var theme;
  try {
    var q = new URLSearchParams(location.search).get('theme');
    theme = q || localStorage.getItem('comic-portfolio:theme');
    if (theme === 'four-color') theme = 'light';
    if (theme === 'noir') theme = 'dark';
    if (theme !== 'light' && theme !== 'dark') theme = 'light';
  } catch (e) {
    theme = 'light';
  }
  d.dataset.theme = theme;
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
