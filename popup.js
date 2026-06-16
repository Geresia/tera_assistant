// ── Strings ──
const STRINGS = {
  kr: {
    startBtn: "Room Scan",
    hotelNamePlaceholder: "호텔 이름 입력 (사진용)",
    defaultStatus: "Trip.com 호텔 페이지에서 실행하세요.",
    notTripPage: "Trip.com 호텔 페이지에서 실행하세요.",
    scan1: "스캔 중...",
    scan1done: (n, p) => `완료: ${n}개 객실 | 호텔사진: ${p}장`,
    noRooms: "객실을 찾지 못했습니다.",
    zipping: "사진 ZIP 생성 중...",
    done: (r, p) => `완료! 객실 ${r}개 + 사진 ${p}장`,
    noPhotos: (n) => `완료! 총 ${n}개 객실 (사진 없음)`,
    noJszip: (n) => `완료! 총 ${n}개 객실 (JSZip 없음)`,
    update: (v) => `v${v} 업데이트 해주세요`,
    teraBtn: "Autofill",
    teraNoRooms: "먼저 스캔을 실행하세요.",
    teraNotTera: "tera.traveloka.com 페이지에서 실행하세요.",
    teraRunning: (c, t) => `입력 중... (${c}/${t})`,
    teraDone: (n) => `완료! ${n}개 객실 등록`,
    teraError: (e) => `오류: ${e}`,
    extractBtn: "Hotel Scan for Tera",
    extracting: "스캔 중...",
    extractDone: (n) => `완료: ${n}`,
    extractFail: "스캔 실패",
    extractNotTrip: "Trip.com 호텔 페이지에서 실행하세요.",
    hotelInsertBtn: "Hotel Detail Insert",
    hotelInsertNoData: "먼저 Hotel Scan을 실행하세요.",
    hotelInsertNotTera: "tera.traveloka.com 페이지에서 실행하세요.",
    hotelAutofillDetails: "Details 입력 중...",
    hotelAutofillFacilities: "Facilities 입력 중...",
    hotelAutofillOverview: "Overview 입력 중...",
    hotelAutofillAddress: "Address 입력 중...",
    hotelAutofillDone: "완료!",
    hotelAutofillReload: "페이지 리로드됨 - 다시 시도해주세요.",
  },
  en: {
    startBtn: "Room Scan",
    hotelNamePlaceholder: "Enter Hotel Name (for photos)",
    defaultStatus: "Run this on a Trip.com hotel page.",
    notTripPage: "Please run this on a Trip.com hotel page.",
    scan1: "Scanning...",
    scan1done: (n, p) => `Done: ${n} rooms | Photos: ${p}`,
    noRooms: "No rooms found.",
    zipping: "Creating ZIP...",
    done: (r, p) => `Done! ${r} rooms + ${p} photos`,
    noPhotos: (n) => `Done! ${n} rooms (no photos)`,
    noJszip: (n) => `Done! ${n} rooms (JSZip missing)`,
    update: (v) => `v${v} update available`,
    teraBtn: "Autofill",
    teraNoRooms: "Please scan first.",
    teraNotTera: "Please open tera.traveloka.com first.",
    teraRunning: (c, t) => `Filling... (${c}/${t})`,
    teraDone: (n) => `Done! ${n} rooms registered`,
    teraError: (e) => `Error: ${e}`,
    extractBtn: "Hotel Scan for Tera",
    extracting: "Extracting...",
    extractDone: (n) => `Done: ${n}`,
    extractFail: "Extraction failed.",
    extractNotTrip: "Please open a Trip.com hotel page.",
    hotelInsertBtn: "Hotel Detail Insert",
    hotelInsertNoData: "Please run Hotel Scan first.",
    hotelInsertNotTera: "Please open tera.traveloka.com first.",
    hotelAutofillDetails: "Filling Details...",
    hotelAutofillFacilities: "Filling Facilities...",
    hotelAutofillOverview: "Filling Overview...",
    hotelAutofillAddress: "Filling Address...",
    hotelAutofillDone: "Done!",
    hotelAutofillReload: "Page reloaded — please try again.",
  }
};

// ── State ──
let currentLang = localStorage.getItem('teraLang') || 'kr';
let roomData = [];
let currentHotelData = null;
let isPaused = false;
let pauseResolve = null;

chrome.storage.session.get('roomData', (data) => {
  if (data.roomData?.length > 0) {
    roomData = data.roomData;
    setTeraStatus(`${roomData.length}개 객실 로드됨`, "success");
  }
});

// ── Constants ──
const CURRENT_VERSION = "5.1";
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/Geresia/tera_assistant/main/version.json";

const ROOM_TYPE_OPTIONS = [
  "Junior Suite", "Studio Room", "Deluxe", "Double", "Executive",
  "Single", "Standard", "Suite", "Superior", "Triple", "Twin",
];

const BED_TYPE_MAP = {
  king: 'King', queen: 'Queen', single: 'Single', double: 'Double',
  twin: 'Twin', bunk: 'Bunk', capsule: 'Capsule', mattress: 'Mattress',
  sofa: 'Sofa', futon: 'Mattress',
};

const COUNTRY_LOCALE_MAP = {
  "south korea": "ko-KR", korea: "ko-KR",
  japan: "ja-JP", china: "zh-CN", "hong kong": "zh-HK",
  indonesia: "id-ID", vietnam: "vi-VN", thailand: "th-TH",
  philippines: "en-PH", malaysia: "ms-MY", singapore: "en-SG",
};

const TARGET_W = 1280, TARGET_H = 720, NEAR_THRESHOLD = 0.3, MAX_W = 4096, MAX_H = 4096;

