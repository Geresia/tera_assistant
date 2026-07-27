(function() {
  if (window.__teraAirbnbPatched) return;
  window.__teraAirbnbPatched = true;
  window.__teraAirbnbRooms = null;

  const orig = window.fetch;
  window.fetch = async function(...args) {
    const res = await orig.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // TODO: Airbnb listing/pricing API 응답을 확인 후 실제 엔드포인트로 교체
    // if (url.includes('/api/v3/')) {
    //   try {
    //     const data = await res.clone().json();
    //     window.__teraAirbnbRooms = data;
    //   } catch(e) {}
    // }

    return res;
  };
})();
