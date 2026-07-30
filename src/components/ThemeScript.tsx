/**
 * Sets `data-theme` before first paint.
 *
 * This has to be a blocking inline script rather than an effect: resolving the
 * theme in React means the browser paints four-color first and then repaints
 * noir, which is a white flash in a dark room — exactly the case MODE-8 exists
 * to handle.
 *
 * Precedence, highest first:
 *   1. `?theme=` in the URL, so a shared link carries its mode (section 7).
 *   2. A stored explicit choice.
 *   3. `prefers-color-scheme`, on first visit only (MODE-8).
 */
const SCRIPT = `(function(){
  var d = document.documentElement;
  var theme;
  try {
    var q = new URLSearchParams(location.search).get('theme');
    theme = q || localStorage.getItem('comic-portfolio:theme');
    if (theme !== 'noir' && theme !== 'four-color') {
      theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'noir' : 'four-color';
    }
  } catch (e) {
    theme = 'four-color';
  }
  d.dataset.theme = theme;
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