// ── Hotel Facility Map ──
const HOTEL_FACILITY_MAP = [
  { codes: [102], teraValues: ["WIFI_PUBLIC_AREA", "WIFI_FREE"] },
  { codes: [656], teraValues: ["CARPARK"] },
  { codes: [149], teraValues: ["VALET_PARKING"] },
  { codes: [681], teraValues: ["CARPARK"] },
  { codes: [55],  teraValues: ["TRANSFER_SERVICE"] },
  { codes: [105, 361], teraValues: ["AIRPORT_TRANSFER"] },
  { codes: [133], teraValues: ["AREA_SHUTTLE"] },
  { codes: [123], teraValues: ["CAR_HIRE"] },
  { codes: [152], teraValues: ["BICYCLE_HIRE_SERVICE"] },
  { codes: [147], teraValues: ["RESTAURANT", "RESTAURANT_FOR_BREAKFAST", "RESTAURANT_FOR_LUNCH", "RESTAURANT_FOR_DINNER"] },
  { codes: [3],   teraValues: ["CAFE", "COFFEE_SHOP"] },
  { codes: [5, 106], teraValues: ["BAR"] },
  { codes: [16],  teraValues: ["ROOM_SERVICE", "HAS_24_HOUR_ROOM_SERVICE"] },
  { codes: [578], teraValues: ["SNACK_BAR"] },
  { codes: [579, 161], teraValues: ["GIFT_SHOP"] },
  { codes: [63],  teraValues: ["COFFEE_SHOP"] },
  { codes: [6, 164], teraValues: ["CONFERENCE_ROOM", "MEETING_FACILITIES"] },
  { codes: [137], teraValues: ["WEDDING_SERVICE"] },
  { codes: [168], teraValues: ["SECRETARIAL_SERVICE"] },
  { codes: [577], teraValues: ["BUSINESS_CENTER"] },
  { codes: [129], teraValues: ["PHOTOCOPIER"] },
  { codes: [176], teraValues: ["PROJECTOR"] },
  { codes: [174, 175], teraValues: ["BUSINESS_CENTER"] },
  { codes: [127], teraValues: ["CONCIERGE"] },
  { codes: [95],  teraValues: ["SAFETY_DEPOSIT_BOX"] },
  { codes: [96],  teraValues: ["PORTER", "BELLBOY_SERVICE"] },
  { codes: [97],  teraValues: ["LUGGAGE_STORAGE"] },
  { codes: [98],  teraValues: ["FRONT_DESK"] },
  { codes: [11],  teraValues: ["CURRENCY_EXCHANGE"] },
  { codes: [143, 131], teraValues: ["EXPRESS_CHECK_IN", "EXPRESS_CHECK_OUT"] },
  { codes: [12],  teraValues: ["TOURS"] },
  { codes: [576], teraValues: ["TOURS"] },
  { codes: [35],  teraValues: ["SHOPS"] },
  { codes: [99],  teraValues: ["ATM_OR_BANKING"] },
  { codes: [110], teraValues: ["ELEVATOR"] },
  { codes: [141], teraValues: ["SMOKING_FREE", "NON_SMOKING_ROOM"] },
  { codes: [142], teraValues: ["SMOKING_AREA"] },
  { codes: [173], teraValues: ["NON_SMOKING_ROOM"] },
  { codes: [157], teraValues: ["LIBRARY"] },
  { codes: [384, 385], teraValues: ["GARDEN"] },
  { codes: [42],  teraValues: ["FITNESS_CENTER", "FITNESS"] },
  { codes: [65, 633], teraValues: ["SPA"] },
  { codes: [43, 425], teraValues: ["MASSAGE"] },
  { codes: [44],  teraValues: ["SAUNA"] },
  { codes: [664], teraValues: ["SPA_TUB", "HOT_TUB"] },
  { codes: [41, 419, 420, 421, 422], teraValues: ["HAIR_SALON", "BEAUTY_SALON"] },
  { codes: [47],  teraValues: ["SOLARIUM"] },
  { codes: [438], teraValues: ["FITNESS"] },
  { codes: [27],  teraValues: ["TABLE_TENNIS"] },
  { codes: [31],  teraValues: ["TENNIS", "OUTDOOR_TENNIS_COURT"] },
  { codes: [30],  teraValues: ["BOWLING_ALLEY"] },
  { codes: [22],  teraValues: ["KARAOKE"] },
  { codes: [151], teraValues: ["CASINO"] },
  { codes: [15, 178, 128, 130], teraValues: ["LAUNDRY_SERVICE"] },
  { codes: [362], teraValues: ["LAUNDERETTE"] },
  { codes: [343], teraValues: ["CLOTHES_DRYER"] },
  { codes: [68],  teraValues: ["CHILDREN_PLAY_AREA"] },
  { codes: [365], teraValues: ["BABYSITTING"] },
  { codes: [330, 331, 332, 333], teraValues: ["BABYSITTING"] },
  { codes: [334, 368], teraValues: ["CHILDREN_CLUB"] },
  { codes: [575], teraValues: ["WHEELCHAIR_ACCESSIBLE"] },
  { codes: [19],  teraValues: ["IN_ROOM_ACCESSIBILITY", "ACCESSIBLE_BATHROOM"] },
  { codes: [567, 568], teraValues: ["ACCESSIBILITY_EQUIPMENT"] },
  { codes: [570], teraValues: ["ROLL_IN_SHOWER"] },
  { codes: [573], teraValues: ["ACCESSIBLE_PATH_OF_TRAVEL"] },
  { codes: [177, 479, 344, 347, 350, 353, 371, 372, 513, 40], teraValues: ["HAS_24_HOUR_SECURITY"] },
  { keywords: ["rooftop pool", "infinity pool", "outdoor pool", "outdoor swimming", "saltwater pool", "pool with view"], teraValues: ["OUTDOOR_POOL", "POOL"] },
  { keywords: ["indoor pool", "indoor swimming"], teraValues: ["INDOOR_POOL", "POOL"] },
  { keywords: ["heated pool"], teraValues: ["OUTDOOR_HEATED_POOL", "POOL"] },
  { keywords: ["children pool", "kids pool", "children's pool"], teraValues: ["CHILDREN_POOL"] },
  { keywords: ["pool bar", "swim up bar", "swimup"], teraValues: ["SWIMUP_BAR"] },
  { keywords: ["hot tub", "jacuzzi"], teraValues: ["HOT_TUB", "SPA_TUB"] },
  { keywords: ["hot spring"], teraValues: ["HOT_TUB"] },
  { keywords: ["steam room", "steamroom"], teraValues: ["STEAMROOM", "STEAM_BATH"] },
  { keywords: ["private beach"], teraValues: ["PRIVATE_BEACH"] },
  { keywords: ["public beach"], teraValues: ["PRIVATE_BEACH_NEARBY"] },
  { keywords: ["barbecue", "bbq"], teraValues: ["BARBECUE_GRILL"] },
  { keywords: ["water park"], teraValues: ["WATER_PARK_ACCESS"] },
  { keywords: ["waterslide"], teraValues: ["WATERSLIDE"] },
  { keywords: ["pets allowed", "pets welcome"], teraValues: ["PETS_ALLOWED"] },
  { keywords: ["golf course"], teraValues: ["GOLF_COURSE"] },
  { keywords: ["beach bar"], teraValues: ["BEACH_BAR"] },
  { keywords: ["nightclub"], teraValues: ["NIGHTCLUB"] },
  { keywords: ["billiard", "snooker"], teraValues: ["BILLIARDS"] },
  { keywords: ["ski"], teraValues: ["SKI"] },
  { keywords: ["marina"], teraValues: ["MARINA"] },
  { keywords: ["turkish bath", "hammam"], teraValues: ["TURKISH_BATH"] },
];

function getTeraFacilities(tripFacilities) {
  const result = new Set();
  for (const item of tripFacilities) {
    for (const mapping of HOTEL_FACILITY_MAP) {
      if (mapping.codes && item.code && mapping.codes.includes(item.code)) {
        mapping.teraValues.forEach(v => result.add(v));
      }
      if (mapping.keywords && item.desc) {
        const lower = item.desc.toLowerCase();
        if (mapping.keywords.some(k => lower.includes(k))) {
          mapping.teraValues.forEach(v => result.add(v));
        }
      }
    }
  }
  return [...result];
}

// ── Helpers ──
const t = () => STRINGS[currentLang];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('teraLang', lang);
  document.getElementById('btnKR').className = 'lang-btn' + (lang === 'kr' ? ' active' : '');
  document.getElementById('btnEN').className = 'lang-btn' + (lang === 'en' ? ' active' : '');
  document.getElementById('startBtn').textContent = STRINGS[lang].startBtn;
  document.getElementById('hotelName').placeholder = STRINGS[lang].hotelNamePlaceholder;
  document.getElementById('status').textContent = STRINGS[lang].defaultStatus;
  document.getElementById('teraBtn').textContent = STRINGS[lang].teraBtn;
  document.getElementById('extractBtn').textContent = STRINGS[lang].extractBtn;
  document.getElementById('sheetBtn').textContent = STRINGS[lang].hotelInsertBtn;
  const banner = document.getElementById('updateBanner');
  if (banner.dataset.version) banner.textContent = STRINGS[lang].update(banner.dataset.version);
  const pauseLabel = document.getElementById('pauseLabel');
  if (pauseLabel) pauseLabel.textContent = lang === 'kr' ? '사진 업로드 완료 후' : 'After Photo Upload';
}

function setStatus(msg, type = "") {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
  console.log("[Tera]", msg);
}

function setTeraStatus(msg, type = "") {
  const el = document.getElementById("teraStatus");
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
}

function setExtractStatus(msg, type = "") {
  const el = document.getElementById("extractStatus");
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
}

function matchRoomType(roomName) {
  const name = roomName.toLowerCase();
  return ROOM_TYPE_OPTIONS.find(o => name.includes(o.toLowerCase())) || "Standard";
}

function sanitizeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function waitForContinue(roomName, isError = false) {
  return new Promise(resolve => {
    const box = document.getElementById('pauseBox');
    const msgEl = document.getElementById('pauseMsg');
    const btn = document.getElementById('continueBtn');
    msgEl.textContent = isError
      ? (currentLang === 'kr' ? `${roomName} — 에러가 있어요. 수정 후 계속을 눌러주세요.` : `${roomName} — Error detected. Fix it, then click Continue.`)
      : (currentLang === 'kr' ? `${roomName} - 사진 업로드 완료 후 계속을 눌러주세요.` : `${roomName} - Upload photos, then click Continue.`);
    msgEl.style.color = isError ? '#d93025' : '';
    box.style.display = 'block';
    btn.textContent = currentLang === 'kr' ? '완료' : 'Continue';
    btn.onclick = () => { box.style.display = 'none'; msgEl.style.color = ''; resolve(); };
  });
}

