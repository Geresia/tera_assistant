      
if (window.__scanRoomsLoaded) { /* skip */ } else {
window.__scanRoomsLoaded = true;

// ── Facility Map ──
const FACILITY_MAP = [
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
  { keywords: ["fan"], code: "FAN" },
  { keywords: ["in room safe", "safe deposit"], code: "IN_ROOM_SAFE" },
  { keywords: ["blackout curtain"], code: "BLACKOUT_CURTAINS" },
  { keywords: ["clothes dryer"], code: "CLOTHES_DRYER" },
  { keywords: ["dishwasher"], code: "DISHWASHER" },
  { keywords: ["breakfast"], code: "BREAKFAST" },
  { keywords: ["lunch"], code: "LUNCH" },
  { keywords: ["dinner"], code: "DINNER" },
  { keywords: ["daily newspaper", "newspaper"], code: "DAILY_NEWSPAPER" },
  { keywords: ["in room video game", "video game"], code: "IN_ROOM_VIDEO_GAMES" },
  { keywords: ["dvd", "cd player"], code: "DVD_CD_PLAYER" },
  { keywords: ["inhouse movie", "in-house movie"], code: "INHOUSE_MOVIES" },
  { keywords: ["executive lounge"], code: "EXECUTIVE_LOUNGE_ACCESS" },
  { keywords: ["separate dining"], code: "SEPARATE_DINING_AREA" },
  { keywords: ["seating area"], code: "SEATING_AREA" },
  { keywords: ["kitchenette"], code: "KITCHENETTE" },
  { keywords: ["private pool"], code: "PRIVATE_POOL" },
  { keywords: ["toiletries"], code: "TOILETRIES" },
  { keywords: ["private bathroom"], code: "PRIVATE_BATHROOM" },
  { keywords: ["mosquito net"], code: "MOSQUITO_NET" },
  { keywords: ["internet access lan complimentary", "lan complimentary"], code: "INTERNET_ACCESS_LAN_COMPLIMENTARY" },
  { keywords: ["internet access lan charges", "lan charges"], code: "INTERNET_ACCESS_LAN_CHARGES_APPLY" },
  { keywords: ["internet access wifi charges", "wifi charges"], code: "INTERNET_ACCESS_WIFI_CHARGES_APPLY" },
];

// ── Room View Map ──
const VIEW_MAP = [
  ["airport", "Airport View"], ["bay", "Bay View"], ["beach", "Beach View"],
  ["city", "City View"], ["countryside", "Countryside View"], ["country", "Country View"],
  ["courtyard", "Courtyard View"], ["forest", "Forest View"], ["garden", "Garden View"],
  ["golf", "Golf View"], ["gulf", "Gulf View"], ["harbor", "Harbor View"],
  ["lagoon", "Lagoon View"], ["lake partial", "Lake Partial View"], ["lake", "Lake View"],
  ["marina", "Marina View"], ["mountain", "Mountain View"], ["nature", "Nature View"],
  ["night", "Night View"], ["ocean partial", "Ocean Partial View"], ["ocean", "Ocean View"],
  ["park", "Park View"], ["pool", "Pool View"], ["rain forest", "Rain Forest View"],
  ["river", "River View"], ["sea partial", "Sea Partial View"], ["sea", "Sea View"],
  ["slope", "Slope View"], ["street", "Street View"], ["valley", "Valley View"],
  ["water", "Water View"], ["tower", "Tower View"], ["hill", "Hill View"],
  ["seafront", "Seafront"], ["beachfront", "Beachfront"], ["panoramic", "Panoramic"],
];

// ── Helpers ──
function extractFacilities(texts) {
  const combined = texts.join(" ").toLowerCase();
  const result = [];
  for (const { keywords, code } of FACILITY_MAP) {
    if (keywords.some(k => combined.includes(k)) && !result.includes(code)) result.push(code);
  }
  return result.join(", ");
}

function getRoomView(roomName) {
  const lower = roomName.toLowerCase();
  return VIEW_MAP.find(([key]) => lower.includes(key))?.[1] || "No Special View";
}

function getUrlParams() {
  const url = window.location.href;
  const hotelIdM = url.match(/hotelId=(\d+)/i) || url.match(/hotel-detail-(\d+)/i);
  const cityIdM = url.match(/cityId=(\d+)/i);
  const checkInM = url.match(/checkIn=([\d-]+)/i);

  let hotelId = hotelIdM ? Number(hotelIdM[1]) : 0;
  const cityId = cityIdM ? Number(cityIdM[1]) : 0;

  if (!hotelId) {
    const el = document.querySelector('meta[name="hotel_id"], [data-hotel-id]');
    if (el) hotelId = Number(el.getAttribute('content') || el.getAttribute('data-hotel-id'));
  }

  let checkIn;
  if (checkInM) {
    checkIn = checkInM[1].replace(/-/g, '');
  } else {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    checkIn = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  }

  const checkInDate = new Date(`${checkIn.slice(0,4)}-${checkIn.slice(4,6)}-${checkIn.slice(6,8)}`);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkInDate.getDate() + 1);
  const fmt = d => d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');

  return { hotelId, cityId, checkIn, checkOut: fmt(checkOutDate) };
}

