(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function setInput(el, val) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

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

  try {
    // Wait for username input
    let userEl, t = 0;
    while (t++ < 30) {
      userEl = document.querySelector('input[name="username"]');
      if (userEl) break;
      await sleep(300);
    }
    if (!userEl) { toast('⚠️ 직접 로그인하고 Continue 눌러요'); return; }

    await sleep(400);

    const pwEl = document.querySelector('input[name="password"]');

    // Case 1: Both fields already filled → click Login
    if (userEl.value.trim() && pwEl?.value.trim()) {
      const submitBtn = document.querySelector('button[type="submit"]')
        || [...document.querySelectorAll('button')].find(b => /log\s*in|sign\s*in/i.test(b.textContent));
      if (submitBtn) { submitBtn.click(); return; }
    }

    // Case 2: Fill username and trigger Google Workspace modal
    if (!userEl.value.trim()) {
      userEl.focus();
      setInput(userEl, '@traveloka.com');
      await sleep(300);
    }

    // Blur username → focus password to trigger the Google Workspace popup
    userEl.dispatchEvent(new Event('blur', { bubbles: true }));
    await sleep(300);
    if (pwEl) {
      pwEl.focus();
      pwEl.click();
    }

    // Wait for the "Continue" button inside the modal
    let contBtn, t2 = 0;
    while (t2++ < 25) {
      contBtn = [...document.querySelectorAll('button')].find(b =>
        b.textContent.trim() === 'Continue'
      );
      if (contBtn) break;
      await sleep(300);
    }

    if (contBtn) { contBtn.click(); return; }

    toast('⚠️ 직접 로그인하고 Continue 눌러요');
  } catch {
    toast('⚠️ 직접 로그인하고 Continue 눌러요');
  }
})();
