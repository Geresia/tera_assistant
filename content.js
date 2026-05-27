if (!window.__scrapeRoomsLoaded) {
  window.__scrapeRoomsLoaded = true;

  window.__facilityMap = [
    { keywords: ["free wi-fi", "wi-fi in room", "wifi", "무료 wi-fi", "free internet"], code: "INTERNET_ACCESS_WIFI_COMPLIMENTARY" },
    { keywords: ["air conditioning", "에어컨"], code: "AIR_CONDITIONING" },
    { keywords: ["hair dryer", "헤어드라이어"], code: "HAIR_DRYER" },
    { keywords: ["desk", "책상"], code: "DESK" },
    { keywords: ["shower", "샤워"], code: "SHOWER" },
    { keywords: ["bathrobes", "bathrobe", "목욕가운"], code: "BATHROBES" },
    { keywords: ["refrigerator", "냉장고"], code: "REFRIGERATOR" },
    { keywords: ["bottled water", "무료 생수"], code: "COMPLIMENTARY_BOTTLED_WATER" },
    { keywords: ["lcd tv", "television", "tv", "텔레비전"], code: "TELEVISION" },
    { keywords: ["bathtub", "욕조"], code: "BATHTUB" },
    { keywords: ["microwave", "전자레인지"], code: "MICROWAVE" },
    { keywords: ["washing machine", "세탁기"], code: "WASHING_MACHINE" },
    { keywords: ["iron", "ironing", "다리미"], code: "IRONING_FACILITIES" },
    { keywords: ["mini bar", "minibar", "미니바"], code: "MINI_BAR" },
    { keywords: ["electric kettle", "coffee", "tea", "커피"], code: "COFFEE_TEA_MAKER" },
    { keywords: ["balcony", "terrace", "발코니", "테라스"], code: "BALCONY_TERRACE" },
    { keywords: ["connecting room", "interconnecting", "커넥팅"], code: "INTERCONNECTING_ROOMS_AVAILABLE" },
    { keywords: ["shared bathroom", "공용 욕실"], code: "SHARED_BATHROOM" },
    { keywords: ["hot water", "heated water", "온수"], code: "HEATED_WATER" },
    { keywords: ["slippers", "슬리퍼"], code: "SLIPPERS" },
    { keywords: ["safe", "금고"], code: "SAFE" },
    { keywords: ["telephone", "전화"], code: "TELEPHONE" },
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
  window.__parsePhysicRoomMap = function(physicRoomMap) {
    var rooms = [];
    Object.keys(physicRoomMap).forEach(function(roomId) {
      var room = physicRoomMap[roomId];
      var roomName = room.name || "";
      if (!roomName) return;

      var roomPhotos = [];
      if (room.pictureInfo && room.pictureInfo.length) {
        room.pictureInfo.forEach(function(pic) {
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

      var occupancy = 2;

      rooms.push({ roomName, bedText, sizeText, smoking, facilityStr, occupancy, roomView, roomPhotos });
    });
    return rooms;
  };

  // 방 목록 API 호출
  window.__fetchRoomListAPI = async function() {
    var params = window.__parseUrlParams();
    if (!params.hotelId) return null;

    var payload = {
      search: {
        isRSC: false, isSSR: false,
        hotelId: params.hotelId, roomId: 0,
        checkIn: params.checkIn, checkOut: params.checkOut,
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
          { name: "checkIn", value: params.checkIn.slice(0,4)+'-'+params.checkIn.slice(4,6)+'-'+params.checkIn.slice(6,8) },
          { name: "checkOut", value: params.checkOut.slice(0,4)+'-'+params.checkOut.slice(4,6)+'-'+params.checkOut.slice(6,8) }
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

  // 메인 스크랩
  window.__scrapeRooms = async function(includeHotelPhotos) {
    // 1. 방 목록 API
    var apiData = await window.__fetchRoomListAPI();
    var rooms = [];
    if (apiData && apiData.data && apiData.data.physicRoomMap) {
      rooms = window.__parsePhysicRoomMap(apiData.data.physicRoomMap);
    }

    // 2. 호텔 전체 사진 DOM
    var hotelPhotos = [];
    if (includeHotelPhotos) {
      hotelPhotos = await window.__scrapeHotelPhotos();
    }

    window.__scrapeResult = { rooms, hotelPhotos };
    window.__scrapeDone = true;
    return { rooms, hotelPhotos };
  };
}