function getOffsetDates(offset) {
  const { checkIn } = getUrlParams();
  const base = new Date(`${checkIn.slice(0,4)}-${checkIn.slice(4,6)}-${checkIn.slice(6,8)}`);
  base.setDate(base.getDate() + offset);
  const next = new Date(base);
  next.setDate(next.getDate() + 1);
  const fmt = d => d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return { checkIn: fmt(base), checkOut: fmt(next) };
}

// ── 국가 판단 (호텔 주소 기반) ──
function detectCountry() {
  try {
    const addr = window.__NEXT_DATA__?.props?.pageProps?.hotelDetailResponse?.hotelPositionInfo?.address || "";
    const text = (addr + " " + (document.body?.innerText || "")).toLowerCase();
    const checks = [
      ["south korea", "KR"], ["korea", "KR"],
      ["japan", "JP"],
      ["hong kong", "HK"], ["macau", "HK"], ["macao", "HK"],
      ["malaysia", "MY"],
      ["philippines", "PH"],
      ["australia", "AU"],
    ];
    for (const [key, code] of checks) {
      if (text.includes(key)) return code;
    }
    return "";
  } catch (e) { console.log("[scan] country detect error:", e.message); return ""; }
}

// ── Extra Bed/Crib Description (React fiber 탐색) ──
function getRoomPopInfo() {
  try {
    const root = document.querySelector('#root, #app') || document.body;
    const fk = Object.keys(root).find(k =>
      k.startsWith('__reactFiber') || k.startsWith('__reactContainer'));
    if (!fk) return null;

    const seen = new WeakSet();
    let found = null;
    (function walk(f, d) {
      if (!f || d > 300 || found) return;
      if (seen.has(f)) return;
      seen.add(f);
      const p = f.memoizedProps;
      if (p && p.hotelRoomPopInfoResponse && p.hotelRoomPopInfoResponse.roomPopInfo) {
        found = p.hotelRoomPopInfoResponse;
        return;
      }
      walk(f.child, d + 1);
      walk(f.sibling, d + 1);
    })(root[fk], 0);

    return found?.roomPopInfo || null;
  } catch (e) { console.log("[scan] roomPopInfo fiber walk error:", e.message); return null; }
}

function getAddBedTitle(roomPopInfo, key) {
  const info = roomPopInfo?.[key];
  const cpt = info?.policyInfo?.childPolicyTableInfo || [];
  const blk = cpt.find(x => /addBed/i.test(x.type));
  return blk ? blk.title : "";
}

// ── SEO Room Data Parser ──
function extractSeoRoomData() {
  const targetScript = Array.from(document.querySelectorAll('script')).find(s => s.textContent.includes('physicRoomMap'));
  if (!targetScript) return null;

  const txt = targetScript.textContent;
  const start = txt.indexOf('[1,"') + 4;
  const end = txt.lastIndexOf('\\n"])');
  if (start < 4 || end < 0) return null;

  let unescaped;
  try { unescaped = JSON.parse('"' + txt.slice(start, end) + '"'); }
  catch (e) { console.log("[scan] unescape failed:", e.message); return null; }

  const sidx = unescaped.indexOf('"seoHotelRooms":{');
  if (sidx === -1) return null;

  let depth = 0, k = sidx + '"seoHotelRooms":'.length, end2 = k;
  for (; end2 < unescaped.length; end2++) {
    if (unescaped[end2] === '{') depth++;
    else if (unescaped[end2] === '}') { depth--; if (depth === 0) break; }
  }

  try { return JSON.parse(unescaped.slice(k, end2 + 1)); }
  catch (e) { console.log("[scan] seoHotelRooms parse error:", e.message); return null; }
}

