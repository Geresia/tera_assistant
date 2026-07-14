(async () => {
  // Only activate during Traveloka OAuth flow
  if (!location.href.includes('traveloka')) return;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toast(msg) {
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px',
      'background:#1e1e1e', 'color:#fff',
      'padding:14px 18px', 'border-radius:10px',
      'font-size:13px', 'font-family:sans-serif',
      'z-index:2147483647', 'box-shadow:0 4px 20px rgba(0,0,0,0.5)'
    ].join(';');
    document.body.appendChild(div);
  }

  try {
    let clicked = false, t = 0;
    while (t++ < 30 && !clicked) {
      // Strategy 1: data-identifier attribute (standard Google account chooser)
      const byAttr = document.querySelector('[data-identifier*="@traveloka.com"]');
      if (byAttr) { byAttr.click(); clicked = true; break; }

      // Strategy 2: scan list/role elements for @traveloka.com text
      const candidates = document.querySelectorAll(
        'li, [role="listitem"], [role="link"], [role="button"], div[data-authuser]'
      );
      for (const el of candidates) {
        if (el.textContent.includes('@traveloka.com')) {
          el.click(); clicked = true; break;
        }
      }

      if (!clicked) await sleep(300);
    }

    if (!clicked) toast('⚠️ 직접 로그인하고 Continue 눌러요');
  } catch {
    toast('⚠️ 직접 로그인하고 Continue 눌러요');
  }
})();