async function checkForUpdates() {
  try {
    const res = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
    const data = await res.json();
    if (data.version && data.version !== CURRENT_VERSION) {
      const banner = document.getElementById("updateBanner");
      banner.style.display = "block";
      banner.dataset.version = data.version;
      banner.textContent = t().update(data.version);
      banner.onclick = () => window.open("https://github.com/Geresia/tera_assistant/releases", "_blank");
    }
  } catch (e) { console.log("Version check failed:", e.message); }
}

// ── Image Processing ──
function isLowQualityUrl(url) {
  const m = url.match(/_R_(\d+)_(\d+)_/);
  if (m) {
    const w = Number(m[1]), h = Number(m[2]);
    if (w < TARGET_W * NEAR_THRESHOLD || h < TARGET_H * NEAR_THRESHOLD) return true;
    const r = w / h;
    if (r < 0.5 || r > 2.0) return true;
  }
  const wm = url.match(/_W_(\d+)_(\d+)_/);
  if (wm) {
    const w = Number(wm[1]), h = Number(wm[2]);
    if (h > 0 && (w < TARGET_W * NEAR_THRESHOLD || h < TARGET_H * NEAR_THRESHOLD)) return true;
  }
  return false;
}

async function resizeBlob(blob, newW, newH) {
  return new Promise(resolve => {
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = newW; canvas.height = newH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newW, newH);
      URL.revokeObjectURL(objUrl);
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(blob); };
    img.src = objUrl;
  });
}

async function checkAndUpscale(blob) {
  return new Promise(resolve => {
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const w = img.naturalWidth, h = img.naturalHeight, ratio = w / h;
      URL.revokeObjectURL(objUrl);
      if (ratio < 0.5 || ratio > 2.0) { resolve({ blob, isLow: true }); return; }
      if (w > MAX_W || h > MAX_H) {
        const scale = Math.min(MAX_W / w, MAX_H / h);
        resolve({ blob: await resizeBlob(blob, Math.round(w * scale), Math.round(h * scale)), isLow: false });
        return;
      }
      if (w < TARGET_W || h < TARGET_H) {
        const scale = Math.max(TARGET_W / w, TARGET_H / h);
        resolve({ blob: await resizeBlob(blob, Math.round(w * scale), Math.round(h * scale)), isLow: false });
        return;
      }
      resolve({ blob, isLow: false });
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve({ blob, isLow: false }); };
    img.src = objUrl;
  });
}

// ── Room Scan ──
async function scanTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: () => { window.__scanRoomsLoaded = false; } });
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"], world: "MAIN" });
  await sleep(800);
  await chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN",
    func: () => {
      window.__scanResult = null;
      window.__scanDone = false;
      if (typeof window.__scanRooms !== "function") {
        window.__scanResult = { rooms: [], hotelPhotos: [] };
        window.__scanDone = true;
        return;
      }
      window.__scanRooms()
        .then(r => { window.__scanResult = r; window.__scanDone = true; })
        .catch(() => { window.__scanResult = { rooms: [], hotelPhotos: [] }; window.__scanDone = true; });
    }
  });
  for (let i = 0; i < 600; i++) {
    await sleep(500);
    const results = await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: () => ({ done: window.__scanDone, result: window.__scanResult })
    });
    const data = results?.[0]?.result;
    if (data?.done) return data.result || { rooms: [], hotelPhotos: [] };
  }
  return { rooms: [], hotelPhotos: [] };
}

// ── Tera Room Autofill ──
function parseBeds(text) {
  const beds = [];
  for (const part of (text || '').split(/ and /i)) {
    const m = part.trim().match(/^(\d+)\s+(.+?)\s+bed$/i);
    if (m) beds.push({ count: m[1], type: BED_TYPE_MAP[m[2].trim().toLowerCase()] || 'Double' });
  }
  return beds.length ? beds : [{ count: '1', type: 'Double' }];
}

async function exec(tabId, func, args = [], world = undefined) {
  const opts = { target: { tabId }, func, args };
  if (world) opts.world = world;
  return chrome.scripting.executeScript(opts);
}

