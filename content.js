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
    { keywords: ["hot water", "heated water", "온수"], code: "HEATED_WATER" }
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

  window.__extractOccupancy = function(card) {
    var firstGuestBox = card.querySelector('[class*="guestInfoBox"]');
    if (!firstGuestBox) return 0;
    var adultDesc = firstGuestBox.querySelector('[class*="adultDesc"]');
    if (adultDesc) {
      var match = adultDesc.innerText.match(/\d+/);
      return match ? Number(match[0]) : 0;
    }
    return firstGuestBox.querySelectorAll('[class*="adultIcon"]').length;
  };

  window.__extractRoomView = function(card) {
    var facilityEls = [...card.querySelectorAll('span[class*="baseRoom-facility_title"]')];
    var viewFacility = facilityEls.find(function(el) { return /view/i.test(el.innerText); });
    return viewFacility ? viewFacility.innerText.trim() : "";
  };

  // 현재 imagePreview에서 보이는 큰 이미지 URL 추출
  window.__getCurrentPreviewImg = function() {
    var img = document.querySelector('[class*="imagePreview"] img, [class*="imgPreview"] img, [class*="bigAlbum"] img');
    return img ? (img.src || "") : "";
  };

  // 오른쪽 화살표 클릭하면서 사진 수집
  // startFromIndex: 이 인덱스부터 저장 (1-based), 0이면 처음부터
  // maxIndex: 이 인덱스까지만 저장 (0이면 끝까지)
  window.__collectPhotosViaArrow = async function(startFromIndex, maxIndex) {
    var photos = [];
    var seen = new Set();
    var maxWait = 200; // 최대 대기 루프

    // 현재 인덱스 파악
    function getCurrentIndex() {
      var idxEl = document.querySelector('[class*="imgIndex"]');
      if (!idxEl) return 1;
      var match = idxEl.innerText.match(/^(\d+)/);
      return match ? Number(match[1]) : 1;
    }

    // 현재 큰 이미지 URL
    function getCurrentImg() {
      var img = document.querySelector(
        '[class*="imagePreview"] img:not([class*="arrow"]), [class*="imgPreview"] img, [class*="bigImg"] img, [class*="mainImg"] img'
      );
      if (!img) {
        // fallback: 가장 큰 img
        var imgs = [...document.querySelectorAll('[class*="imagePreview"] img, [class*="bigAlbum"] img')];
        img = imgs.find(function(i) { return i.naturalWidth > 200; });
      }
      return img ? img.src : "";
    }

    // 오른쪽 화살표
    function getRightArrow() {
      return document.querySelector('[class*="imagePreview-arrow_right"]');
    }

    var currentIdx = getCurrentIndex();

    // startFromIndex까지 오른쪽으로 이동
    if (startFromIndex > 1) {
      var attempts = 0;
      while (getCurrentIndex() < startFromIndex && attempts < 200) {
        var arrow = getRightArrow();
        if (!arrow) break;
        arrow.click();
        await new Promise(function(r) { setTimeout(r, 300); });
        attempts++;
      }
    }

    // 사진 수집
    for (var i = 0; i < maxWait; i++) {
      currentIdx = getCurrentIndex();

      // maxIndex 초과하면 종료
      if (maxIndex > 0 && currentIdx > maxIndex) break;

      var url = getCurrentImg();
      if (url && !seen.has(url)) {
        seen.add(url);
        photos.push(url);
      }

      // 오른쪽 화살표 클릭
      var rightArrow = getRightArrow();
      if (!rightArrow) break; // 마지막 사진

      rightArrow.click();
      await new Promise(function(r) { setTimeout(r, 600); });

      // 다음 인덱스 확인
      var nextIdx = getCurrentIndex();
      if (nextIdx === currentIdx) break; // 인덱스 변화 없으면 종료
    }

    return photos;
  };

  window.__processCard = async function(card) {
    // 카드 위치로 스크롤해서 lazy loading 트리거
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(function(r) { setTimeout(r, 1500); });

    var titleEl = card.querySelector('span[class*="commonRoomCard-title"]');
    if (!titleEl) return null;
    var rawTitle = titleEl.getAttribute('aria-label') || titleEl.innerText.trim();
    var roomName = rawTitle.replace(/★.*?★/g, '').trim();
    if (!roomName) return null;

    var bedEl = card.querySelector('span[class*="baseRoom-bedsInfo_title"]');
    var bedText = bedEl ? bedEl.innerText.trim() : "";

    var facilityEls = [...card.querySelectorAll('span[class*="baseRoom-facility_title"]')];
    var basicFacilities = facilityEls.map(function(el) { return el.innerText.trim(); });

    var sizeText = basicFacilities.find(function(f) { return /㎡|sqm/i.test(f); }) || "";
    var smoking = basicFacilities.some(function(f) { return /금연|non-smoking|non smoking|no smoking/i.test(f); }) ? "NO"
      : basicFacilities.some(function(f) { return /흡연/i.test(f) || (f.toLowerCase().includes("smoking") && !f.toLowerCase().includes("non")); }) ? "YES" : "";
    var occupancy = window.__extractOccupancy(card);
    var roomView = window.__extractRoomView(card);

    var detailBtn = card.querySelector('[data-test-id="baseRoom-roomAmenities"]');
    var facilityStr = window.__extractFacilities(basicFacilities);
    var roomPhotos = [];

    if (detailBtn) {
      detailBtn.click();
      await new Promise(function(r) { setTimeout(r, 2500); });

      // facilities 긁기
      var detailItems = [...document.querySelectorAll('[class*="baseRoomLayer-facilityItem"]')];
      var detailTexts = detailItems.map(function(el) { return el.innerText.trim(); }).filter(Boolean);
      facilityStr = window.__extractFacilities(detailTexts);

      // galleryBox 첫 번째 사진 클릭해서 큰 이미지 뷰어 열기
      var firstGalleryImg = document.querySelector('[class*="galleryBox-photo_img"]');
      if (firstGalleryImg) {
        firstGalleryImg.click();
        await new Promise(function(r) { setTimeout(r, 1500); });

        // 오른쪽 화살표로 끝까지 수집 (처음부터 끝까지)
        roomPhotos = await window.__collectPhotosViaArrow(1, 0);

        // imagePreview 닫기
        var previewClose = document.querySelector('[class*="imagePreview"] [class*="close"], [class*="imgPreview"] [class*="close"]');
        if (previewClose) {
          previewClose.click();
          await new Promise(function(r) { setTimeout(r, 600); });
        }
      }

      // baseRoomLayer 닫기
      var closeBtn = document.querySelector('[class*="baseRoomLayer"] [class*="close"],[class*="bigAlbum"] button[class*="close"],[class*="popup"] [class*="close"]');
      if (closeBtn) closeBtn.click();
      await new Promise(function(r) { setTimeout(r, 500); });
    }

    return { roomName, bedText, sizeText, smoking, facilityStr, occupancy, roomView, roomPhotos };
  };

  // 호텔 전체 사진 수집 (11번째부터 끝까지 화살표로 이동)
  window.__scrapeHotelPhotos = async function() {
    // 1단계: See All Photos 버튼 클릭
    var showAllBtn = document.querySelector('[class*="headAlbum_headAlbum-showmore"]');
    if (!showAllBtn) return [];
    showAllBtn.click();
    await new Promise(function(r) { setTimeout(r, 3000); });

    // 2단계: waterfallImg 첫번째(index 0) 클릭 → 큰 뷰어 열기
    var allImgs = [...document.querySelectorAll('[class*="waterfallImg"]')];
    if (allImgs.length < 1) return [];
    allImgs[0].click();
    await new Promise(function(r) { setTimeout(r, 1000); });

    // 3단계: imgIndex 확인
    function getCurrentIndex() {
      var idxEl = document.querySelector('[class*="imgIndex"]');
      if (!idxEl) return 0;
      var match = idxEl.innerText.match(/^(\d+)/);
      return match ? Number(match[1]) : 0;
    }

    function getCurrentImg() {
      // imagePreview-bigImage-img 클래스로 직접 잡기
      var bigImg = document.querySelector('[class*="imagePreview-bigImage-img"]');
      if (bigImg && bigImg.src && bigImg.src.includes('tripcdn')) return bigImg.src;
      // fallback: proc=watermark 또는 digimark URL
      var imgs = [...document.querySelectorAll('img')].filter(function(i) {
        return i.src.includes('tripcdn') && (i.src.includes('proc=watermark') || i.src.includes('digimark')) && i.naturalWidth > 400;
      });
      if (imgs.length) return imgs[0].src;
      // fallback: 가장 큰 이미지
      var allImgs = [...document.querySelectorAll('img')].filter(function(i) {
        return i.naturalWidth >= 1000 && i.src.includes('tripcdn');
      });
      allImgs.sort(function(a, b) { return b.naturalWidth - a.naturalWidth; });
      return allImgs.length ? allImgs[0].src : "";
    }

    function getRightArrow() {
      return document.querySelector('[class*="imagePreview-arrow_right"]');
    }

    // 4단계: 오른쪽 화살표로 10번째까지 수집
    var photos = [];
    var seen = new Set();
    var maxWait = 500;

    for (var i = 0; i < maxWait; i++) {
      var currentIdx = getCurrentIndex();

      // 10번째 초과하면 종료
      if (currentIdx > 10) break;

      var url = getCurrentImg();

      if (url && !seen.has(url)) {
        seen.add(url);
        photos.push(url);
      }

      var rightArrow = getRightArrow();
      if (!rightArrow) break;

      rightArrow.click();
      await new Promise(function(r) { setTimeout(r, 600); });

      var nextIdx = getCurrentIndex();
      if (nextIdx === currentIdx) break;
    }

    // 닫기
    var closeBtn = document.querySelector('[class*="imagePreview"] [class*="close"], [class*="bigAlbum"] [class*="close"]');
    if (closeBtn) closeBtn.click();
    await new Promise(function(r) { setTimeout(r, 500); });

    return photos;
  };

  // includeHotelPhotos: true일 때만 호텔 전체 사진 수집 (1차 스캔만)
  window.__scrapeRooms = async function(includeHotelPhotos) {
    // "Show X Remaining Room Types" 버튼 있으면 클릭해서 숨겨진 방 노출
    var showMoreBtns = [...document.querySelectorAll('[class*="mainRoomList-foldButton"]')];
    for (var btn of showMoreBtns) {
      if (/show.*remaining|more room/i.test(btn.innerText)) {
        btn.click();
        await new Promise(function(r) { setTimeout(r, 3000); });
        // 새로 생긴 버튼도 확인
        showMoreBtns = [...document.querySelectorAll('[class*="mainRoomList-foldButton"]')];
      }
    }

    // commonRoomCard__ 로 시작하는 부모 카드만 선택 (title, content 자식 제외)
    var cards = [...document.querySelectorAll('[class*="commonRoomCard"]')].filter(function(el) {
      return /commonRoomCard__/.test(el.className);
    });
    var roomMap = new Map();
    for (var card of cards) {
      var result = await window.__processCard(card);
      if (!result || roomMap.has(result.roomName)) continue;
      roomMap.set(result.roomName, result);
    }
    var finalResult = [...roomMap.values()];

    // 1차 스캔일 때만 호텔 전체 사진 수집
    var hotelPhotos = [];
    if (includeHotelPhotos) {
      hotelPhotos = await window.__scrapeHotelPhotos();
    }

    window.__scrapeResult = { rooms: finalResult, hotelPhotos: hotelPhotos };
    window.__scrapeDone = true;
    return { rooms: finalResult, hotelPhotos: hotelPhotos };
  };
}