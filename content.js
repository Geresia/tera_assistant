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
    { keywords: ["safe"], code: "SAFE" },
    { keywords: ["telephone"], code: "TELEPHONE" },
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

  // URL에서 hotelId, cityId 추출
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

  // physicRoomMap → rooms 배열로 변환
  window.__parsePhysicRoomMap = function(physicRoomMap, saleRoomMap) {
    // physicalRoomId별 최소 guestCount 추출
    var occupancyMap = {};
    if (saleRoomMap) {
      Object.values(saleRoomMap).forEach(function(sale) {
        var pid = sale.physicalRoomId;
        var count = sale.guestCountInfo && sale.guestCountInfo.guestCount;
        if (pid && count) {
          if (!occupancyMap[pid] || count < occupancyMap[pid]) {
            occupancyMap[pid] = count;
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
        room.pictureInfo.forEach(function(pic) {
          if (pic.url && roomPhotos.length < 12) roomPhotos.push(pic.url);
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
      var sizeText = (room.areaInfo && room.areaInfo.title) ? room.areaInfo.title : "";

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

      var occupancy = occupancyMap[room.id] || 2;

      rooms.push({ roomName, bedText, sizeText, facilityStr, occupancy, roomView, roomPhotos });
    });
    return rooms;
  };

  // 방 목록 API 호출
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
      var res = await fetch(window.location.origin + "/restapi/soa2/33269/getHotelRoomListOversea", {
        method: "POST",
        headers: { "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      return data;
    } catch(e) {
      console.log("[Scraper] API error:", e.message);
      return null;
    }
  };

  // 호텔 전체 사진 — API 방식
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

  // 날짜 오프셋 계산
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

  // 메인 스크랩
  window.__scrapeRooms = async function() {
    // 1. 방 목록 API - 12개 날짜 병렬 호출 후 physicRoomMap 머지
    var offsets = [0, 5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60];
    var apiResults = await Promise.all(offsets.map(function(offset) {
      var dates = window.__getOffsetDates(offset);
      return window.__fetchRoomListAPI(dates.checkIn, dates.checkOut);
    }));

    var mergedPhysicRoomMap = {};
    apiResults.forEach(function(apiData) {
      if (apiData && apiData.data && apiData.data.physicRoomMap) {
        Object.assign(mergedPhysicRoomMap, apiData.data.physicRoomMap);
      }
    });

    // saleRoomMap도 병렬로 수집 (첫 번째 결과에서 사용)
    var mergedSaleRoomMap = {};
    apiResults.forEach(function(apiData) {
      if (apiData && apiData.data && apiData.data.saleRoomMap) {
        Object.assign(mergedSaleRoomMap, apiData.data.saleRoomMap);
      }
    });

    var rooms = [];
    if (Object.keys(mergedPhysicRoomMap).length > 0) {
      rooms = window.__parsePhysicRoomMap(mergedPhysicRoomMap, mergedSaleRoomMap);
    }

    // 2. 호텔 전체 사진 API
    var hotelPhotos = await window.__scrapeHotelPhotos();

    window.__scrapeResult = { rooms, hotelPhotos };
    window.__scrapeDone = true;
    return { rooms, hotelPhotos };
  };
}
