(function() {
  if (window.__teraAgodaPatched) return;
  window.__teraAgodaPatched = true;
  window.__teraAgodaRooms = null;
  window.__teraAgodaHotelPhotos = null;

  const orig = window.fetch;
  window.fetch = async function(...args) {
    const res = await orig.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    if (url.includes('room-grid')) {
      try {
        const data = await res.clone().json();
        if (data.rooms?.length) window.__teraAgodaRooms = data;
      } catch(e) {}
    }

    if (url.includes('graphql/property')) {
      try {
        const body = await res.clone().json();
        const details = body?.data?.propertyDetailsSearch?.propertyDetails;
        if (details?.length) {
          const ci = details[0]?.contentDetail?.contentImages || {};
          const photos = (ci.hotelImages || []).flatMap(img => {
            const urls = img.urls || [];
            let val = (urls.find(u => u.key === 'main') || urls[0])?.value || '';
            if (!val || val.includes('bstatic.com')) return [];
            const m = val.match(/\/hotelImages\/\d+\/(-?\d+)\//);
            const entityId = m ? m[1] : '0';
            if (entityId !== '0' && entityId !== '-1') return [];
            if (val.startsWith('//')) val = 'https:' + val;
            return [val.replace(/\?.*/, '')];
          }).slice(0, 10);
          if (photos.length) window.__teraAgodaHotelPhotos = photos;

          // usefulInfo 전체 수집 (floors, rooms, voltage 등)
          const allUseful = [];
          const collect = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) { obj.forEach(collect); return; }
            if (Array.isArray(obj.usefulInfo)) allUseful.push(...obj.usefulInfo);
            Object.values(obj).forEach(collect);
          };
          collect(details[0]);
          console.log('[tera] graphql/property intercepted');
          console.log('[tera] details[0] keys:', Object.keys(details[0] || {}));
          console.log('[tera] contentDetail keys:', Object.keys(details[0]?.contentDetail || {}));
          console.log('[tera] usefulInfo count:', allUseful.length, allUseful.slice(0, 5));
          if (allUseful.length) window.__teraAgodaUsefulInfo = allUseful;
        }
      } catch(e) {}
    }

    return res;
  };
})();
