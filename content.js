if (!window.__scrapeRoomsLoaded) {
  window.__scrapeRoomsLoaded = true;

  window.__facilityMap = [
    { keywords: ["free wi-fi", "wi-fi in room", "wifi", "free internet"], code: "INTERNET_ACCESS_WIFI_COMPLIMENTARY" },
    { keywords: ["air conditioning"], code: "AIR_CONDITIONING" },
    { keywords: ["hair dryer"], code: "HAIR_DRYER" },
    { keywords: ["desk"], code: "DESK" },
    { keywords: ["shower"], code: "SHOWER" },
    { keywords: ["bathrobes", "bathrobe"], code: "BATHROBES" },
    { keywords: ["refrigerator"], code: "REFRIGERATOR" },
    { keywords: ["bottled water"], code: "COMPLIMENTARY_BOTTLED_WATER" },
    { keywords: ["lcd tv", "television", "tv"], code: "TELEVISION" },
    { keywords: ["bathtub"], code: "BATHTUB" },
    { keywords: ["microwave"], code: "MICROWAVE" },
    { keywords: ["washing machine"], code: "WASHING_MACHINE" },
    { keywords: ["iron", "ironing"], code: "IRONING_FACILITIES" },
    { keywords: ["mini bar", "minibar"], code: "MINI_BAR" },
    { keywords: ["electric kettle", "coffee", "tea"], code: "COFFEE_TEA_MAKER" },
    { keywords: ["balcony", "terrace"], code: "BALCONY_TERRACE" },
    { keywords: ["connecting room", "interconnecting"], code: "INTERCONNECTING_ROOMS_AVAILABLE" },
    { keywords: ["shared bathroom"], code: "SHARED_BATHROOM" },
    { keywords: ["hot water", "heated water"], code: "HEATED_WATER" },
    { keywords: ["slippers"], code: "SLIPPERS" },
  ];

  window.__extractFacilities = function(texts) {
    var combined = texts.join(" ").toLowerCase();
    var result = [];
    window.__facilityMap.forEach(function(item) {
      if (item.keywords.some(function(k) { return combined.includes(k.toLowerCase()); }) && !result.includes(item.code)) {
        result.push(item.code);
      }
    });
    return result.join(", ");
  };

  window.__parseUrlParams = function() {
    var url = window.location.href;
    var hotelIdMatch = url.match(/hotelId=(\d+)/i) || url.match(/hotel-detail-(\d+)/i);
    var cityIdMatch = url.match(/cityId=(\d+)/i);
    var checkInMatch = url.match(/checkIn=([\d-]+)/i);

    var hotelId = hotelIdMatch ? Number(hotelIdMatch[1]) : 0;
    var cityId = cityIdMatch ? Number(cityIdMatch[1]) : 0;

    if (!hotelId) {
      var metaEl = document.querySelector('meta[name="hotel_id"]') || document.querySelector('[data-hotel-id]');
      if (metaEl) hotelId = Number(metaEl.getAttribute('content') || metaEl.getAttribute('data-hotel-id'));
    }

    var checkIn;
    if (checkInMatch) {
      checkIn = checkInMatch[1].replace(/-/g, '');
    } else {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      checkIn = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
    }
    var checkInDate = new Date(checkIn.slice(0,4)+'-'+checkIn.slice(4,6)+'-'+checkIn.slice(6,8));
    var checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkInDate.getDate() + 1);
    var checkOut = checkOutDate.getFullYear() + String(checkOutDate.getMonth()+1).padStart(2,'0') + String(checkOutDate.getDate()).padStart(2,'0');

    return { hotelId, cityId, checkIn, checkOut };
  };

  // 페이지 HTML에서 seoHotelRooms 추출
  window.__extractSeoRoomData = function() {
    var targetScript = null;
    document.querySelectorAll('script').forEach(function(s) {
      if (s.textContent.includes('physicRoomMap')) targetScript = s;
    });
    if (!targetScript) return null;

    var txt = targetScript.textContent;
    var pidx = txt.indexOf('physicRoomMap');
    if (pidx === -1) return null;

    var strStart = -1, strEnd = -1;
    for (var i = pidx; i >= 0; i--) {
      if (txt[i] === '"' && txt[i-1] !== '\\') { strStart = i + 1; break; }
    }
    for (var j = pidx; j < txt.length; j++) {
      if (txt[j] === '"' && txt[j-1] !== '\\') { strEnd = j; break; }
    }
    if (strStart < 0 || strEnd < 0) return null;

    try {
      var unescaped = JSON.parse('"' + txt.slice(strStart, strEnd) + '"');
      var sidx = unescaped.indexOf('"seoHotelRooms":{');
      if (sidx === -1) return null;

      var depth = 0, end = sidx + '"seoHotelRooms":'.length;
      for (var k = end; k < unescaped.length; k++) {
        if (unescaped[k] === '{') depth++;
        else if (unescaped[k] === '}') {
          depth--;
          if (depth === 0) { end = k + 1; break; }
        }
      }
      return JSON.parse(unescaped.slice(sidx + '"seoHotelRooms":'.length, end));
    } catch(e) {
      console.log("[Scraper] seoHotelRooms parse error:", e.message);
      return null;
    }
  };

  window.__parsePhysicRoomMap = function(physicRoomMap, saleRoomMap) {
    var occupancyMap = {};
    if (saleRoomMap) {
      Object.values(saleRoomMap).forEach(function(sale) {
        var pid = sale.physicalRoomId;
        var count = sale.guestCountInfo && sale.guestCountInfo.guestCount;
        if (pid && count) {
          if (!occupancyMap[String(pid)] || count > occupancyMap[String(pid)]) {
            occupancyMap[String(pid)] = count;
          }
        }
      });
    }

    var rooms = [];
    Object.keys(physicRoomMap).forEach(function(roomId) {
      var room = physicRoomMap[roomId];
      var roomName = room.name || "";
      if (!roomName) return;

      var roomPhotos = [];
      if (room.pictureInfo && room.pictureInfo.length) {
        var cat1 = room.pictureInfo.filter(function(pic) { return pic.categoryId === 1; });
        var photosToUse = cat1.length > 0 ? cat1 : room.pictureInfo;
        photosToUse.forEach(function(pic) {
          if (pic.url) roomPhotos.push(pic.url);
        });
      }

      var facilityTexts = [];
      if (room.faciltityInfo && room.faciltityInfo.list) {
        room.faciltityInfo.list.forEach(function(cat) {
          if (cat.subList) {
            cat.subList.forEach(function(item) {
              if (item.title) facilityTexts.push(item.title);
            });
          }
        });
      }
      var facilityStr = window.__extractFacilities(facilityTexts);

      var bedText = (room.bedInfo && room.bedInfo.title) ? room.bedInfo.title : "";
      var sizeText = (room.areaInfo && room.areaInfo.title) ? room.areaInfo.title :
                     (room.area ? room.area + "㎡" : "");

      var smoking = "";
      if (room.smokeInfo && room.smokeInfo.title) {
        var s = room.smokeInfo.title.toLowerCase();
        if (s.includes("non")) smoking = "NO";
        else if (s.includes("smoking")) smoking = "YES";
      }

      var roomView = "";
      if (room.windowInfo && room.windowInfo.title) {
        var t = room.windowInfo.title.toLowerCase();
        if (t.includes("sea") || t.includes("ocean")) roomView = "SEA_VIEW";
        else if (t.includes("city")) roomView = "CITY_VIEW";
        else if (t.includes("mountain")) roomView = "MOUNTAIN_VIEW";
        else if (t.includes("garden")) roomView = "GARDEN_VIEW";
        else if (t.includes("pool")) roomView = "POOL_VIEW";
        else if (t.includes("river")) roomView = "RIVER_VIEW";
        else if (t.includes("park")) roomView = "PARK_VIEW";
        else if (t.includes("lake")) roomView = "LAKE_VIEW";
      }

      var occupancy = occupancyMap[String(room.id)] || room.person || 2;

      rooms.push({ roomName, bedText, sizeText, facilityStr, occupancy, roomView, smoking, roomPhotos });
    });
    return rooms;
  };

  // phantom-token 가로채기 (API fallback용)
  window.__phantomToken = "";
  (function() {
    var origFetch = window.fetch;
    window.fetch = function() {
      var url = arguments[0] || "";
      var opts = arguments[1] || {};
      var headers = opts.headers || {};
      if (typeof url === "string" && url.includes("getHotelRoomList")) {
        var pt = headers["phantom-token"] || headers["Phantom-Token"] || "";
        if (pt) window.__phantomToken = pt;
      }
      return origFetch.apply(this, arguments);
    };
  })();

  window.__fetchRoomListAPI = async function(checkInOverride, checkOutOverride) {
    var params = window.__parseUrlParams();
    if (!params.hotelId) return null;

    var checkIn = checkInOverride || params.checkIn;
    var checkOut = checkOutOverride || params.checkOut;

    var payload = {
      search: {
        isRSC: false, isSSR: false,
        hotelId: params.hotelId, roomId: 0,
        checkIn: checkIn, checkOut: checkOut,
        roomQuantity: 1, adult: 2, childInfoItems: [],
        isIjtb: false, priceType: 0, hotelUniqueKey: "",
        mustShowRoomList: [],
        location: { geo: { cityID: params.cityId } },
        filters: [],
        meta: { fgt: -1, roomkey: "", minCurr: "", minPrice: "", roomToken: "" },
        hasAidInUrl: false, cancelPolicyType: 0, fixSubhotel: 0,
        listTraceId: "", abResultEntities: [],
        extras: {
          loginAB: "", exposeBedInfos: "",
          enableChildAgeGroup: "T", needEntireSetRoomDesc: "T",
          closeOnlineRoomListOptimize: true
        }
      },
      head: {
        platform: "PC", cver: "0", bu: "IBU", group: "trip",
        locale: "en-XX", region: "XX", timezone: "9", currency: "USD", isSSR: false,
        extension: [
          { name: "cityId", value: String(params.cityId) },
          { name: "checkIn", value: checkIn.slice(0,4)+'-'+checkIn.slice(4,6)+'-'+checkIn.slice(6,8) },
          { name: "checkOut", value: checkOut.slice(0,4)+'-'+checkOut.slice(4,6)+'-'+checkOut.slice(6,8) }
        ]
      }
    };

    try {
      var reqHeaders = { "Content-Type": "application/json", "accept": "application/json" };
      if (window.__phantomToken) reqHeaders["phantom-token"] = window.__phantomToken;

      var res = await fetch(window.location.origin + "/restapi/soa2/33269/getHotelRoomListOversea", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      return data;
    } catch(e) {
      console.log("[Scraper] API error:", e.message);
      return null;
    }
  };

  window.__scrapeHotelPhotos = async function() {
    var params = window.__parseUrlParams();
    if (!params.hotelId) return [];
    try {
      var res = await fetch(window.location.origin + "/restapi/soa2/33269/getHotelDetailAggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify({
          hotelId: params.hotelId,
          cityId: params.cityId,
          head: { platform: "PC", bu: "IBU", group: "trip", locale: "en-XX", currency: "USD" }
        })
      });
      var data = await res.json();
      if (data && data.data && data.data.hotelTopImage && data.data.hotelTopImage.imgUrlList) {
        return data.data.hotelTopImage.imgUrlList.map(function(img) {
          var highRes = img.diffPositionUrls && img.diffPositionUrls.find(function(u) { return u.position === 1; });
          return highRes ? highRes.picUrl : img.imgUrl;
        }).filter(Boolean);
      }
    } catch(e) {
      console.log("[Scraper] Hotel photo API error:", e.message);
    }
    return [];
  };

  window.__getOffsetDates = function(offsetDays) {
    var params = window.__parseUrlParams();
    var base = new Date(params.checkIn.slice(0,4)+'-'+params.checkIn.slice(4,6)+'-'+params.checkIn.slice(6,8));
    base.setDate(base.getDate() + offsetDays);
    var next = new Date(base);
    next.setDate(next.getDate() + 1);
    var fmt = function(d) {
      return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
    };
    return { checkIn: fmt(base), checkOut: fmt(next) };
  };

  window.__scrapeRooms = async function() {
    var rooms = [];

    // 1순위: 페이지 HTML에서 seoHotelRooms 파싱
    var seoData = window.__extractSeoRoomData();
    if (seoData && seoData.physicRoomMap && Object.keys(seoData.physicRoomMap).length > 0) {
      console.log("[Scraper] Using seoHotelRooms, rooms:", Object.keys(seoData.physicRoomMap).length);
      rooms = window.__parsePhysicRoomMap(seoData.physicRoomMap, null);
    } else {
      // 2순위: API fallback
      console.log("[Scraper] Falling back to API calls");
      var offsets = [0, 5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60];
      var apiResults = await Promise.all(offsets.map(function(offset) {
        var dates = window.__getOffsetDates(offset);
        return window.__fetchRoomListAPI(dates.checkIn, dates.checkOut);
      }));

      var mergedPhysicRoomMap = {};
      var mergedSaleRoomMap = {};
      apiResults.forEach(function(apiData) {
        if (apiData && apiData.data) {
          if (apiData.data.physicRoomMap) Object.assign(mergedPhysicRoomMap, apiData.data.physicRoomMap);
          if (apiData.data.saleRoomMap) Object.assign(mergedSaleRoomMap, apiData.data.saleRoomMap);
        }
      });

      if (Object.keys(mergedPhysicRoomMap).length > 0) {
        rooms = window.__parsePhysicRoomMap(mergedPhysicRoomMap, mergedSaleRoomMap);
      }
    }

    // 호텔 전체 사진
    var hotelPhotos = await window.__scrapeHotelPhotos();

    window.__scrapeResult = { rooms, hotelPhotos };
    window.__scrapeDone = true;
    return { rooms, hotelPhotos };
  };
}