// DEC-126: apply the chosen look (light blue or dark navy) before the app
// renders, so there is no flash of the other one. Its own file, not inline,
// so the Content-Security-Policy keeps `script-src 'self'` (S-03 / PG-05).
//
// The choice is a plain per-device key outside the vault (it must work on the
// lock screen, before the record is unlocked); it holds no health information
// and is not synced. `?theme=light` or `?theme=dark` in the address sets it,
// for trying the light look while the screens are converted (spec section 8).
// DEFAULT_THEME must match src/lib/theme.js (pinned by scripts/testTheme.mjs).
(function () {
  var DEFAULT_THEME = 'light'; // light blue for everyone since v1.103.0 (DEC-126)
  var SHOW_CHOICE = true; // the demo build sets both of these (scripts/build-demo.mjs)
  var KEY = 'insina_theme';
  var theme = null;
  try {
    var params = new URLSearchParams(window.location.search);
    var asked = params.get('theme');
    if (asked === 'light' || asked === 'dark') {
      localStorage.setItem(KEY, asked);
      localStorage.setItem('insina_theme_preview', '1');
      params.delete('theme');
      var rest = params.toString();
      history.replaceState(null, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
    }
    theme = localStorage.getItem(KEY);
  } catch (e) { /* storage blocked: use the default */ }
  if (theme !== 'light' && theme !== 'dark') theme = DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', theme);
  if (SHOW_CHOICE) document.documentElement.setAttribute('data-theme-choice', '1');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F8FBFE' : '#07090f');
})();