function parsePhysicRoomMap(physicRoomMap, saleRoomMap, roomPopInfo) {
  const occupancyMap = {};
  const saleKeyMap = {}; // physicalRoomId(string) -> saleRoom 키 목록

  if (saleRoomMap) {
    for (const [saleKey, sale] of Object.entries(saleRoomMap)) {
      const pid = String(sale.physicalRoomId);
      const count = sale.guestCountInfo?.guestCount;
      if (pid && count && count > (occupancyMap[pid] || 0)) occupancyMap[pid] = count;
      if (pid) {
        if (!saleKeyMap[pid]) saleKeyMap[pid] = [];
        saleKeyMap[pid].push(saleKey);
      }
    }
  }

  // 이름에서 "High FL", "High Floor" 등의 층수 접미사를 제거한 기본 이름 추출
  const stripFloorSuffix = (name) => (name || "").replace(/\s*(high\s*fl(oor)?|low\s*fl(oor)?)\s*$/i, '').trim();

  const entries = Object.entries(physicRoomMap);

  // 1차 패스: physicalRoomId / saleRoom 키로 직접 desc 추출
  const directDesc = {}; // physicalRoomId(string) -> desc
  for (const [, room] of entries) {
    if (!room.name) continue;
    const physicalRoomId = String(room.id);
    let extraBedDesc = "";
    if (roomPopInfo) {
      extraBedDesc = getAddBedTitle(roomPopInfo, physicalRoomId);
      if (!extraBedDesc) {
        for (const saleKey of (saleKeyMap[physicalRoomId] || [])) {
          extraBedDesc = getAddBedTitle(roomPopInfo, saleKey);
          if (extraBedDesc) break;
        }
      }
    }
    directDesc[physicalRoomId] = extraBedDesc;
  }

  // 2차 패스: 매칭 실패한 방에 대해 "기본 이름 + 침대 구성"이 같은 다른 방의 desc로 fallback
  const getDescWithFallback = (room) => {
    const physicalRoomId = String(room.id);
    if (directDesc[physicalRoomId]) return directDesc[physicalRoomId];

    const baseName = stripFloorSuffix(room.name).toLowerCase();
    const bedTitle = (room.bedInfo?.title || "").toLowerCase();

    for (const [, other] of entries) {
      const otherPid = String(other.id);
      if (otherPid === physicalRoomId) continue;
      if (!directDesc[otherPid]) continue;
      const otherBaseName = stripFloorSuffix(other.name).toLowerCase();
      const otherBedTitle = (other.bedInfo?.title || "").toLowerCase();
      if (otherBaseName === baseName && otherBedTitle === bedTitle) {
        return directDesc[otherPid];
      }
    }
    return "";
  };

  return entries.reduce((rooms, [, room]) => {
    if (!room.name) return rooms;

    const cat1 = (room.pictureInfo || []).filter(p => p.categoryId === 1);
    const photos = (cat1.length ? cat1 : room.pictureInfo || []).map(p => p.url).filter(Boolean);

    const physicalRoomId = String(room.id);
    const extraBedDesc = getDescWithFallback(room);

    rooms.push({
      roomName: room.name,
      bedText: room.bedInfo?.title || "",
      sizeText: room.areaInfo?.title || (room.area ? room.area + "㎡" : ""),
      facilityStr: extractFacilities((room.baseFacilityInfo || []).map(f => f.name).filter(Boolean)),
      occupancy: occupancyMap[physicalRoomId] || room.person || 2,
      roomView: getRoomView(room.name),
      smoking: room.smokeInfo?.title ? (room.smokeInfo.title.toLowerCase().includes("non") ? "NO" : room.smokeInfo.title.toLowerCase().includes("smoking") ? "YES" : "") : "",
      windowType: room.windowInfo?.type ?? 0,
      roomPhotos: photos,
      physicalRoomId: physicalRoomId,
      extraBedDesc: extraBedDesc,
    });
    return rooms;
  }, []);
}

