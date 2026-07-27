(function() {
  if (window.__teraBookingPatched) return;
  window.__teraBookingPatched = true;
  window.__teraBookingRooms = null;

  // ── 탐지 모드: 어떤 fetch/XHR가 룸/가격 데이터를 나르는지 찾기 위한 임시 로거 ──
  // 콘솔에서 window.__teraBookingDebug 를 확인하면 URL/메서드/응답 최상위 key 목록이 쌓여있음.
  // 실제 엔드포인트를 찾으면 이 블록은 지우고 window.fetch 패치 부분에 필터를 넣을 것.
  const MAX_LOG = 300;
  window.__teraBookingDebug = [];
  function logEntry(entry) {
    window.__teraBookingDebug.push(entry);
    if (window.__teraBookingDebug.length > MAX_LOG) window.__teraBookingDebug.shift();
  }
  function safeKeys(obj) {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj).slice(0, 20);
  }
  function tryParseOpName(bodyRaw) {
    if (typeof bodyRaw !== 'string') return '';
    try {
      const parsed = JSON.parse(bodyRaw);
      if (Array.isArray(parsed)) return parsed.map(p => p?.operationName).filter(Boolean).join(',');
      return parsed?.operationName || '';
    } catch (e) { return ''; }
  }

  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await origFetch.apply(this, args);
    try {
      const req = args[0];
      const url = typeof req === 'string' ? req : (req?.url || '');
      const method = (args[1]?.method || (typeof req === 'object' && req?.method) || 'GET').toUpperCase();
      const opName = method === 'POST' ? tryParseOpName(args[1]?.body) : '';
      res.clone().json().then(data => {
        logEntry({ kind: 'fetch', url, method, opName, keys: safeKeys(data), ts: Date.now() });
      }).catch(() => {
        logEntry({ kind: 'fetch', url, method, opName, keys: [], nonJson: true, ts: Date.now() });
      });
    } catch (e) {}

    // TODO: 실제 룸/가격 API 엔드포인트를 찾으면 여기에 필터 추가
    // if (url.includes('/dml/graphql')) {
    //   try {
    //     const data = await res.clone().json();
    //     window.__teraBookingRooms = data;
    //   } catch(e) {}
    // }

    return res;
  };

  // booking.com 일부 요청은 XMLHttpRequest를 쓸 수 있어 fetch만으로는 놓칠 수 있음 → 같이 감시
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__teraUrl = url;
    this.__teraMethod = method;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', function() {
      try {
        let data = null;
        try { data = JSON.parse(this.responseText); } catch (e) {}
        logEntry({
          kind: 'xhr',
          url: this.__teraUrl,
          method: (this.__teraMethod || 'GET').toUpperCase(),
          opName: tryParseOpName(body),
          keys: safeKeys(data),
          nonJson: !data,
          ts: Date.now(),
        });
      } catch (e) {}
    });
    return origSend.call(this, body);
  };
})();
