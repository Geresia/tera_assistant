(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toast(msg) {
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px',
      'background:#1e1e1e', 'color:#fff',
      'padding:14px 18px', 'border-radius:10px',
      'font-size:13px', 'font-family:sans-serif',
      'z-index:2147483647', 'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
      'line-height:1.5'
    ].join(';');
    document.body.appendChild(div);
  }

  let btn, t = 0;
  while (t++ < 30) {
    btn = [...document.querySelectorAll('button')].find(b =>
      b.textContent.trim().includes('Sign in with Google')
    );
    if (btn) break;
    await sleep(300);
  }

  if (btn) { btn.click(); return; }
  toast('⚠️ 직접 로그인하고 Continue 눌러요');
})();