// ── Phantom Token Interceptor ──
let phantomToken = "";
(function() {
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0] || "";
    const headers = args[1]?.headers || {};
    if (typeof url === "string" && url.includes("getHotelRoomList")) {
      const pt = headers["phantom-token"] || headers["Phantom-Token"] || "";
      if (pt) phantomToken = pt;
    }
    return origFetch.apply(this, args);
  };
})();

// ── API Fallback ──
async function fetchRoomListAPI(checkIn, checkOut) {
  const { hotelId, cityId } = getUrlParams();
  if (!hotelId) return null;

  const fmtDate = s => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  const headers = { "Content-Type": "application/json", accept: "application/json" };
  if (phantomToken) headers["phantom-token"] = phantomToken;

  try {
    const res = await fetch(`${window.location.origin}/restapi/soa2/33269/getHotelRoomListOversea`, {
      method: "POST", headers,
      body: JSON.stringify({
        search: {
          isRSC: false, isSSR: false, hotelId, roomId: 0, checkIn, checkOut,
          roomQuantity: 1, adult: 2, childInfoItems: [], isIjtb: false, priceType: 0,
          hotelUniqueKey: "", mustShowRoomList: [],
          location: { geo: { cityID: cityId } }, filters: [],
          meta: { fgt: -1, roomkey: "", minCurr: "", minPrice: "", roomToken: "" },
          hasAidInUrl: false, cancelPolicyType: 0, fixSubhotel: 0,
          listTraceId: "", abResultEntities: [],
          extras: { loginAB: "", exposeBedInfos: "", enableChildAgeGroup: "T", needEntireSetRoomDesc: "T", closeOnlineRoomListOptimize: true }
        },
        head: {
          platform: "PC", cver: "0", bu: "IBU", group: "trip",
          locale: "en-XX", region: "XX", timezone: "9", currency: "USD", isSSR: false,
          extension: [
            { name: "cityId", value: String(cityId) },
            { name: "checkIn", value: fmtDate(checkIn) },
            { name: "checkOut", value: fmtDate(checkOut) }
          ]
        }
      })
    });
    return await res.json();
  } catch (e) { console.log("[scan] API error:", e.message); return null; }
}

async function scrapeHotelPhotos() {
  try {
    const detail = window.__NEXT_DATA__?.props?.pageProps?.hotelDetailResponse;
    return (detail?.hotelTopImage?.imgUrlList || []).flatMap(img => {
      const pos1 = img.diffPositionUrls?.find(u => u.position === 1);
      return pos1 ? [pos1.picUrl] : img.imgUrl ? [img.imgUrl] : [];
    }).filter(Boolean);
  } catch (e) { console.log("[scan] Hotel photo error:", e.message); return []; }
}

// ── Main ──
window.__scanRooms = async function() {
  let rooms = [];
  const roomPopInfo = getRoomPopInfo();
  const country = detectCountry();

  const seoData = extractSeoRoomData();
  if (seoData?.physicRoomMap && Object.keys(seoData.physicRoomMap).length > 0) {
    console.log("[scan] Using seoHotelRooms, rooms:", Object.keys(seoData.physicRoomMap).length);
    rooms = parsePhysicRoomMap(seoData.physicRoomMap, null, roomPopInfo);
  } else {
    console.log("[scan] Falling back to API calls");
    const offsets = [0, 5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60];
    const apiResults = await Promise.all(offsets.map(offset => {
      const { checkIn, checkOut } = getOffsetDates(offset);
      return fetchRoomListAPI(checkIn, checkOut);
    }));

    const mergedPhysic = {}, mergedSale = {};
    for (const d of apiResults) {
      if (d?.data) {
        Object.assign(mergedPhysic, d.data.physicRoomMap || {});
        Object.assign(mergedSale, d.data.saleRoomMap || {});
      }
    }
    if (Object.keys(mergedPhysic).length > 0) rooms = parsePhysicRoomMap(mergedPhysic, mergedSale, roomPopInfo);
  }

  rooms = rooms.map(r => ({ ...r, country }));

  const hotelPhotos = await scrapeHotelPhotos();
  window.__scanResult = { rooms, hotelPhotos };
  window.__scanDone = true;
  return { rooms, hotelPhotos };
};
}

    