async function teraFillOneRoom(tabId, room, roomType) {
  await exec(tabId, () => {
    for (const div of document.querySelectorAll('div')) {
      if (div.textContent.trim() === "Create New Room" && div.children.length <= 2) { div.click(); return; }
    }
  });
  await sleep(2000);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-roomtype"]')?.click());
  await sleep(1000);
  await exec(tabId, (type) => {
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-roomtype-options"] span'))
      .find(s => s.textContent.trim() === type)?.closest('div').click();
  }, [roomType]);
  await sleep(1500);

  await exec(tabId, () => {
    const input = document.querySelector('[data-testid="input-rs-room-numofrooms"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(500);

  await exec(tabId, (sizeText) => {
    const match = sizeText.match(/[\d.]+/);
    if (!match) return;
    const input = document.querySelector('[data-testid="input-rs-room-size"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, match[0]);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [room.sizeText || ""]);
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-unit"]')?.click());
  await sleep(800);
  await exec(tabId, () => {
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-unit-options"] span'))
      .find(s => s.textContent.trim().toLowerCase() === 'sqm')?.closest('div').click();
  });
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-window"]')?.click());
  await sleep(800);
  await exec(tabId, (hasWindow) => {
    const target = hasWindow ? "Available" : "Not Available";
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-window-options"] span'))
      .find(s => s.textContent.trim() === target)?.closest('div').click();
  }, [room.windowType !== -100]);
  await sleep(800);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-view"]')?.click());
  await sleep(800);
  await exec(tabId, (view) => {
    const input = document.querySelector('[data-testid="select-rs-room-view-queryinput"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, view);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, [room.roomView || "No Special View"]);
  await sleep(500);
  await exec(tabId, (view) => {
    const opts = document.querySelectorAll('[data-testid="select-rs-room-view-options"] span');
    const found = Array.from(opts).find(s => s.textContent.trim() === view);
    const fallback = Array.from(opts).find(s => s.textContent.trim() === 'No Special View');
    (found || fallback)?.closest('div').click();
  }, [room.roomView || "No Special View"]);
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="button-rs-room-open-bed-settings"]')?.click());
  await sleep(800);

  const hasOr = (room.bedText || '').toLowerCase().includes(' or ');
  await exec(tabId, () => document.querySelector('[data-testid="radio-option-single-bedroom"]')?.click());
  await sleep(500);

  if (hasOr) {
    await exec(tabId, () => {
      for (const span of document.querySelectorAll('span.css-1rlnnbz')) {
        if (span.textContent.trim() === 'Multiple Bed Arrangement') {
          span.closest('label').querySelector('input[type="radio"]')?.click();
          return;
        }
      }
    });
    await sleep(800);
    const allBeds = room.bedText.split(/ or /i).map(s => s.trim()).flatMap(a => parseBeds(a));
    await exec(tabId, async (beds) => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < beds.length; i++) {
        document.querySelector(`[data-testid="select-multiple-bed-arrangement-0-${i}"]`)?.click();
        await delay(400);
        const input = document.querySelector(`[data-testid="select-multiple-bed-arrangement-0-${i}-queryinput"]`);
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, beds[i].type);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await delay(400);
          Array.from(document.querySelectorAll(`[data-testid="select-multiple-bed-arrangement-0-${i}-options"] span`))
            .find(s => s.textContent.trim() === beds[i].type)?.closest('div').click();
          await delay(300);
        }
        const countInput = document.querySelector(`[data-testid="input-multiple-bed-arrangement-0-${i}"]`);
        if (countInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(countInput, beds[i].count);
          countInput.dispatchEvent(new Event('input', { bubbles: true }));
          countInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, [allBeds]);
  } else {
    const beds = parseBeds(room.bedText);
    await exec(tabId, async (beds) => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < beds.length; i++) {
        if (i > 0) { document.querySelector('[data-testid="button-add-another-bedtype-0"]')?.click(); await delay(400); }
        document.querySelector(`[data-testid="select-bedtype-fixed-0-${i}"]`)?.click();
        await delay(400);
        const input = document.querySelector(`[data-testid="select-bedtype-fixed-0-${i}-queryinput"]`);
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, beds[i].type);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await delay(400);
          Array.from(document.querySelectorAll(`[data-testid="select-bedtype-fixed-0-${i}-options"] span`))
            .find(s => s.textContent.trim() === beds[i].type)?.closest('div').click();
          await delay(300);
        }
        const countInput = document.querySelector(`[data-testid="input-numberofbeds-fixed-0-${i}"]`);
        if (countInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(countInput, beds[i].count);
          countInput.dispatchEvent(new Event('input', { bubbles: true }));
          countInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, [beds]);
  }
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="button-add-facilities"]')?.click());
  await sleep(800);
  await exec(tabId, (codes) => {
    if (!codes) return;
    for (const code of codes.split(',').map(c => c.trim()).filter(Boolean)) {
      const cb = document.querySelector(`[data-testid="checkbox-facility-${code}"]`);
      if (cb && !cb.checked) cb.click();
    }
  }, [room.facilityStr || ""]);
  await sleep(500);
  await exec(tabId, () => document.querySelector('[data-testid="button-modal-save"]')?.click());
  await sleep(500);
  await exec(tabId, () => document.querySelector('[data-testid="button-modal-save"]')?.click());
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-gender"]')?.click());
  await sleep(800);
  await exec(tabId, (name) => {
    const lower = name.toLowerCase();
    const target = (lower.includes('male only') || (lower.includes('male') && !lower.includes('female'))) ? 'Male Only'
      : lower.includes('female') ? 'Female Only' : 'All';
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-gender-options"] span'))
      .find(s => s.textContent.trim() === target)?.closest('div').click();
  }, [room.roomName || ""]);
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-smoking"]')?.click());
  await sleep(800);
  await exec(tabId, (smoking) => {
    const target = smoking === 'YES' ? 'Smoking' : 'Non-Smoking';
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-smoking-options"] span'))
      .find(s => s.textContent.trim() === target)?.closest('div').click();
  }, [room.smoking || 'NO']);
  await sleep(500);

  await exec(tabId, () => {
    const cb = document.querySelector('[data-testid="checkbox-rs-room-customizable-name"]');
    if (cb && !cb.checked) cb.click();
  });
  await sleep(500);
  await exec(tabId, (name) => {
    const input = document.querySelector('[data-testid="input-rs-room-custom-name"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, name);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [room.roomName || ""]);
  await sleep(500);

  await exec(tabId, (occ) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    for (const id of ['input-rs-room-maxguest', 'input-rs-room-maxadult']) {
      const input = document.querySelector(`[data-testid="${id}"]`);
      if (input) {
        setter.call(input, String(occ));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, [room.occupancy || 2]);
  await sleep(500);

  await exec(tabId, () => {
    const sw = document.querySelector('[data-testid="switch-allow-children"]');
    if (sw?.checked) sw.click();
  });
  await sleep(500);

  await exec(tabId, () => {
    const sw = document.querySelector('[data-testid="switch-extra-occupancy"]');
    if (sw?.checked) sw.click();
  });
  await sleep(500);

  await exec(tabId, () => {
    const input = document.querySelector('[data-testid="input-rs-room-rate-protection-amount"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '10000');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(500);
}

// ── Hotel Info Scripts ──
const extractScript = () => {
  const data = {};
  const url = window.location.href;
  const text = document.body?.innerText || "";

  const adjustTime = (timeStr, mins) => {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return timeStr;
    let h = parseInt(m[1]), min = parseInt(m[2]) + mins;
    if (min < 0) { min += 60; h -= 1; }
    if (h < 0) h = 23;
    return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
  };

  const idM = url.match(/hotelId=(\d+)/) || url.match(/\/hotels\/[^/]+-(\d+)\//);
  data.hotel_id = idM?.[1] || "";
  data.name_en = document.querySelector("h1")?.innerText?.trim() || "";

  const addrEl = document.querySelector('[class*="address"], [class*="Address"]');
  let rawAddr = (addrEl?.innerText?.trim() || "").replace(/show on map/gi, "").replace(/\n/g, " ").trim();
  data.postal_code = rawAddr.match(/\b(\d{5})\b/)?.[1] || "";
  data.address = rawAddr;

  let countryRaw = "";
  for (const s of document.querySelectorAll("script:not([src])")) {
    const m = s.textContent.match(/"countryName"\s*:\s*"([^"]+)"/);
    if (m) { countryRaw = m[1].toLowerCase(); break; }
  }
  if (!countryRaw) {
    const checks = [["south korea|korea", "south korea"], ["japan", "japan"], ["hong kong", "hong kong"],
      ["china", "china"], ["indonesia", "indonesia"], ["vietnam", "vietnam"], ["thailand", "thailand"],
      ["philippines", "philippines"], ["malaysia", "malaysia"], ["singapore", "singapore"]];
    for (const [re, val] of checks) { if (new RegExp(re, 'i').test(text)) { countryRaw = val; break; } }
  }
  data._countryRaw = countryRaw;
  data._hotelId = data.hotel_id;

  let checkinRaw = "", checkoutRaw = "";
  for (const div of document.querySelectorAll('[class*="hotelPolicy-check__"]')) {
    const sub = div.querySelector('[class*="hotelPolicy-subTitle__"]')?.innerText?.trim() || "";
    const desc = div.querySelector('[class*="hotelPolicy-check_desc__"]')?.innerText?.trim() || "";
    if (sub.toLowerCase().includes("check-in")) checkinRaw = desc;
    else if (sub.toLowerCase().includes("check-out")) checkoutRaw = desc;
  }

  let frontDeskRaw = "";
  for (const p of document.querySelector('[class*="hotelPolicy-item_right__"]')?.querySelectorAll("p") || []) {
    if (p.innerText?.toLowerCase().includes("front desk")) {
      frontDeskRaw = p.innerText.replace(/Front desk hours?:\s*/i, "").trim();
    }
  }

  const cinRangeM = checkinRaw.match(/(\d{1,2}:\d{2})\s*[–\-~]\s*(\d{1,2}:\d{2})/);
  const coutRangeM = checkoutRaw.match(/(\d{1,2}:\d{2})\s*[–\-~]\s*(\d{1,2}:\d{2})/);
  const cinM = checkinRaw.match(/(\d{1,2}:\d{2})/);
  const coutM = checkoutRaw.match(/(\d{1,2}:\d{2})/);

  if (cinRangeM && coutRangeM) {
    data.checkin_time = cinRangeM[1];
    data.checkin_end = cinRangeM[2] === "24:00" ? "23:59" : cinRangeM[2];
    data.checkout_start = coutRangeM[1];
    data.checkout_time = coutRangeM[2];
  } else {
    data.checkin_time = cinM?.[1] || checkinRaw;
    data.checkin_end = "23:59";
    data.checkout_start = "00:00";
    data.checkout_time = coutM?.[1] || checkoutRaw;
  }

  if (data.checkout_start === data.checkout_time) data.checkout_start = adjustTime(data.checkout_start, -1);
  if (data.checkin_time === data.checkin_end) data.checkin_time = adjustTime(data.checkin_time, -30);
  data.front_desk_hours = (/24\/7|24 hours/i.test(frontDeskRaw) || !frontDeskRaw) ? "Yes" : "No";

  for (const s of document.querySelectorAll("script:not([src])")) {
    const t = s.textContent;
    if (!data.built_year) { const m = t.match(/"openYear"\s*:\s*"?(\d{4})"?/); if (m) data.built_year = m[1]; }
    if (!data.room_count) { const m = t.match(/"roomCount"\s*:\s*(\d+)/); if (m) data.room_count = m[1]; }
    if (!data.hotel_id) { const m = t.match(/"hotelId"\s*:\s*(\d+)/); if (m) data.hotel_id = m[1]; }
  }

  if (!data.built_year) { const m = text.match(/Opened[:\s]+(\d{4})/i); if (m) data.built_year = m[1]; }
  if (!data.room_count) {
    const m = text.match(/Number of Rooms[:\s]+(\d+)/i) || text.match(/(\d+)\s*air-conditioned rooms/i);
    if (m) data.room_count = m[1];
  }
  if (!data.renovated_year) {
    const m = text.match(/[Rr]enovated?\s*(?:in\s*)?:?\s*(\d{4})/);
    data.renovated_year = m?.[1] || data.built_year || "1";
  }

  const floorM = text.match(/(\d+)(?:th|rd|nd|st)-floor/i) || text.match(/(\d+)\s*floors?/i);
  if (floorM) data.floor_count = floorM[1];

  for (const el of document.querySelectorAll('[class*="breakfast"], [class*="Breakfast"]')) {
    const t2 = el.innerText || "";
    if (!data.breakfast_style) { const m = t2.match(/Style[:\s]+(\w+)/i); if (m) data.breakfast_style = m[1]; }
    if (!data.breakfast_hours) { const m = t2.match(/Opening hours?[:\s]+([^\n]+)/i); if (m) data.breakfast_hours = m[1].trim(); }
    if (!data.breakfast_price) { const m = t2.match(/(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)/i); if (m) data.breakfast_price = m[1].replace(/,/g, ""); }
  }
  if (!data.breakfast_style && /buffet/i.test(text)) data.breakfast_style = "Buffet";
  if (!data.breakfast_hours) { const m = text.match(/\[Mon\s*-\s*Sun\]\s*([\d:]+\s*-\s*[\d:]+)/i); if (m) data.breakfast_hours = m[1]; }
  if (!data.breakfast_price) {
    const m = text.match(/(?:breakfast|buffet)[^\n]{0,80}(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)/i)
           || text.match(/(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)[^\n]{0,50}(?:breakfast|buffet|per person)/i);
    if (m) data.breakfast_price = m[1].replace(/,/g, "");
  }

  const hasPickup = /airport\s*(pickup|shuttle)/i.test(text);
  const hasDrop = /airport\s*drop/i.test(text);
  data.airport_transfer = (hasPickup || hasDrop) ? "Yes" : "No";
  if (data.airport_transfer === "Yes") {
    if (/airport\s*(?:pickup|shuttle|drop)[^.]*free/i.test(text) || /free[^.]*airport\s*(?:pickup|shuttle|drop)/i.test(text)) {
      data.airport_transfer_fee = "Free";
    } else {
      const m = text.match(/airport\s*(?:pickup|shuttle|drop)[^.]*?(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)/i)
             || text.match(/(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)[^.]*airport\s*(?:pickup|shuttle|drop)/i);
      data.airport_transfer_fee = m?.[1].replace(/,/g, "") || "-";
    }
  } else {
    data.airport_transfer_fee = "-";
  }

  const parkingUnavail = Array.from(document.querySelectorAll('[class*="hotelFacility-popular_descUnavail__"]'))
    .find(el => el.innerText?.toLowerCase().includes("parking"));
  const parkingFreeLabel = Array.from(document.querySelectorAll('[aria-label*="parking"], [aria-label*="Parking"]'))
    .find(el => el.getAttribute("aria-label")?.toLowerCase().includes("free"));
  const parkingFreeTag = document.querySelector('[class*="hotelFacility-popular_free__"]');
  let parkingDescText = "";
  for (const el of document.querySelectorAll('[class*="hotelFacility-normal_descA__"]')) {
    const t2 = el.innerText || "";
    if (/parking|charge|KRW|JPY|CNY|HKD|USD/i.test(t2)) { parkingDescText = t2; break; }
  }

  if (parkingUnavail) {
    data._parking = "No"; data._parking_type = "-"; data._parking_price = "-";
  } else if (parkingFreeLabel || parkingFreeTag) {
    data._parking = "Yes"; data._parking_type = "Free"; data._parking_price = "-";
  } else if (parkingDescText) {
    const m = parkingDescText.match(/(KRW|JPY|CNY|HKD|USD)\s*([\d,]+)/i);
    data._parking = "Yes"; data._parking_type = "Paid";
    data._parking_price = m ? `${m[1].toUpperCase()} ${m[2].replace(/,/g, "")}` : "-";
  } else {
    data._parking = null; data._parking_type = null; data._parking_price = null;
  }

  data.room_service = /room\s*service/i.test(text) ? "Yes" : "";
  data.voltage = { "south korea": "220V", korea: "220V", japan: "100V", china: "220V",
    "hong kong": "220V", indonesia: "220V", vietnam: "220V", thailand: "220V",
    philippines: "220V", malaysia: "240V", singapore: "230V" }[countryRaw] || "";

  return data;
};

const hotelDetailsScript = (d) => {
  const results = [];
  if (document.querySelector('.c-notification__message')?.textContent.includes('Failed to fetch data')) {
    location.reload(); return [{ field: "Reload", status: "reloaded" }];
  }

  if (!d.front_desk_hours) d.front_desk_hours = "Yes";
  if (!d.checkin_time) d.checkin_time = "14:00";
  if (!d.checkin_end) d.checkin_end = "23:59";
  if (!d.checkout_start) d.checkout_start = "00:00";
  if (!d.checkout_time) d.checkout_time = "12:00";
  if (!d.room_service) d.room_service = "No";
  if (!d.parking) d.parking = "No";
  if (!d.airport_transfer) d.airport_transfer = "No";

  const setInput = (name, value, isYear = false) => {
    const val = (!value || value === "-") ? (isYear ? "1" : "0") : value;
    const input = document.querySelector(`input[name="${name}"]`);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const setTime = (name, val) => {
    const m = val?.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    return setInput(name, `${String(parseInt(m[1])).padStart(2,"0")}:${String(parseInt(m[2])).padStart(2,"0")}`);
  };

  const clickRadio = (name, value) => {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (!radio) return false;
    radio.click(); return true;
  };

  const push = (field, ok) => results.push({ field, status: ok ? "ok" : "not_found" });

  push("24/7", clickRadio("hotel,hotelProperties,frontDeskType", d.front_desk_hours === "Yes" ? "HAS_24_HOUR_FRONT_DESK" : "NOT_HAS_24_HOUR_FRONT_DESK"));

  if (d.front_desk_hours === "Yes") {
    push("Check-in", setTime("hotel,hotelProperties,checkInTime", d.checkin_time));
    push("Check-out", setTime("hotel,hotelProperties,checkOutTime", d.checkout_time));
  } else {
    push("Check-in Start", setTime("hotel,hotelProperties,checkInTimeRange-startDate", d.checkin_time));
    push("Check-in End", setTime("hotel,hotelProperties,checkInTimeRange-endDate", d.checkin_end));
    push("Check-out Start", setTime("hotel,hotelProperties,checkOutTimeRange-startDate", d.checkout_start));
    push("Check-out End", setTime("hotel,hotelProperties,checkOutTimeRange-endDate", d.checkout_time));
  }

  push("Built Year", setInput("hotel,hotelProperties,builtYear", d.built_year, true));
  push("Renovated Year", setInput("hotel,hotelProperties,lastRenovatedYear", d.renovated_year, true));
  push("Rooms", setInput("hotel,hotelProperties,numRooms", d.room_count));
  push("Floors", setInput("hotel,hotelProperties,numFloors", d.floor_count));
  push("Restaurants", setInput("hotel,hotelProperties,numRestaurants", d.restaurant_count));
  push("Bars", setInput("hotel,hotelProperties,numBars", d.bar_count));
  push("Voltage", setInput("hotel,hotelProperties,roomVoltage", (d.voltage || "").replace(/[Vv]/g, "")));
  push("Room Service", clickRadio("hotel,hotelProperties,roomServiceType", d.room_service === "Yes" ? "AVAILABLE" : "NOT_AVAILABLE"));

  const pkAvail = d.parking && d.parking !== "No";
  push("Parking", clickRadio("hotel,hotelProperties,parkingType", pkAvail ? "AVAILABLE" : "NOT_AVAILABLE"));
  if (pkAvail && d.parking_type) push("Parking Fee", clickRadio("hotel,hotelProperties,parkingFeeType", d.parking_type === "Free" ? "FREE" : "CHARGE"));
  if (d.breakfast_price && d.breakfast_price !== "-") push("Breakfast", setInput("hotel,hotelProperties,breakfastCharge", d.breakfast_price));

  const atVal = d.airport_transfer === "Yes" ? "true" : "false";
  push("Airport Transfer", clickRadio("hotel,hotelProperties,isAvailableAirportTransfer", atVal));
  if (atVal === "true" && d.airport_transfer_fee && d.airport_transfer_fee !== "-") push("Transfer Fee", setInput("hotel,hotelProperties,airportTransferFee", d.airport_transfer_fee));

  const saveBtn = document.querySelector('button.c-btn--variant-orange span');
  if (saveBtn) { saveBtn.closest('button').click(); results.push({ field: "Save", status: "ok" }); }
  else results.push({ field: "Save", status: "not_found" });

  return results;
};

const hotelFacilitiesScript = (teraValues) => {
  for (const value of teraValues) {
    const cb = document.querySelector(`input[name="hotel,hotelFacility,facilities"][value="${value}"]`);
    if (cb && !cb.checked) cb.click();
  }
  const saveBtn = document.querySelector('button.c-btn--variant-orange span');
  if (saveBtn) saveBtn.closest('button').click();
};

const hotelAddressScript = (d) => {
  const results = [];

  const setTextInput = (name, value) => {
    if (!value || value === "-") return false;
    const input = document.querySelector(`input[name="${name}"]`);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const setTextarea = (name, value) => {
    if (!value) return false;
    const el = document.querySelector(`textarea[name="${name}"]`);
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  results.push({ field: "Postal Code", status: setTextInput("hotel,globalAddress,postalCode", d.postal_code) ? "ok" : "not_found" });

  if (d.address && d.address !== "-") {
    const yesRadio = document.querySelector('input[type="radio"][value="yes"]');
    if (yesRadio) {
      yesRadio.click();
      yesRadio.dispatchEvent(new Event('change', { bubbles: true }));
      results.push({ field: "Local Address Yes", status: "ok" });
      results.push({ field: "Local Address", status: setTextarea("hotel,localAddress,lines", d.address) ? "ok" : "not_found" });
    } else {
      results.push({ field: "Local Address Yes", status: "not_found" });
    }
  }

  const saveBtn = document.querySelector('button.c-btn--variant-orange span');
  if (saveBtn) { saveBtn.closest('button').click(); results.push({ field: "Address Save", status: "ok" }); }
  else results.push({ field: "Address Save", status: "not_found" });

  return results;
};

// ── Hotel Info API ──
const fetchLocalData = async (hotelId, locale) => {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const checkIn = fmt(today);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const checkOut = fmt(tomorrow);
  try {
    const res = await fetch("https://www.trip.com/restapi/soa2/33269/getHotelDetailAggregate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: parseInt(hotelId), checkIn, checkOut,
        adult: 2, child: 0, childrenAgeList: [], roomQuantity: 1, isBusiness: false,
        location: { geo: { cityID: 0 } }, mapType: "", extra: { useHotPoiQuery: true },
        feature: [], filterInfoList: [], hotelCertificateSwitch: "F",
        hotelInfoOptions: [{ key: "HotelStay", value: "T" }, { key: "InterHome", value: "T" }],
        policyOptions: ["divideHotelPolicy", "EnableNewPetPolicy", "EnableChildrenTipPopLayer", "JapanChildPriceSwitch"],
        policyPageCode: "trip-hotel-detail",
        versionControl: [{ key: "EnableFacilityV2", value: "B" }, { key: "UseTokenIcon", value: "T" }, { key: "MVPv2", value: "T" }],
        head: { platform: "PC", cver: "0", bu: "IBU", group: "trip", locale }
      })
    });
    return (await res.json())?.data || null;
  } catch (e) { return null; }
};

// ── Tera Hotel Autofill ──
async function runHotelAutofill(tabId) {
  setExtractStatus(t().hotelAutofillDetails);
  try {
    const results = await exec(tabId, hotelDetailsScript, [currentHotelData]);
    const res = results?.[0]?.result || [];
    if (res.find(r => r.field === "Reload")) { setExtractStatus(t().hotelAutofillReload, "error"); return; }
    await sleep(2000);

    // Facilities 탭
    if (currentHotelData._tripFacilities?.length > 0) {
      setExtractStatus(t().hotelAutofillFacilities);
      await exec(tabId, () => Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === "Facilities")?.click());
      await sleep(1500);
      const teraValues = getTeraFacilities(currentHotelData._tripFacilities);
      await exec(tabId, hotelFacilitiesScript, [teraValues]);
      await sleep(2000);
    }

    // Overview 탭
    setExtractStatus(t().hotelAutofillOverview);
    await exec(tabId, () => Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === "Overview")?.click());
    await sleep(1500);
    await exec(tabId, (name) => {
      if (!name) return;
      const input = document.querySelector('input[name="hotel,accommodationLocaleName"]');
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, name);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('button.c-btn--variant-orange span')?.closest('button').click();
    }, [currentHotelData.name_local || ""]);
    await sleep(2000);

    // Address 탭
    setExtractStatus(t().hotelAutofillAddress);
    await exec(tabId, () => Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === "Address")?.click());

    for (let i = 0; i < 6; i++) {
      await sleep(500);
      const r = await exec(tabId, () => {
        const btn = Array.from(document.querySelectorAll('button.c-btn--variant-orange span')).find(el => el.textContent.trim().includes('Yes, move'));
        if (btn) { btn.closest('button').click(); return true; }
        return false;
      });
      if (r?.[0]?.result) break;
    }

    await sleep(1500);
    await exec(tabId, hotelAddressScript, [currentHotelData]);
    setExtractStatus(t().hotelAutofillDone, "success");
  } catch (e) {
    setExtractStatus("Error: " + e.message, "error");
  }
}

// ── API 데이터 처리 공통 함수 ──
async function processApiData(data, apiData) {
  if (apiData) {
    const baseInfo = apiData.hotelBaseInfo || {};
    const nameInfo = baseInfo.nameInfo || {};
    data.name_local = nameInfo.nameLocale || nameInfo.name || data.name_en;
    if (baseInfo.openYear) data.built_year = String(baseInfo.openYear);
    if (baseInfo.lastRenovateYear) data.renovated_year = String(baseInfo.lastRenovateYear);
    const rawAddr = apiData.hotelPositionInfo?.address || "";
    const cleanAddr = rawAddr.replace(/show on map/gi, "").replace(/,?\s*\d{5}\s*,?/g, "").replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim();
    if (cleanAddr) data.address = cleanAddr;
    let restaurantCount = 0, barCount = 0;
    for (const cat of apiData.hotelFacilityPopV2?.hotelFacility || []) {
      if (cat.categoryId === 8) restaurantCount = cat.categoryList?.[0]?.list?.length || 0;
      if (cat.categoryId === 7) barCount = cat.categoryList?.[0]?.list?.length || 0;
    }
    data.restaurant_count = restaurantCount > 0 ? String(restaurantCount) : "-";
    data.bar_count = barCount > 0 ? String(barCount) : "-";
    // Trip.com 시설 원본 저장 (Tera Facilities 자동체크용)
    data._tripFacilities = (apiData.hotelFacilityPopV2?.hotelFacility || [])
      .flatMap(cat => (cat.categoryList || []).flatMap(g => g.list || []));
  } else {
    data.restaurant_count = "-"; data.bar_count = "-";
    data._tripFacilities = [];
  }
  data.parking = data._parking ?? "";
  data.parking_type = data._parking_type ?? "-";
  data.parking_price = data._parking_price ?? "-";
  delete data._countryRaw; delete data._hotelId;
  delete data._parking; delete data._parking_type; delete data._parking_price;
  return data;
}

// ── Event Listeners ──

// Room Autofill
document.getElementById("teraBtn").addEventListener("click", async () => {
  if (roomData.length === 0) { setTeraStatus(t().teraNoRooms, "error"); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url?.includes("tera.traveloka.com")) { setTeraStatus(t().teraNotTera, "error"); return; }

  const btn = document.getElementById("teraBtn");
  btn.disabled = true;
  document.getElementById("pauseToggleBtn").style.display = "block";
  isPaused = false;
  try {
    for (let i = 0; i < roomData.length; i++) {
      const room = roomData[i];
      if (isPaused) await new Promise(resolve => { pauseResolve = resolve; });
      setTeraStatus(t().teraRunning(i + 1, roomData.length));
      await teraFillOneRoom(tab.id, room, matchRoomType(room.roomName));
      await waitForContinue(room.roomName);
      await exec(tab.id, () => document.querySelector('[data-testid="button-mainform-submit"]')?.click(), [], "MAIN");
      await sleep(1500);
      await exec(tab.id, () => {
        Array.from(document.querySelectorAll('.css-jr388n')).find(b => b.textContent.trim() === 'Save')?.click();
      });
      await sleep(3000);
      while (true) {
        const check = await exec(tab.id, () => !!document.querySelector('[data-id="IcSystemStatusFail16"]'));
        if (!check?.[0]?.result) break;
        await waitForContinue(room.roomName, true);
        await exec(tab.id, () => document.querySelector('[data-testid="button-mainform-submit"]')?.click());
        await sleep(1500);
      }
      await sleep(800);
    }
    setTeraStatus(t().teraDone(roomData.length), "success");
  } catch (err) {
    setTeraStatus(t().teraError(err.message), "error");
  }
  document.getElementById("pauseToggleBtn").style.display = "none";
  isPaused = false;
  btn.disabled = false;
});

// Room Scan
document.getElementById("startBtn").addEventListener("click", async () => {
  const hotelName = document.getElementById("hotelName").value.trim();
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  roomData = [];
  setTeraStatus("");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url?.includes("trip.com/hotels")) {
      setStatus(t().notTripPage, "error");
      btn.disabled = false;
      return;
    }

    setStatus(t().scan1);
    const result = await scanTab(tab.id);
    const hotelPhotos = result.hotelPhotos || [];
    const allRooms = new Map();
    (result.rooms || []).forEach(r => { if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r); });
    setStatus(t().scan1done(allRooms.size, hotelPhotos.length));

    const finalRooms = [...allRooms.values()];
    if (finalRooms.length === 0) { setStatus(t().noRooms, "error"); btn.disabled = false; return; }

    roomData = finalRooms;
    chrome.storage.session.set({ roomData: finalRooms });

    const roomList = document.getElementById("roomList");
    roomList.innerHTML = `<div class="room-item"><label class="room-check-all"><input type="checkbox" id="checkAll" checked> All</label></div>`;
    finalRooms.forEach((room, i) => {
      const item = document.createElement("div");
      item.className = "room-item";
      item.innerHTML = `<input type="checkbox" class="room-cb" data-index="${i}" checked><span>${room.roomName}</span>`;
      item.querySelector('span').onclick = () => item.querySelector('input').click();
      roomList.appendChild(item);
    });
    document.getElementById("checkAll").addEventListener("change", (e) => {
      document.querySelectorAll(".room-cb").forEach(cb => cb.checked = e.target.checked);
    });
    roomList.style.display = "block";
    document.getElementById("selectFillBtn").style.display = "block";

    if (typeof JSZip === "undefined") { setStatus(t().noJszip(finalRooms.length), "success"); btn.disabled = false; return; }

    setStatus(t().zipping);
    const zip = new JSZip();
    const folderName = sanitizeName(hotelName || String(Date.now()));
    const hotelFolder = zip.folder(folderName);
    const normalizeUrl = url => url.split('?')[0].trim();
    let photoCount = 0;

    const processChunk = async (urls) => Promise.all(urls.map(async (url) => {
      const ext = url.includes(".webp") ? "jpg" : (url.match(/\.(jpg|jpeg|png)/i)?.[1] || "jpg");
      try {
        const urlLow = isLowQualityUrl(url);
        const res = await fetch(url);
        let blob = await res.blob();
        let low = false;
        if (urlLow) { low = true; }
        else { const r = await checkAndUpscale(blob); blob = r.blob; low = r.isLow; }
        return { blob, low, ext };
      } catch { return null; }
    }));

    for (const room of finalRooms) {
      if (!room.roomPhotos?.length) continue;
      const roomFolder = hotelFolder.folder(sanitizeName(room.roomName));
      let idx = 1;
      const seen = new Set();
      const unique = room.roomPhotos.filter(url => { if (!url || seen.has(normalizeUrl(url))) return false; seen.add(normalizeUrl(url)); return true; });
      for (let i = 0; i < unique.length; i += 6) {
        for (const r of await processChunk(unique.slice(i, i + 6))) {
          if (!r) continue;
          roomFolder.file(`${String(idx).padStart(2,"0")}${r.low ? "_LOW_QUALITY" : ""}.${r.ext}`, r.blob);
          idx++; photoCount++;
        }
      }
    }

    if (hotelPhotos.length > 0) {
      const photoFolder = hotelFolder.folder("Hotel Photo");
      const seen = new Set();
      const unique = hotelPhotos.filter(url => { if (!url || seen.has(normalizeUrl(url))) return false; seen.add(normalizeUrl(url)); return true; });
      let idx = 1;
      for (let i = 0; i < unique.length; i += 6) {
        for (const r of await processChunk(unique.slice(i, i + 6))) {
          if (!r) continue;
          photoFolder.file(`${String(idx).padStart(2,"0")}${r.low ? "_LOW_QUALITY" : ""}.${r.ext}`, r.blob);
          idx++; photoCount++;
        }
      }
    }

    if (photoCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${folderName}_photos.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus(t().done(finalRooms.length, photoCount), "success");
    } else {
      setStatus(t().noPhotos(finalRooms.length), "success");
    }
  } catch (err) {
    console.error("[Tera] 에러:", err);
    setStatus("Error: " + err.message, "error");
  }
  btn.disabled = false;
});

// Hotel Scan for Tera (Extract + Sheet)
document.getElementById("extractBtn").addEventListener("click", async () => {
  const btn = document.getElementById("extractBtn");
  btn.disabled = true;
  currentHotelData = null;
  setExtractStatus(t().extracting);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url?.includes("trip.com")) { setExtractStatus(t().extractNotTrip, "error"); return; }

    const results = await exec(tab.id, extractScript);
    const data = results?.[0]?.result;
    if (!data) { setExtractStatus(t().extractFail, "error"); return; }

    const locale = COUNTRY_LOCALE_MAP[data._countryRaw] || "en-XX";
    const apiData = await fetchLocalData(data._hotelId, locale);
    await processApiData(data, apiData);

    currentHotelData = data;
    setExtractStatus(t().extractDone(data.name_en || (currentLang === 'kr' ? '호텔' : 'Hotel')), "success");

    // Sheet 전송
    await exec(tab.id, (d) => {
      const HOTEL_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz384ObCq18jDZIpzbmTDOQOSO00a62xS7urqFoIV1ksyxhPz3-rkpkcn6KCf6OEGGG/exec";
      const hotelFacilityMap = [
        {keywords:["balcony","terrace"],code:"BALCONY_TERRACE"},{keywords:["connecting room","interconnecting"],code:"INTERCONNECTING_ROOMS_AVAILABLE"},
        {keywords:["private pool"],code:"PRIVATE_POOL"},{keywords:["shower"],code:"SHOWER"},{keywords:["bathrobes","bathrobe"],code:"BATHROBES"},
        {keywords:["bathtub"],code:"BATHTUB"},{keywords:["hot water","heated water"],code:"HEATED_WATER"},{keywords:["air conditioning"],code:"AIR_CONDITIONING"},
        {keywords:["hair dryer"],code:"HAIR_DRYER"},{keywords:["desk"],code:"DESK"},
        {keywords:["free wi-fi","wi-fi in public","wi-fi in room","wifi","free internet"],code:"INTERNET_ACCESS_WIFI_COMPLIMENTARY"},
        {keywords:["microwave"],code:"MICROWAVE"},{keywords:["washing machine"],code:"WASHING_MACHINE"},{keywords:["iron","ironing"],code:"IRONING_FACILITIES"},
        {keywords:["shared bathroom"],code:"SHARED_BATHROOM"},{keywords:["television","lcd tv"],code:"TELEVISION"},{keywords:["refrigerator"],code:"REFRIGERATOR"},
        {keywords:["mini bar","minibar"],code:"MINI_BAR"},{keywords:["electric kettle","coffee","tea"],code:"COFFEE_TEA_MAKER"},
        {keywords:["bottled water"],code:"COMPLIMENTARY_BOTTLED_WATER"}
      ];
      function extractFacilities(list) {
        const texts = [];
        list.forEach(cat => {
          if (cat.title) texts.push(cat.title.toLowerCase());
          (cat.categoryList || []).forEach(g => (g.list || []).forEach(item => { if (item.facilityDesc) texts.push(item.facilityDesc.toLowerCase()); }));
        });
        const combined = texts.join(" ");
        const result = [];
        hotelFacilityMap.forEach(item => { if (item.keywords.some(k => combined.includes(k)) && !result.includes(item.code)) result.push(item.code); });
        return result.join(", ");
      }
      const scripts = [...document.querySelectorAll('script')];
      const text = scripts.map(s => s.innerText).join(' ');
      const coords = text.match(/(\d{2,3}\.\d{4,})[^\d.]{1,30}(\d{2,3}\.\d{4,})/);
      const lat = coords ? parseFloat(coords[1]).toFixed(4) : "";
      const lng = coords ? parseFloat(coords[2]).toFixed(4) : "";
      const hotelName = document.querySelector('h1')?.innerText.trim() || "";
      const addressEl = document.querySelector('[class*="address"],[class*="Address"]');
      const rawAddress = addressEl ? addressEl.innerText.trim().replace(/show on map/gi, "").trim() : "";
      const filtered = rawAddress.split(",").map(p => p.trim()).filter(p => !/^\d{4,}$/.test(p) && !/south korea|korea|japan|thailand|indonesia|singapore|malaysia|vietnam|philippines|taiwan|china|australia|india|united arab emirates|saudi|new zealand|fiji|macau|hong kong/i.test(p));
      const address = filtered.reverse().join(", ");
      const starEl = document.querySelector('[class*="hotelStarLevel"]');
      const starRating = starEl ? (starEl.getAttribute('aria-label') || "0") : "0";
      const policyEls = document.querySelectorAll('[class*="hotelPolicyNew_hotelPolicy-check_desc"]');
      const checkInRaw = policyEls[0]?.innerText.trim() || "";
      const checkOutRaw = policyEls[1]?.innerText.trim() || "";
      const checkIn = checkInRaw.match(/\d{1,2}:\d{2}/)?.[0] || "14:00";
      const checkOut = checkOutRaw.match(/\d{1,2}:\d{2}/)?.[0] || "12:00";
      const a = rawAddress.toLowerCase();
      let currency = "KRW";
      const currencyMap = [["japan","JPY"],["hong kong","HKD"],["thailand","THB"],["indonesia","IDR"],["singapore","SGD"],["malaysia","MYR"],["vietnam","VND"],["philippines","PHP"],["taiwan","TWD"],["china","CNY"],["australia","AUD"],["india","INR"],["united arab emirates|uae","AED"],["saudi","SAR"],["new zealand","NZD"],["fiji","FJD"],["macau|macao","MOP"]];
      for (const [re, cur] of currencyMap) { if (new RegExp(re).test(a)) { currency = cur; break; } }
      const n = hotelName.toLowerCase();
      let accommodationType = "HOTEL";
      if (/resort/.test(n)) accommodationType = "RESORT";
      else if (/hostel|backpacker/.test(n)) accommodationType = "HOSTEL_BACKPACKER_ACCOMMODATION";
      else if (/villa/.test(n)) accommodationType = "VILLA";
      else if (/apartment|apart/.test(n)) accommodationType = "APARTMENT";
      else if (/capsule/.test(n)) accommodationType = "CAPSULE_HOTEL";
      else if (/aparthotel/.test(n)) accommodationType = "APARTHOTEL";
      else if (/guesthouse|guest house/.test(n)) accommodationType = "GUESTHOUSE";
      const nd = window.__NEXT_DATA__;
      const facilityData = nd?.props?.pageProps?.hotelDetailResponse?.hotelFacilityPopV2?.hotelFacility;
      const hotelFacilities = facilityData ? extractFacilities(facilityData) : "";
      fetch(HOTEL_WEB_APP_URL, {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ type: "hotel", hotelName, address, latitude: lat, longitude: lng, starRating, checkIn, checkOut, currency, accommodationType, hotelFacilities })
      });
    }, [currentHotelData], "MAIN");

  } catch (e) {
    setExtractStatus("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
  }
});

// Hotel Detail Insert (Tera Autofill)
document.getElementById("sheetBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const btn = document.getElementById("sheetBtn");

  if (!currentHotelData) {
    if (!tab.url?.includes("trip.com")) { setExtractStatus(t().extractNotTrip, "error"); return; }
    btn.disabled = true;
    setExtractStatus(t().extracting);
    try {
      const results = await exec(tab.id, extractScript);
      const data = results?.[0]?.result;
      if (!data) { setExtractStatus(t().extractFail, "error"); return; }
      const locale = COUNTRY_LOCALE_MAP[data._countryRaw] || "en-XX";
      const apiData = await fetchLocalData(data._hotelId, locale);
      await processApiData(data, apiData);
      currentHotelData = data;
      setExtractStatus(t().extractDone(data.name_en || (currentLang === 'kr' ? '호텔' : 'Hotel')), "success");
    } catch (e) {
      setExtractStatus("Error: " + e.message, "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (!tab.url?.includes("tera.traveloka.com")) { setExtractStatus(t().hotelInsertNotTera, "error"); return; }
  btn.disabled = true;
  await runHotelAutofill(tab.id);
  btn.disabled = false;
});

// Init
setLang(currentLang);
document.getElementById('btnKR').addEventListener('click', () => setLang('kr'));
document.getElementById('btnEN').addEventListener('click', () => setLang('en'));
checkForUpdates();

// Reset
document.getElementById("resetBtn").addEventListener("click", () => {
  currentHotelData = null;
  roomData = [];
  chrome.storage.session.remove('roomData');
  setStatus(t().defaultStatus);
  setTeraStatus("");
  setExtractStatus("");
  document.getElementById("roomList").style.display = "none";
  document.getElementById("pauseToggleBtn").style.display = "none";
  document.getElementById("selectFillBtn").style.display = "none";
});

// Pause Toggle
document.getElementById("pauseToggleBtn").addEventListener("click", () => {
  isPaused = !isPaused;
  document.getElementById("pauseToggleBtn").textContent = isPaused ? "Resume" : "Pause";
  document.getElementById("pauseToggleBtn").className = isPaused ? "btn-primary" : "btn-warning";
  if (!isPaused && pauseResolve) { pauseResolve(); pauseResolve = null; }
});

// Selectfill
document.getElementById("selectFillBtn").addEventListener("click", async () => {
  const selected = Array.from(document.querySelectorAll(".room-cb:checked")).map(cb => roomData[parseInt(cb.dataset.index)]);
  if (selected.length === 0) { setTeraStatus(currentLang === 'kr' ? "선택된 방이 없어요." : "No rooms selected.", "error"); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url?.includes("tera.traveloka.com")) { setTeraStatus(t().teraNotTera, "error"); return; }
  const btn = document.getElementById("selectFillBtn");
  btn.disabled = true;
  document.getElementById("pauseToggleBtn").style.display = "block";
  isPaused = false;
  try {
    for (let i = 0; i < selected.length; i++) {
      const room = selected[i];
      if (isPaused) await new Promise(resolve => { pauseResolve = resolve; });
      setTeraStatus(t().teraRunning(i + 1, selected.length));
      await teraFillOneRoom(tab.id, room, matchRoomType(room.roomName));
      await waitForContinue(room.roomName);
      await exec(tab.id, () => document.querySelector('[data-testid="button-mainform-submit"]')?.click(), [], "MAIN");
      await sleep(1500);
      await exec(tab.id, () => Array.from(document.querySelectorAll('.css-jr388n')).find(b => b.textContent.trim() === 'Save')?.click());
      await sleep(3000);
      while (true) {
        const check = await exec(tab.id, () => !!document.querySelector('[data-id="IcSystemStatusFail16"]'));
        if (!check?.[0]?.result) break;
        await waitForContinue(room.roomName, true);
        await exec(tab.id, () => document.querySelector('[data-testid="button-mainform-submit"]')?.click());
        await sleep(1500);
      }
      await sleep(800);
    }
    setTeraStatus(t().teraDone(selected.length), "success");
  } catch (err) {
    setTeraStatus(t().teraError(err.message), "error");
  }
  btn.disabled = false;
  document.getElementById("pauseToggleBtn").style.display = "none";
  isPaused = false;
});