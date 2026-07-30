      
// ── Strings ──
const STRINGS = {
  kr: {
    startBtn: "Room Scan",
    hotelNamePlaceholder: "호텔 이름 입력 (사진용)",
    defaultStatus: "Trip.com 호텔 페이지에서 실행하세요.",
    notTripPage: "Trip.com 호텔 페이지에서 실행하세요.",
    scan1: "스캔 중...",
    scan1done: (n) => `완료: ${n}개 객실`,
    noRooms: "객실을 찾지 못했습니다.",
    teraBtn: "Autofill",
    teraNoRooms: "먼저 스캔을 실행하세요.",
    teraNotTera: "tera.traveloka.com 페이지에서 실행하세요.",
    teraRunning: (c, t) => `입력 중... (${c}/${t})`,
    teraDone: (n) => `완료! ${n}개 객실 등록`,
    teraError: (e) => `오류: ${e}`,
    extractBtn: "Hotel Bulk Insert",
    extracting: "스캔 중...",
    extractDone: (n) => `완료: ${n}`,
    extractFail: "스캔 실패",
    extractNotTrip: "Trip.com 또는 Agoda 호텔 페이지에서 실행하세요.",
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
    scan1done: (n) => `Done: ${n} rooms`,
    noRooms: "No rooms found.",
    teraBtn: "Autofill",
    teraNoRooms: "Please scan first.",
    teraNotTera: "Please open tera.traveloka.com first.",
    teraRunning: (c, t) => `Filling... (${c}/${t})`,
    teraDone: (n) => `Done! ${n} rooms registered`,
    teraError: (e) => `Error: ${e}`,
    extractBtn: "Hotel Bulk Insert",
    extracting: "Extracting...",
    extractDone: (n) => `Done: ${n}`,
    extractFail: "Extraction failed.",
    extractNotTrip: "Please open a Trip.com or Agoda hotel page.",
    hotelInsertBtn: "Hotel Detail Insert",
    hotelInsertNoData: "Please run Hotel Scan first.",
    hotelInsertNotTera: "Please open tera.traveloka.com first.",
    hotelAutofillDetails: "Filling Details...",
    hotelAutofillFacilities: "Filling Facilities...",
    hotelAutofillOverview: "Filling Overview...",
    hotelAutofillAddress: "Filling Address...",
    hotelAutofillDone: "Done!",
    hotelAutofillReload: "Page reloaded - please try again.",
  }
};

// ── State ──
let currentLang = localStorage.getItem('teraLang') || 'kr';
let roomData = [];
let currentHotelData = null;

let selectedPerson = localStorage.getItem('teraPerson') || '';

let hotelPhotos = [];

chrome.storage.session.get(['roomData', 'hotelPhotos'], (data) => {
  if (data.roomData?.length > 0) {
    roomData = data.roomData;
    hotelPhotos = data.hotelPhotos || [];
    setTeraStatus(`${roomData.length}개 객실 로드됨`, "success");
  }
});

// ── Utils ──
const escHtml = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function renderHotelPreview(data) {
  const container = document.getElementById('hotelPreview');
  if (!data) { container.style.display = 'none'; container.innerHTML = ''; return; }

  const isYes = data.front_desk_hours === 'Yes';
  const atYes = data.airport_transfer === 'Yes';
  const pkNo = !data.parking || data.parking === 'No';
  const pkFree = data.parking === 'Free' || data.parking_type === 'Free';
  const pkPaid = !pkNo && !pkFree;
  const cleanFee = v => (!v || /^-+$/.test(v.trim())) ? '' : v;

  const checkinDisplay = isYes
    ? `${data.checkin_time || '--'} → ${data.checkout_time || '--'}`
    : `${data.checkin_time || '--'}~${data.checkin_end || '--'} / ${data.checkout_start || '--'}~${data.checkout_time || '--'}`;
  const metaParts = [
    checkinDisplay,
    data.built_year && data.built_year !== '1' ? `Built ${data.built_year}` : null,
    data.room_count ? `${data.room_count} rooms` : null,
  ].filter(Boolean);

  container.style.display = 'block';
  container.innerHTML = `
    <div class="hotel-preview-row" id="hotelEditToggle">
      <span class="hotel-preview-name">${escHtml(data.name_en || 'Hotel')}</span>
      <button class="room-edit-btn" title="Edit">✎</button>
    </div>
    <div class="hotel-preview-meta">${escHtml(metaParts.join('  ·  '))}</div>
    <div class="hotel-edit-panel" id="hotelEditPanel">
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Name</div>
        <div class="hotel-edit-row">
          <input class="room-edit-input" id="hf-name-en" placeholder="English" value="${escHtml(data.name_en || '')}">
          <input class="room-edit-input" id="hf-name-local" placeholder="Local" value="${escHtml(data.name_local || '')}">
        </div>
        <div class="hf-err" id="hf-name-err"></div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Address in Local Language</div>
        <input class="room-edit-input" style="width:100%;box-sizing:border-box;" id="hf-address" value="${escHtml(data.address || '')}">
        <div class="hf-err" id="hf-address-err"></div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">24hr Front Desk</div>
        <div class="hotel-toggle-wrap">
          <button class="hotel-toggle-btn${isYes ? ' active' : ''}" data-key="front_desk_hours" data-val="Yes">Yes</button>
          <button class="hotel-toggle-btn${!isYes ? ' active' : ''}" data-key="front_desk_hours" data-val="No">No</button>
        </div>
      </div>
      <div id="hf-time-single" class="hotel-edit-group"${!isYes ? ' style="display:none"' : ''}>
        <div class="hotel-edit-group-label">Check-in / Check-out</div>
        <div class="hotel-edit-row">
          <input class="room-edit-input" id="hf-checkin" placeholder="14:00" value="${escHtml(data.checkin_time || '')}">
          <span style="color:#aeaeb2;font-size:11px;flex-shrink:0;">→</span>
          <input class="room-edit-input" id="hf-checkout" placeholder="12:00" value="${escHtml(data.checkout_time || '')}">
        </div>
        <div class="hf-err" id="hf-time-err"></div>
      </div>
      <div id="hf-time-range" class="hotel-edit-group"${isYes ? ' style="display:none"' : ''}>
        <div class="hotel-edit-group-label">Check-in</div>
        <div class="hotel-edit-row">
          <input class="room-edit-input" id="hf-checkin-from" placeholder="From" value="${escHtml(data.checkin_time || '')}">
          <span style="color:#aeaeb2;font-size:11px;flex-shrink:0;">→</span>
          <input class="room-edit-input" id="hf-checkin-to" placeholder="To" value="${escHtml(data.checkin_end || '')}">
        </div>
        <div class="hotel-edit-group-label" style="margin-top:6px;">Check-out</div>
        <div class="hotel-edit-row">
          <input class="room-edit-input" id="hf-checkout-from" placeholder="From" value="${escHtml(data.checkout_start || '')}">
          <span style="color:#aeaeb2;font-size:11px;flex-shrink:0;">→</span>
          <input class="room-edit-input" id="hf-checkout-to" placeholder="To" value="${escHtml(data.checkout_time || '')}">
        </div>
        <div class="hf-err" id="hf-time-range-err"></div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Built / Renovated</div>
        <div class="hotel-edit-row">
          <input class="room-edit-input" id="hf-built" placeholder="Built year" value="${escHtml(data.built_year || '')}">
          <input class="room-edit-input" id="hf-renovated" placeholder="Renovated year" value="${escHtml(data.renovated_year || '')}">
        </div>
        <div class="hf-err" id="hf-built-err"></div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Rooms / Floors</div>
        <div class="hotel-edit-row">
          <input class="room-edit-input" id="hf-rooms" placeholder="Rooms" value="${escHtml(data.room_count || '')}">
          <input class="room-edit-input" id="hf-floors" placeholder="Floors (optional)" value="${escHtml(data.floor_count || '')}">
        </div>
        <div class="hf-err" id="hf-rooms-err"></div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Room Service</div>
        <div class="hotel-toggle-wrap">
          <button class="hotel-toggle-btn${data.room_service === 'Yes' ? ' active' : ''}" data-key="room_service" data-val="Yes">Yes</button>
          <button class="hotel-toggle-btn${data.room_service !== 'Yes' ? ' active' : ''}" data-key="room_service" data-val="No">No</button>
        </div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Parking</div>
        <div class="hotel-toggle-wrap" id="hf-parking-wrap">
          <button class="hotel-toggle-btn${pkNo ? ' active' : ''}" data-parking="No">No</button>
          <button class="hotel-toggle-btn${pkFree ? ' active' : ''}" data-parking="Free">Free</button>
          <button class="hotel-toggle-btn${pkPaid ? ' active' : ''}" data-parking="Paid">Paid</button>
        </div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Airport Transfer</div>
        <div class="hotel-toggle-wrap">
          <button class="hotel-toggle-btn${atYes ? ' active' : ''}" data-key="airport_transfer" data-val="Yes">Yes</button>
          <button class="hotel-toggle-btn${!atYes ? ' active' : ''}" data-key="airport_transfer" data-val="No">No</button>
        </div>
        <div id="hf-transfer-fee-wrap" style="margin-top:6px;${atYes ? '' : 'display:none;'}">
          <input class="room-edit-input" style="width:100%;box-sizing:border-box;" id="hf-transfer-fee" placeholder="Transfer fee" value="${escHtml(cleanFee(data.airport_transfer_fee))}">
        </div>
      </div>
      <div class="hotel-edit-group">
        <div class="hotel-edit-group-label">Breakfast Charge (optional)</div>
        <input class="room-edit-input" style="width:100%;box-sizing:border-box;" id="hf-breakfast" placeholder="Price (e.g. 15000)" value="${escHtml(cleanFee(data.breakfast_price))}">
      </div>
    </div>
  `;

  document.getElementById('hotelEditToggle').addEventListener('click', () => {
    document.getElementById('hotelEditPanel').classList.toggle('open');
  });

  const bindInput = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', e => { currentHotelData[key] = e.target.value; });
  };
  bindInput('hf-name-en', 'name_en');
  bindInput('hf-name-local', 'name_local');
  bindInput('hf-address', 'address');
  bindInput('hf-checkin', 'checkin_time');
  bindInput('hf-checkout', 'checkout_time');
  bindInput('hf-checkin-from', 'checkin_time');
  bindInput('hf-checkin-to', 'checkin_end');
  bindInput('hf-checkout-from', 'checkout_start');
  bindInput('hf-checkout-to', 'checkout_time');
  bindInput('hf-built', 'built_year');
  bindInput('hf-renovated', 'renovated_year');
  bindInput('hf-rooms', 'room_count');
  bindInput('hf-floors', 'floor_count');
  bindInput('hf-transfer-fee', 'airport_transfer_fee');
  bindInput('hf-breakfast', 'breakfast_price');

  // Required field validation (blur triggers)
  const req = (ids, errId) => {
    const err = document.getElementById(errId);
    if (!err) return;
    const check = () => {
      const empties = ids.map(id => document.getElementById(id))
        .filter(el => el && el.offsetParent !== null && !el.value.trim());
      if (empties.length) { empties.forEach(el => el.classList.add('error')); err.textContent = 'Required'; }
      else { ids.forEach(id => document.getElementById(id)?.classList.remove('error')); err.textContent = ''; }
    };
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('blur', check);
      el.addEventListener('input', () => { if (el.value.trim()) { el.classList.remove('error'); if (err.textContent === 'Required') err.textContent = ''; } });
    });
  };
  req(['hf-name-en', 'hf-name-local'], 'hf-name-err');
  req(['hf-address'], 'hf-address-err');
  req(['hf-checkin', 'hf-checkout'], 'hf-time-err');
  req(['hf-checkin-from', 'hf-checkin-to', 'hf-checkout-from', 'hf-checkout-to'], 'hf-time-range-err');
  req(['hf-rooms'], 'hf-rooms-err');

  // Built / Renovated validation
  const checkBuiltRenovated = () => {
    const builtEl = document.getElementById('hf-built');
    const renovEl = document.getElementById('hf-renovated');
    const err = document.getElementById('hf-built-err');
    if (!err || !builtEl) return;
    const bv = builtEl.value.trim(), rv = renovEl?.value.trim();
    if (!bv) { builtEl.classList.add('error'); err.textContent = 'Required'; return; }
    builtEl.classList.remove('error');
    if (rv && parseInt(rv) < parseInt(bv)) {
      renovEl.classList.add('error');
      err.textContent = 'Last renovated year must be greater or equals than built year';
    } else {
      renovEl?.classList.remove('error');
      err.textContent = '';
    }
  };
  ['hf-built', 'hf-renovated'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', checkBuiltRenovated);
    document.getElementById(id)?.addEventListener('input', checkBuiltRenovated);
  });

  // Toggle buttons
  container.querySelectorAll('.hotel-toggle-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const val = btn.dataset.val;
      currentHotelData[key] = val;
      container.querySelectorAll(`.hotel-toggle-btn[data-key="${key}"]`).forEach(b => {
        b.classList.toggle('active', b.dataset.val === val);
      });
      if (key === 'front_desk_hours') {
        document.getElementById('hf-time-single').style.display = val === 'Yes' ? '' : 'none';
        document.getElementById('hf-time-range').style.display = val === 'Yes' ? 'none' : '';
      }
      if (key === 'airport_transfer') {
        document.getElementById('hf-transfer-fee-wrap').style.display = val === 'Yes' ? '' : 'none';
      }
    });
  });

  document.getElementById('hf-parking-wrap').querySelectorAll('.hotel-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.parking;
      currentHotelData.parking = val === 'No' ? 'No' : val;
      if (val !== 'No') currentHotelData.parking_type = val;
      document.getElementById('hf-parking-wrap').querySelectorAll('.hotel-toggle-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.parking === val);
      });
    });
  });
}

// ── Constants ──
const CURRENT_VERSION = "6.1";
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/Geresia/tera_assistant/main/version.json";
const HOTEL_SHEET_URL = "https://docs.google.com/spreadsheets/d/1ETcFuTHjFJpxZL9KwTcxMrJd1E_X5iWXdbe4LzBQxmA/edit?gid=191153574#gid=191153574";
const TERA_HOTEL_DATA_URL = "https://tera.traveloka.com/data/hotel-data/";

async function openOrFocusTab(urlPattern, fallbackUrl) {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId) await chrome.windows.update(tabs[0].windowId, { focused: true });
    return tabs[0];
  } else {
    return await chrome.tabs.create({ url: fallbackUrl });
  }
}

async function openOrFocusSheet() {
  const tabs = await chrome.tabs.query({ url: "https://docs.google.com/spreadsheets/d/1ETcFuTHjFJpxZL9KwTcxMrJd1E_X5iWXdbe4LzBQxmA/*" });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId) await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: HOTEL_SHEET_URL });
  }
}

const ROOM_TYPE_OPTIONS = [
  "Junior Suite", "Studio Room", "Deluxe", "Double", "Executive",
  "Single", "Standard", "Suite", "Superior", "Triple", "Twin",
];

const BED_TYPE_MAP = {
  king: 'King', queen: 'Queen', single: 'Single', double: 'Double',
  twin: 'Twin', bunk: 'Bunk', capsule: 'Capsule', mattress: 'Mattress',
  sofa: 'Sofa', futon: 'Mattress',
};
const BED_TYPES = ['King', 'Queen', 'Single', 'Double', 'Twin', 'Bunk', 'Capsule', 'Mattress', 'Sofa'];

// ── 국가별 디폴트값 (Trip.com 스캔 데이터 없을 때만 사용) ──
const COUNTRY_DEFAULTS = {
  KR: { size: '10', rateProtection: '10000' },
  JP: { size: '12', rateProtection: '5000' },
  HK: { size: '10', rateProtection: '500' },
  MY: { size: '10', rateProtection: '100' },
  PH: { size: '10', rateProtection: '250' },
  AU: { size: '10', rateProtection: '100' },
};
// 위 목록에 없는 국가는 KR 값을 그대로 재사용하면 통화 단위가 안 맞을 수 있어(예: 호주가 10000원 값을 그대로 받음) 별도 기본값으로 분리
const FALLBACK_COUNTRY_DEFAULTS = { size: '10', rateProtection: '1000' };
const DEFAULT_FACILITIES    = "AIR_CONDITIONING, HAIR_DRYER, COFFEE_TEA_MAKER, COMPLIMENTARY_BOTTLED_WATER, SHOWER";
const DEFAULT_FACILITIES_KR = "AIR_CONDITIONING, HAIR_DRYER, DESK, INTERNET_ACCESS_WIFI_COMPLIMENTARY, COMPLIMENTARY_BOTTLED_WATER, COFFEE_TEA_MAKER, REFRIGERATOR, HEATED_WATER";

function getCountryDefaults(country) {
  return COUNTRY_DEFAULTS[country] || FALLBACK_COUNTRY_DEFAULTS;
}

const COUNTRY_LOCALE_MAP = {
  "south korea": "ko-KR", korea: "ko-KR",
  japan: "ja-JP", china: "zh-CN", "hong kong": "zh-HK",
  indonesia: "id-ID", vietnam: "vi-VN", thailand: "th-TH",
  philippines: "en-PH", malaysia: "ms-MY", singapore: "en-SG",
};

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
  { codes: [8, 577, 170, 174, 175], teraValues: ["BUSINESS_CENTER"] },
  { codes: [129], teraValues: ["PHOTOCOPIER"] },
  { codes: [176], teraValues: ["PROJECTOR"] },
  { codes: [127], teraValues: ["CONCIERGE"] },
  { codes: [95],  teraValues: ["SAFETY_DEPOSIT_BOX"] },
  { codes: [96],  teraValues: ["PORTER", "BELLBOY_SERVICE"] },
  { codes: [97],  teraValues: ["LUGGAGE_STORAGE"] },
  { codes: [69, 98, 354, 358, 364], teraValues: ["FRONT_DESK"] },
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
  { codes: [42, 439], teraValues: ["FITNESS_CENTER", "FITNESS"] },
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
  { codes: [15, 128, 130, 178, 355, 356], teraValues: ["LAUNDRY_SERVICE"] },
  { codes: [362], teraValues: ["LAUNDERETTE"] },
  { codes: [343], teraValues: ["CLOTHES_DRYER"] },
  { codes: [122], teraValues: ["BABYSITTING", "SUPERVISED_CHILDCARE"] },
  { codes: [68],  teraValues: ["CHILDREN_PLAY_AREA"] },
  { codes: [365], teraValues: ["BABYSITTING"] },
  { codes: [330, 331, 332, 333], teraValues: ["BABYSITTING"] },
  { codes: [334, 368], teraValues: ["CHILDREN_CLUB"] },
  { codes: [360], teraValues: ["LUGGAGE_STORAGE"] },
  { codes: [575], teraValues: ["WHEELCHAIR_ACCESSIBLE"] },
  { codes: [19],  teraValues: ["IN_ROOM_ACCESSIBILITY", "ACCESSIBLE_BATHROOM"] },
  { codes: [565, 567, 568, 574], teraValues: ["ACCESSIBILITY_EQUIPMENT"] },
  { codes: [570], teraValues: ["ROLL_IN_SHOWER"] },
  { codes: [573], teraValues: ["ACCESSIBLE_PATH_OF_TRAVEL"] },
  { codes: [40, 177, 344, 347, 350, 351, 353, 371, 372, 479, 513], teraValues: ["HAS_24_HOUR_SECURITY"] },
  { codes: [739], teraValues: ["MULTILINGUAL_STAFF"] },
  { codes: [777], teraValues: ["SPECIAL_DIETARY_OPTIONS"] },
  // ── Keyword-based (Agoda text matching + Trip.com desc fallback) ──
  { keywords: ["wi-fi", "wifi", "free internet", "wireless internet"], teraValues: ["WIFI_PUBLIC_AREA", "WIFI_FREE"] },
  { keywords: ["car park", "parking"], teraValues: ["CARPARK"] },
  { keywords: ["valet parking"], teraValues: ["VALET_PARKING"] },
  { keywords: ["airport transfer", "airport shuttle", "airport pickup", "airport drop"], teraValues: ["AIRPORT_TRANSFER"] },
  { keywords: ["area shuttle", "shuttle service"], teraValues: ["AREA_SHUTTLE"] },
  { keywords: ["car hire", "car rental"], teraValues: ["CAR_HIRE"] },
  { keywords: ["bicycle hire", "bike rental", "bicycle rental"], teraValues: ["BICYCLE_HIRE_SERVICE"] },
  { keywords: ["room service"], teraValues: ["ROOM_SERVICE", "HAS_24_HOUR_ROOM_SERVICE"] },
  { keywords: ["restaurant", "dining room"], teraValues: ["RESTAURANT", "RESTAURANT_FOR_BREAKFAST", "RESTAURANT_FOR_LUNCH", "RESTAURANT_FOR_DINNER"] },
  { keywords: ["cafe", "coffee shop", "coffee lounge"], teraValues: ["CAFE", "COFFEE_SHOP"] },
  { keywords: ["bar", "lounge bar", "cocktail lounge"], teraValues: ["BAR"] },
  { keywords: ["snack bar"], teraValues: ["SNACK_BAR"] },
  { keywords: ["gift shop", "souvenir shop"], teraValues: ["GIFT_SHOP"] },
  { keywords: ["conference room", "meeting room", "meeting facilities", "seminar room", "banquet hall"], teraValues: ["CONFERENCE_ROOM", "MEETING_FACILITIES"] },
  { keywords: ["wedding"], teraValues: ["WEDDING_SERVICE"] },
  { keywords: ["business center", "business centre"], teraValues: ["BUSINESS_CENTER"] },
  { keywords: ["concierge"], teraValues: ["CONCIERGE"] },
  { keywords: ["safety deposit", "safe deposit", "in-room safe", "safety box", "safe"], teraValues: ["SAFETY_DEPOSIT_BOX"] },
  { keywords: ["porter service", "bellboy", "bellhop", "bellman"], teraValues: ["PORTER", "BELLBOY_SERVICE"] },
  { keywords: ["luggage storage", "baggage storage"], teraValues: ["LUGGAGE_STORAGE"] },
  { keywords: ["24-hour front desk", "24 hour front desk", "front desk 24", "reception 24"], teraValues: ["FRONT_DESK", "HAS_24_HOUR_FRONT_DESK"] },
  { keywords: ["currency exchange", "money exchange", "foreign exchange"], teraValues: ["CURRENCY_EXCHANGE"] },
  { keywords: ["express check-in", "express check-out", "express checkout"], teraValues: ["EXPRESS_CHECK_IN", "EXPRESS_CHECK_OUT"] },
  { keywords: ["tour desk", "tours", "sightseeing"], teraValues: ["TOURS"] },
  { keywords: ["shopping", "retail"], teraValues: ["SHOPS"] },
  { keywords: ["atm", "banking", "cash machine"], teraValues: ["ATM_OR_BANKING"] },
  { keywords: ["elevator", "lift"], teraValues: ["ELEVATOR"] },
  { keywords: ["non-smoking", "smoke-free", "smoke free", "no smoking"], teraValues: ["SMOKING_FREE", "NON_SMOKING_ROOM"] },
  { keywords: ["smoking area", "smoking room"], teraValues: ["SMOKING_AREA"] },
  { keywords: ["library", "reading room"], teraValues: ["LIBRARY"] },
  { keywords: ["garden", "terrace garden"], teraValues: ["GARDEN"] },
  { keywords: ["fitness center", "fitness room", "fitness centre", "gym", "gymnasium", "exercise room"], teraValues: ["FITNESS_CENTER", "FITNESS"] },
  { keywords: ["spa"], teraValues: ["SPA"] },
  { keywords: ["massage"], teraValues: ["MASSAGE"] },
  { keywords: ["sauna"], teraValues: ["SAUNA"] },
  { keywords: ["hair salon", "beauty salon", "hairdresser"], teraValues: ["HAIR_SALON", "BEAUTY_SALON"] },
  { keywords: ["table tennis", "ping pong"], teraValues: ["TABLE_TENNIS"] },
  { keywords: ["tennis court", "tennis"], teraValues: ["TENNIS", "OUTDOOR_TENNIS_COURT"] },
  { keywords: ["bowling"], teraValues: ["BOWLING_ALLEY"] },
  { keywords: ["karaoke"], teraValues: ["KARAOKE"] },
  { keywords: ["casino"], teraValues: ["CASINO"] },
  { keywords: ["laundry service", "laundromat", "dry cleaning", "laundry"], teraValues: ["LAUNDRY_SERVICE"] },
  { keywords: ["babysitting", "childcare", "child care"], teraValues: ["BABYSITTING", "SUPERVISED_CHILDCARE"] },
  { keywords: ["children's play area", "children play area", "kids play area", "playground"], teraValues: ["CHILDREN_PLAY_AREA"] },
  { keywords: ["kids club", "children's club", "children club"], teraValues: ["CHILDREN_CLUB"] },
  { keywords: ["wheelchair", "accessible facilities", "disability access", "disabled guests", "facilities for disabled"], teraValues: ["WHEELCHAIR_ACCESSIBLE"] },
  { keywords: ["toilet with grab rails", "grab rails"], teraValues: ["ACCESSIBLE_BATHROOM"] },
  { keywords: ["visual aids", "braille", "tactile signs"], teraValues: ["ACCESSIBILITY_EQUIPMENT"] },
  { keywords: ["24-hour security", "security guard", "security service"], teraValues: ["HAS_24_HOUR_SECURITY"] },
  { keywords: ["multilingual staff", "multiple languages", "languages spoken"], teraValues: ["MULTILINGUAL_STAFF"] },
  { keywords: ["rooftop pool", "infinity pool", "outdoor pool", "outdoor swimming", "saltwater pool", "pool with view"], teraValues: ["OUTDOOR_POOL", "POOL"] },
  { keywords: ["indoor pool", "indoor swimming"], teraValues: ["INDOOR_POOL", "POOL"] },
  { keywords: ["heated pool"], teraValues: ["OUTDOOR_HEATED_POOL", "POOL"] },
  { keywords: ["children pool", "kids pool", "children's pool"], teraValues: ["CHILDREN_POOL"] },
  { keywords: ["pool bar", "swim up bar", "swimup"], teraValues: ["SWIMUP_BAR"] },
  { keywords: ["hot tub", "jacuzzi"], teraValues: ["HOT_TUB", "SPA_TUB"] },
  { keywords: ["hot spring", "onsen", "thermal bath"], teraValues: ["HOT_TUB"] },
  { keywords: ["steam room", "steamroom"], teraValues: ["STEAMROOM", "STEAM_BATH"] },
  { keywords: ["private beach"], teraValues: ["PRIVATE_BEACH"] },
  { keywords: ["public beach", "beach access"], teraValues: ["PRIVATE_BEACH_NEARBY"] },
  { keywords: ["barbecue", "bbq"], teraValues: ["BARBECUE_GRILL"] },
  { keywords: ["water park"], teraValues: ["WATER_PARK_ACCESS"] },
  { keywords: ["waterslide"], teraValues: ["WATERSLIDE"] },
  { keywords: ["pets allowed", "pets welcome", "pet friendly"], teraValues: ["PETS_ALLOWED"] },
  { keywords: ["golf course", "golf"], teraValues: ["GOLF_COURSE"] },
  { keywords: ["beach bar"], teraValues: ["BEACH_BAR"] },
  { keywords: ["nightclub", "night club"], teraValues: ["NIGHTCLUB"] },
  { keywords: ["billiard", "snooker"], teraValues: ["BILLIARDS"] },
  { keywords: ["ski"], teraValues: ["SKI"] },
  { keywords: ["marina"], teraValues: ["MARINA"] },
  { keywords: ["turkish bath", "hammam"], teraValues: ["TURKISH_BATH"] },
  // ── booking.com 전용 문구 (Agoda/Trip.com과 표기가 달라 추가) ──
  { keywords: ["air conditioning", "air-conditioning"], teraValues: ["AIR_CONDITIONING"] },
  { keywords: ["photocopying", "fax"], teraValues: ["PHOTOCOPIER"] },
];
const FACILITY_CODE_MAP = new Map();
for (const mapping of HOTEL_FACILITY_MAP) {
  if (mapping.codes) mapping.codes.forEach(c => FACILITY_CODE_MAP.set(c, mapping.teraValues));
}
const KEYWORD_FACILITY_MAP = HOTEL_FACILITY_MAP.filter(m => m.keywords);

function getTeraFacilities(tripFacilities) {
  const result = new Set();
  for (const item of tripFacilities) {
    if (item.code && FACILITY_CODE_MAP.has(item.code)) {
      FACILITY_CODE_MAP.get(item.code).forEach(v => result.add(v));
    }
    if (item.desc) {
      const lower = item.desc.toLowerCase();
      for (const mapping of KEYWORD_FACILITY_MAP) {
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
  document.getElementById('extractBtn').textContent = STRINGS[lang].extractBtn;
  document.getElementById('sheetBtn').textContent = STRINGS[lang].hotelInsertBtn;
  const pauseLabel = document.getElementById('pauseLabel');
  if (pauseLabel) pauseLabel.textContent = lang === 'kr' ? '사진 업로드 완료 후' : 'Photo Upload';
  document.getElementById('fullAutoDesc').textContent = lang === 'kr' ? '에러 없으면 멈추지 않고 끝까지 자동 진행' : 'Runs to the end without stopping unless an error occurs';
  document.getElementById('manualDesc').textContent = lang === 'kr' ? '방마다 확인 후 Continue 눌러야 다음으로' : 'Pauses after each room';
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

let autoMode = false;

function waitForContinue(roomName, isError = false) {
  if (autoMode) return Promise.resolve();
  return new Promise(resolve => {
    const box = document.getElementById('pauseBox');
    const msgEl = document.getElementById('pauseMsg');
    const btn = document.getElementById('continueBtn');
    msgEl.textContent = isError
      ? (currentLang === 'kr' ? `${roomName} - 에러가 있습니다. 수정 후 continue을 눌러주세요.` : `${roomName} - Error detected. Fix it, then click Continue.`)
      : (currentLang === 'kr' ? `${roomName} 더블 체크 후 continue을 눌러주세요.` : `${roomName} Double check, then click Continue.`);
    msgEl.style.color = isError ? '#d93025' : '';
    box.style.display = 'block';
    btn.textContent = currentLang === 'kr' ? '완료' : 'Continue';
    btn.onclick = () => { box.style.display = 'none'; msgEl.style.color = ''; resolve(); };
  });
}

function updateWifiIndicator(ms) {
  const dot = document.getElementById('wifiDot');
  const label = document.getElementById('wifiLabel');
  const indicator = document.getElementById('wifiIndicator');
  if (!dot || !label) return;
  let color, text, title;
  if (ms < 500) {
    color = '#22c55e';
    text = currentLang === 'kr' ? '빠름' : 'Fast';
    title = `${ms}ms`;
  } else if (ms < 2000) {
    color = '#f59e0b';
    text = currentLang === 'kr' ? '보통' : 'Average';
    title = `${ms}ms`;
  } else {
    color = '#ef4444';
    text = currentLang === 'kr' ? '느림' : 'Slow';
    title = `${ms}ms — 작업이 오래 걸릴 수 있어요`;
  }
  dot.style.background = color;
  label.textContent = text;
  indicator.title = title;
}

async function checkForUpdates() {
  try {
    const t0 = Date.now();
    const res = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
    const elapsed = Date.now() - t0;
    updateWifiIndicator(elapsed);
    const data = await res.json();
    if (data.version && data.version !== CURRENT_VERSION) {
      const modal = document.getElementById('updateModal');
      const close = () => modal.classList.remove('open');

      // Notification view
      document.getElementById('updateVersion').textContent = `v${data.version}`;
      const changelogEl = document.getElementById('updateChangelog');
      changelogEl.textContent = data.changelog || '';
      changelogEl.style.display = data.changelog ? 'block' : 'none';
      modal.classList.add('open');
      document.getElementById('updateDismissBtn').onclick = close;

      // Slide view setup
      const notes = Array.isArray(data.notes) && data.notes.length
        ? data.notes
        : [{ image: data.image || '', text: data.changelog || '' }];
      let page = 0;

      const showPage = (idx) => {
        const note = notes[idx];
        const imgUrls = Array.isArray(note.images) && note.images.length
          ? note.images
          : note.image ? [note.image] : [];
        const container = document.getElementById('updateNoteImages');
        container.innerHTML = '';
        if (imgUrls.length) {
          container.style.display = 'block';
          let ci = 0;
          const renderCarousel = () => {
            container.innerHTML = '';
            const img = document.createElement('img');
            img.src = imgUrls[ci]; img.alt = '';
            img.onclick = () => {
              document.getElementById('imgLightboxImg').src = imgUrls[ci];
              document.getElementById('imgLightbox').classList.add('open');
            };
            container.appendChild(img);
            if (imgUrls.length > 1) {
              const nav = document.createElement('div');
              nav.className = 'note-img-nav';
              nav.innerHTML = `<button class="note-img-btn"${ci===0?' disabled':''}>◀</button><span class="note-img-num">${ci+1} / ${imgUrls.length}</span><button class="note-img-btn"${ci===imgUrls.length-1?' disabled':''}>▶</button>`;
              container.appendChild(nav);
              nav.querySelectorAll('.note-img-btn')[0].addEventListener('click', () => { if(ci>0){ci--;renderCarousel();} });
              nav.querySelectorAll('.note-img-btn')[1].addEventListener('click', () => { if(ci<imgUrls.length-1){ci++;renderCarousel();} });
            }
          };
          renderCarousel();
        } else {
          container.style.display = 'none';
        }
        const titleEl = document.getElementById('updateNoteTitle');
        titleEl.textContent = note.title || '';
        titleEl.style.display = note.title ? 'block' : 'none';
        document.getElementById('updateNoteText').textContent = note.text || '';
        document.getElementById('updatePageNum').textContent = `${idx + 1} / ${notes.length}`;
        document.getElementById('updatePrevBtn').disabled = idx === 0;
        document.getElementById('updateNextBtn').disabled = idx === notes.length - 1;
      };

      document.getElementById('updateNoteBtn').onclick = () => {
        document.getElementById('updateNotifView').style.display = 'none';
        document.getElementById('updateNoteVersion').textContent = `v${data.version}`;
        document.getElementById('updateNoteView').style.display = 'block';
        page = 0;
        showPage(0);
      };
      document.getElementById('updatePrevBtn').onclick = () => { if (page > 0) showPage(--page); };
      document.getElementById('updateNextBtn').onclick = () => { if (page < notes.length - 1) showPage(++page); };
      document.getElementById('updateCloseNoteBtn').onclick = close;
      document.getElementById('imgLightbox').onclick = () => {
        document.getElementById('imgLightbox').classList.remove('open');
      };
      document.getElementById('updateBackBtn').onclick = () => {
        document.getElementById('updateNoteView').style.display = 'none';
        document.getElementById('updateNotifView').style.display = 'block';
      };
    }
  } catch (e) { console.log("Version check failed:", e.message); }
}

// ── Agoda Bed Group Merge ──
function getBaseRoomName(name) {
  return name.replace(/\s*-\s*\d+.+?(bed|bunk|cot|twin|king|queen|single|double|sofa)s?\.?\s*$/i, '').trim();
}

function askBedMerge(groupName, rooms) {
  return new Promise(resolve => {
    const box = document.getElementById('bedMergeBox');
    const listEl = document.getElementById('bedMergeList');
    document.getElementById('bedMergeGroupName').textContent = `"${groupName}" - ${rooms.length}종`;
    const grpOptions = ['Room 1', 'Room 2', 'Room 3', 'Separate'];
    listEl.innerHTML = rooms.map((r, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:0.5px solid #f0f0f5;">
        <select class="bed-group-sel" data-index="${i}"
                style="font-size:11px;border:0.5px solid #d1d1d6;border-radius:6px;padding:3px 5px;background:#f5f5f7;color:#1d1d1f;flex-shrink:0;cursor:pointer;">
          ${grpOptions.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <div style="min-width:0;">
          <div style="font-size:12px;font-weight:500;color:#1d1d1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.bedText || '-'}</div>
          <div style="font-size:11px;color:#aeaeb2;">${[r.sizeText ? r.sizeText + ' sqm' : '', r.occupancy || '', r.priceText || ''].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
    `).join('');
    box.style.display = 'block';
    document.getElementById('bedMergeApply').onclick = () => {
      const assignments = Array.from(listEl.querySelectorAll('.bed-group-sel')).map((sel, i) => ({ index: i, grp: sel.value }));
      box.style.display = 'none';
      resolve(assignments);
    };
    document.getElementById('bedMergeSkip').onclick = () => {
      box.style.display = 'none';
      resolve(rooms.map((_, i) => ({ index: i, grp: 'Separate' })));
    };
  });
}

async function processBedGroups(rooms) {
  const groups = new Map();
  for (const room of rooms) {
    const base = getBaseRoomName(room.roomName);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(room);
  }
  const result = [];
  for (const [baseName, group] of groups) {
    if (group.length === 1 || baseName === group[0].roomName) {
      result.push(...group);
      continue;
    }
    const assignments = await askBedMerge(baseName, group);
    const grpMap = new Map();
    for (const { index, grp } of assignments) {
      if (grp === 'Separate') { result.push(group[index]); continue; }
      if (!grpMap.has(grp)) grpMap.set(grp, []);
      grpMap.get(grp).push(group[index]);
    }
    for (const members of grpMap.values()) {
      if (members.length === 1) { result.push(members[0]); continue; }
      const beds = members.map(r => r.bedText).filter(Boolean).join(' or ');
      const allPhotos = [...new Set(members.flatMap(r => r.roomPhotos || []))];
      result.push({ ...members[0], roomName: baseName, bedText: beds, roomPhotos: allPhotos });
    }
  }
  return result;
}

// ── Agoda Room Parse ──
function parseAgodaRooms(data) {
  const AGODA_COUNTRY_MAP = { 212: 'KR' };
  const country = AGODA_COUNTRY_MAP[data.countryId] || '';
  const seen = new Map();
  for (const room of (data.rooms || [])) {
    if (seen.has(room.typeId)) continue;
    const sizeFeature = (room.features || []).find(f => f.type === 'ROOM_SIZE');
    const bedFeature = (room.features || []).find(f => f.type === 'BEDROOM_LAYOUT');
    const sizeText = (sizeFeature?.text || '').split('/')[0].trim();
    const bedText = bedFeature?.text || '';
    const photos = (room.images || [])
      .map(img => img.url.replace(/\?.*/, ''))
      .filter(u => {
        if (u.includes('bstatic.com')) return false;
        const m = u.match(/\/hotelImages\/\d+\/(-?\d+)\//);
        if (m && (m[1] === '-1' || m[1] === '0')) return false;
        return true;
      });
    const priceText = room.offers?.[0]?.price?.final?.text || '';
    const occupancyAttrs = room.offers?.[0]?.occupancyItems?.[0]?.dataAttributes || {};
    const maxAdults = parseInt(occupancyAttrs['data-adults']) || 2;
    const occupancy = maxAdults + ' adults';
    seen.set(room.typeId, {
      roomName: room.name,
      bedText,
      sizeText,
      roomPhotos: photos,
      country,
      priceText,
      occupancy,
      maxAdults,
      extraBedDesc: "",
    });
  }
  return [...seen.values()];
}

async function scanAgodaTab(tabId) {
  for (let i = 0; i < 6; i++) {
    const res = await exec(tabId, () => window.__teraAgodaRooms, [], "MAIN");
    const data = res?.[0]?.result;
    if (data?.rooms?.length) {
      const rooms = parseAgodaRooms(data);
      const photoRes = await exec(tabId, () => window.__teraAgodaHotelPhotos || [], [], "MAIN");
      const hotelPhotos = photoRes?.[0]?.result || [];
      return { rooms, hotelPhotos };
    }
    await sleep(500);
  }
  setStatus(currentLang === 'kr' ? 'Agoda 페이지를 새로고침 후 다시 스캔해주세요.' : 'Please reload the Agoda page and scan again.', 'error');
  return null;
}

// ── booking.com Room Parse ──
function parseBookingRooms(rawRooms) {
  const seen = new Map();
  for (const r of (rawRooms || [])) {
    if (!r.roomName || seen.has(r.roomName)) continue;
    const maxAdultsMatch = (r.occupancyText || '').match(/(\d+)\s*adult/i);
    const maxAdults = maxAdultsMatch ? parseInt(maxAdultsMatch[1]) : 2;
    seen.set(r.roomName, {
      roomName: r.roomName,
      bedText: r.bedText || '',
      sizeText: '',
      roomPhotos: r.roomPhotos || [],
      country: '',
      priceText: r.priceText || '',
      occupancy: maxAdults + ' adults',
      maxAdults,
      extraBedDesc: "",
    });
  }
  return [...seen.values()];
}

async function scanBookingTab(tabId) {
  for (let i = 0; i < 6; i++) {
    const res = await exec(tabId, async () => {
      // ─────────────────────────────────────────────────────────────
      // booking.com 사진 URL 유틸
      //
      // 사진 출처가 두 가지임:
      // 1) booking.com 자체 방 (bstatic CDN)
      //    https://<host>.bstatic.com/xdata/images/hotel/<size>/<id>.<ext>?k=<hash>&o=...
      //     - <size>: square60, max300, max500, 608x352, max1024x768 ... (DOM엔 대부분 썸네일 사이즈가 박혀있음)
      //     - <ext> : jpg 또는 webp (같은 사진을 둘 다 서빙)
      //     - k 해시는 사진 id에만 묶여있어서 size/ext를 바꿔도 그대로 통함 → 썸네일 URL을 고해상도로 승격 가능
      // 2) 파트너(wholesaler/TPI, "Facilitated by a Booking.com partner company") 방 → Agoda 재고
      //    https://pix8.agoda.net/hotelImages/<hotelId>/<variantId>/<hash>.<ext>?ce=..&s=840x460
      //     - 방 이름 클릭 시에만 DOM에 삽입되는 인라인 썸네일(.b_nha_hotel_small_images)에만 존재
      //     - 쿼리스트링(s=840x460 등)을 떼면 원본 크기를 받을 수 있음 (agoda_main.js의 parseAgodaRooms와 동일 패턴)
      // ─────────────────────────────────────────────────────────────
      const HIRES = 'max1024x768';
      const BSTATIC_RE = /bstatic\.com\/xdata\/images\/hotel\//;
      const BSTATIC_ID_RE = /\/xdata\/images\/hotel\/[^/]+\/(-?\d+)\.(?:jpg|jpeg|png|webp)/i;
      // agoda 경로는 호텔마다 hotelImages/ 또는 property/ 등으로 다르지만 끝의 <숫자>/<숫자>/<해시>.<ext> 패턴은 공통
      const AGODA_RE = /pix8\.agoda\.net\//;
      const AGODA_ID_RE = /pix8\.agoda\.net\/[^/]+\/\d+\/-?\d+\/([0-9a-f]+)\.(?:jpg|jpeg|png|webp)/i;

      const isHotelPhoto = (src) => typeof src === 'string' && (BSTATIC_RE.test(src) || AGODA_RE.test(src));
      // 사진 식별 키: 도메인별로 사진 id 추출 방식이 다름 (bstatic=숫자 id, agoda=파일명 해시)
      const photoKey = (src) => {
        const b = (src.match(BSTATIC_ID_RE) || [])[1];
        if (b) return 'b:' + b;
        const a = (src.match(AGODA_ID_RE) || [])[1];
        if (a) return 'a:' + a;
        return src;
      };
      // 썸네일 URL을 고화질로 승격: bstatic은 사이즈 세그먼트를 max1024x768로, agoda는 쿼리스트링(s=)을 제거
      const toHiRes = (src) => {
        let u = src.trim();
        if (u.startsWith('//')) u = 'https:' + u;
        if (BSTATIC_RE.test(u)) {
          return u
            .replace(/\/xdata\/images\/hotel\/[^/]+\//, `/xdata/images/hotel/${HIRES}/`)
            .replace(/\.webp(?=\?|$)/i, '.jpg');
        }
        if (AGODA_RE.test(u)) return u.replace(/\?.*/, '');
        return u;
      };
      // id 기준 중복 제거 + bstatic 플레이스홀더(id가 0/음수) 제외 + 고화질 승격
      const finalize = (srcs) => {
        const seen = new Set();
        const out = [];
        for (const src of srcs) {
          if (!isHotelPhoto(src || '')) continue;
          if (BSTATIC_RE.test(src)) {
            const id = (src.match(BSTATIC_ID_RE) || [])[1];
            if (!id || id === '0' || id.startsWith('-')) continue;
          }
          const key = photoKey(src);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(toHiRes(src));
        }
        return out;
      };

      // img.src 하나만 보면 lazy-load 전 이미지를 통째로 놓치므로 srcset/data-*/배경이미지/앵커까지 전부 훑는다
      const collectFrom = (root) => {
        if (!root) return [];
        const out = [];
        const push = (u) => { if (isHotelPhoto(u)) out.push(u); };
        const pushSrcset = (ss) => {
          if (!ss) return;
          ss.split(',').forEach(part => push(part.trim().split(/\s+/)[0]));
        };
        root.querySelectorAll('img').forEach(img => {
          push(img.currentSrc);
          push(img.getAttribute('src'));
          push(img.getAttribute('data-src'));
          push(img.getAttribute('data-lazy'));
          push(img.getAttribute('data-highres'));
          pushSrcset(img.getAttribute('srcset'));
          pushSrcset(img.getAttribute('data-srcset'));
        });
        root.querySelectorAll('source[srcset]').forEach(s => pushSrcset(s.getAttribute('srcset')));
        root.querySelectorAll('a[href]').forEach(a => push(a.getAttribute('href')));
        root.querySelectorAll('[style*="url("]').forEach(el => {
          const m = (el.getAttribute('style') || '').match(/url\((['"]?)([^'")]+)\1\)/);
          if (m) push(m[2]);
        });
        return out;
      };

      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const waitFor = async (fn, tries = 8, ms = 250) => {
        for (let n = 0; n < tries; n++) {
          const v = fn();
          if (v) return v;
          await wait(ms);
        }
        return null;
      };
      // 그리드는 가상 스크롤이라 끝까지 스크롤해야 나머지 사진의 img가 DOM에 붙는다
      const scrollToLoad = async (el, rounds = 6) => {
        if (!el) return;
        const scroller = el.scrollHeight > el.clientHeight ? el : (el.closest('[style*="overflow"]') || el);
        for (let n = 0; n < rounds; n++) {
          scroller.scrollTop = scroller.scrollHeight;
          await wait(300);
        }
        scroller.scrollTop = 0;
        await wait(200);
      };
      // 파트너 방 썸네일 스트립(.hprt-ws-lightbox-gallery-thumbs)은 가로 스크롤 가상 로딩이라
      // 끝까지 스크롤해야 뒤쪽 사진(4번째, 5번째 등)의 img가 DOM에 붙는 경우가 있음
      const scrollToLoadHorizontal = async (el, rounds = 5) => {
        if (!el) return;
        const scroller = el.scrollWidth > el.clientWidth ? el : (el.querySelector('[style*="overflow"]') || el);
        for (let n = 0; n < rounds; n++) {
          scroller.scrollLeft = scroller.scrollWidth;
          await wait(250);
        }
        scroller.scrollLeft = 0;
        await wait(150);
      };
      // 이미지 개수가 더 안 늘어날 때까지(지연 로딩 안정화) 대기
      const waitStableCount = async (fn, tries = 6, ms = 250) => {
        let prev = -1;
        for (let n = 0; n < tries; n++) {
          const count = fn();
          if (count === prev) return count;
          prev = count;
          await wait(ms);
        }
        return prev;
      };

      const closeModal = () => document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true })
      );

      // 룸 행: data-block-id가 붙은 <tr>이 실제 룸 테이블 행 (구/신 마크업 공통)
      const rows = Array.from(document.querySelectorAll('tr[data-block-id]'));
      if (!rows.length) return null;

      const hotelName = document.querySelector('#hp_hotel_name')?.innerText?.trim()
        || document.querySelector('h2[data-testid="header-title"]')?.innerText?.trim()
        || document.querySelector('h1')?.innerText?.trim() || '';

      // ── 1) 호텔 대표 사진 ──
      // 문서 전체를 긁으면 하단 "비슷한 숙소" 캐러셀 사진까지 섞이므로 갤러리 컨테이너로 범위를 좁힌다.
      const galleryRoot = document.querySelector('[data-testid="GalleryUnifiedDesktop-wrapper"]')
        || document.querySelector('[data-testid="property-gallery"]')
        || document.querySelector('[data-capla-component-boundary*="PropertyGallery"]')
        || document.querySelector('#photo_wrapper')
        || document.querySelector('.bh-photo-grid');
      let hotelPhotos = finalize(collectFrom(galleryRoot || document));

      // 갤러리 모달(GalleryGridViewModal-wrapper)은 방 이름을 눌러서가 아니라 이 헤더 트리거로 열림.
      // 열린 채로 두면 방별 사진도 같은 모달의 필터 탭만 바꿔가며 재사용할 수 있어 여기서 닫지 않는다.
      const getOpenModal = () => {
        const m = document.querySelector('[data-testid="GalleryGridViewModal-wrapper"], [data-testid="gallery-modal"], .bh-photo-modal');
        return (m && m.offsetParent !== null) ? m : null;
      };
      const openGalleryModal = async () => {
        if (getOpenModal()) return getOpenModal();
        // 갤러리 열기 트리거: 페이지 이동 위험이 없는 button / href="#" 앵커만 사용
        const trigger = galleryRoot && (
          galleryRoot.querySelector('button')
          || Array.from(galleryRoot.querySelectorAll('a[href]'))
            .find(a => (a.getAttribute('href') || '').trim().startsWith('#'))
        );
        if (!trigger) return null;
        for (let attempt = 0; attempt < 3; attempt++) {
          trigger.click();
          const m = await waitFor(getOpenModal, 6, 250);
          if (m) return m;
        }
        return null;
      };

      const mainModal = await openGalleryModal();
      if (mainModal) {
        const grid = mainModal.querySelector('[data-testid="gallery-modal-grid"]') || mainModal;
        await scrollToLoad(grid);
        const fromModal = finalize([...collectFrom(grid), ...hotelPhotos]);
        if (fromModal.length > hotelPhotos.length) hotelPhotos = fromModal;
      }
      hotelPhotos = hotelPhotos.slice(0, 10);

      const nameLinkSel = '.hprt-roomtype-icon-link, .rt-name-link, a[id^="room_type_id_"]';
      // 같은 방 타입이 요금제(환불불가/무료취소 등)별로 이름이 같은 채 여러 줄 반복되는 경우가 흔해서,
      // 이름으로 tr을 다시 찾으면 항상 "첫 번째로 이름이 일치하는 줄"만 잡혀 실제로는 다른 줄을 건드리게 됨.
      // → 원본 행 위치(rowIndex)를 저장해뒀다가 나중에 그 인덱스로 정확히 같은 tr을 다시 찾는다.
      const baseRooms = rows.map((tr, rowIndex) => {
        const roomName = tr.querySelector(nameLinkSel)?.textContent?.trim() || '';
        const roomtypeCell = tr.querySelector('.hprt-table-cell-roomtype, [class*="roomname"]');
        const cellText = roomtypeCell?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const bedM = cellText.match(/\d+\s+(?:full|queen|king|twin|double|single|sofa|bunk)\s+beds?/i);
        const bedText = bedM ? bedM[0] : '';
        const priceText = tr.querySelector('.bui-price-display__value')?.textContent?.trim() || '';
        // 룸 행 안의 썸네일(square60 등)도 고해상도로 승격되므로 모달 실패 시 대체 사진으로 쓸 수 있다
        const rowPhotos = finalize(collectFrom(tr));
        return { rowIndex, roomName, bedText, priceText, occupancyText: '', rowPhotos };
      }).filter(r => r.roomName);

      // ── 2) 방별 사진 ──
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      // 필터 라벨은 방 이름과 완전히 같지 않은 경우가 있어(줄바꿈/사진 장수 suffix 등) 정확일치 → 포함 순으로 매칭
      const getFilterBtnIn = (modal, label) => {
        const btns = Array.from(modal.querySelectorAll('button[data-testid^="room-filter-"]'))
          .filter(b => b.getAttribute('data-testid') !== 'room-filter-0');
        const target = norm(label);
        if (!target) return null;
        const labelOf = (b) => norm(b.querySelector('div:last-child')?.textContent || b.textContent);
        return btns.find(b => labelOf(b) === target)
          || btns.find(b => labelOf(b).startsWith(target))
          || btns.find(b => labelOf(b).includes(target) || target.includes(labelOf(b)))
          || null;
      };

      // 파트너(wholesaler/TPI) 방은 방 이름 클릭 시에만 agoda 이미지가 DOM에 나타남.
      // 감싸는 컨테이너 클래스명이 호텔마다 다 달라서(.b_nha_hotel_small_images, .bui-modal__slot 등)
      // 클래스명으로 찾지 않고 "화면에 보이는 pix8.agoda.net 이미지"를 직접 찾는다.
      const getPartnerImgs = () => Array.from(document.querySelectorAll('img'))
        .filter(img => img.offsetParent !== null && AGODA_RE.test(img.getAttribute('src') || img.currentSrc || ''));
      // 파트너 방은 각 방마다 별도의 bui-modal(다이얼로그)로 뜨므로, 다음 방으로 넘어가기 전에 X(닫기)를 눌러야 함
      // (자체 갤러리 모달(GalleryGridViewModal)은 반대로 한 번 열면 필터만 바꿔가며 재사용하므로 여기서 닫지 않음)
      const closeNhaModal = async () => {
        const btn = document.querySelector('button.bui-modal__close[data-bui-ref="modal-close"]')
          || document.querySelector('.bui-modal__close');
        if (!btn) return;
        btn.click();
        await waitFor(() => !document.querySelector('.bui-modal__close'), 8, 250);
      };

      // mainModal은 이미 열려있으므로(호텔 사진 수집 단계에서 열어둠) 방마다 새로 열 필요 없이 필터 탭만 바꿔가며 재사용
      const hasRoomFilters = !!(mainModal && mainModal.querySelectorAll('button[data-testid^="room-filter-"]').length > 1);

      for (const room of baseRooms) {
        let photos = [];

        // 1순위: 이미 열려있는 갤러리 모달의 방별 필터 탭 (클릭 한 번만 하면 되므로 안전하게 먼저 시도)
        if (hasRoomFilters) {
          const btn = getFilterBtnIn(mainModal, room.roomName);
          // 이 방 전용 필터를 못 찾으면 전체(미필터) 갤러리를 긁게 되어 오히려 부정확 → 그럴 땐 시도하지 않음
          if (btn) {
            btn.click();
            await wait(400);
            const grid = await waitFor(() => mainModal.querySelector('[data-testid="gallery-modal-grid"]'), 8, 250);
            if (grid) {
              await scrollToLoad(grid, 4);
              await waitStableCount(() => grid.querySelectorAll('img[src]').length, 4, 250);
              photos = finalize(collectFrom(grid));
            }
          }
        }

        // 2순위: 파트너(wholesaler/agoda) 방 — 방 이름을 눌러야만 사진이 DOM에 나타남
        if (!photos.length) {
          // 이름으로 찾으면 동일 이름 행(요금제별 반복)에서 항상 첫 번째 줄만 잡히므로,
          // 저장해둔 원본 위치로 다시 찾는다 (혹시 리렌더로 tr이 교체됐을 경우를 대비해 매번 새로 querySelectorAll)
          const freshRows = Array.from(document.querySelectorAll('tr[data-block-id]'));
          const tr = freshRows[room.rowIndex]
            || freshRows.find(r => (r.querySelector(nameLinkSel)?.textContent?.trim() || '') === room.roomName);
          const nameLink = tr?.querySelector('a.hprt-roomtype-link, a[id^="room_type_id_"]') || tr?.querySelector(nameLinkSel);

          if (!getPartnerImgs().length) {
            for (let attempt = 0; attempt < 3 && !getPartnerImgs().length; attempt++) {
              nameLink?.click();
              await waitFor(() => getPartnerImgs().length, 6, 250);
            }
          }
          if (getPartnerImgs().length) {
            // 가로 가상 스크롤 썸네일 스트립일 수 있으니 (찾은 이미지들의 부모 요소를) 끝까지 스크롤해보고,
            // 이미지 개수가 더 안 늘어날 때까지 기다린 다음에 수집한다
            const anchor = getPartnerImgs()[0];
            const scrollHost = anchor.closest('[class*="thumb"], [class*="gallery"], [class*="modal"]') || anchor.parentElement;
            await scrollToLoadHorizontal(scrollHost);
            await waitStableCount(() => getPartnerImgs().length, 6, 250);
            photos = finalize(getPartnerImgs().map(img => img.getAttribute('src') || img.currentSrc));
            await closeNhaModal(); // 다음 방 클릭이 먹히려면 이 방 다이얼로그를 X로 닫아야 함
          }
        }

        // 우선순위: 방 갤러리(모달 필터/인라인) → 룸 행 썸네일 → 호텔 대표 사진 1~2장 (전부 중복되는 느낌 줄임)
        room.roomPhotos = photos.length ? photos
          : (room.rowPhotos?.length ? room.rowPhotos : hotelPhotos.slice(0, 2));
        delete room.rowPhotos;
        delete room.rowIndex;
      }
      if (mainModal) closeModal();

      return baseRooms.length ? { rooms: baseRooms, hotelPhotos, hotelName } : null;
    }, [], "MAIN");
    const raw = res?.[0]?.result;
    if (raw?.rooms?.length) {
      const rooms = parseBookingRooms(raw.rooms);
      return { rooms, hotelPhotos: raw.hotelPhotos || [], hotelName: raw.hotelName || '' };
    }
    await sleep(500);
  }
  setStatus(currentLang === 'kr' ? 'booking.com 룸 테이블을 찾지 못했습니다. 체크인/체크아웃 날짜를 선택했는지 확인 후 다시 스캔해주세요.' : 'Could not find the booking.com room table. Make sure check-in/check-out dates are selected, then scan again.', 'error');
  return null;
}

// ── Airbnb Room Parse (TODO: 실제 리스팅 데이터 구조 확인 후 구현) ──
function parseAirbnbRooms(data) {
  return [];
}

// Airbnb는 호텔처럼 방 여러 개가 아니라 리스팅 1개 = 방 1개라서, 리스팅 전체를 방 1개로 취급해서 스캔
async function scanAirbnbTab(tabId) {
  const res = await exec(tabId, () => {
    const raw = document.getElementById('data-deferred-state-0')?.textContent
      || document.querySelector('script[id^="data-deferred-state"]')?.textContent;
    let pdp = null, node = null;
    try {
      const stateJson = JSON.parse(raw || '{}');
      for (const [, resp] of (stateJson.niobeClientData || [])) {
        const p = resp?.data?.presentation?.stayProductDetailPage;
        if (p) pdp = p;
        const n = resp?.data?.node;
        if (n?.pdpPresentation) node = n;
      }
    } catch (e) {}

    let ld = null;
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const json = JSON.parse(s.textContent);
        const candidates = Array.isArray(json) ? json : [json];
        const found = candidates.find(j => /vacationrental/i.test(j['@type'] || ''));
        if (found) { ld = found; break; }
      } catch (e) {}
    }

    const title = ld?.name || document.querySelector('h1')?.innerText?.trim() || '';
    const sections = pdp?.sections?.sections || [];
    const photoModal = sections.find(s => s?.sectionId === 'PHOTO_TOUR_SCROLLABLE_MODAL')?.section;
    const mediaItems = photoModal?.mediaItems || [];
    const roomPhotos = [...new Set(mediaItems.map(m => m.baseUrl).filter(Boolean))];

    const personCapacity = node?.pdpPresentation?.personCapacity || null;
    const sizeM = title.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²|sqm)/i);

    return {
      hotelName: title,
      roomName: title,
      sizeText: sizeM ? sizeM[1] : '',
      maxAdults: personCapacity || 2,
      roomPhotos,
    };
  }, [], "MAIN");

  const data = res?.[0]?.result;
  if (!data?.roomPhotos?.length) {
    setStatus(currentLang === 'kr' ? 'Airbnb 페이지를 새로고침 후 다시 스캔해주세요.' : 'Please reload the Airbnb page and scan again.', 'error');
    return null;
  }

  const room = {
    roomName: data.roomName || '',
    bedText: '',
    sizeText: data.sizeText,
    roomPhotos: data.roomPhotos,
    country: '',
    priceText: '',
    occupancy: data.maxAdults + ' adults',
    maxAdults: data.maxAdults,
    extraBedDesc: '',
  };

  return { hotelName: data.hotelName, rooms: [room], hotelPhotos: [] };
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
  // 방 목록 페이지에 "Create New Room" 버튼이 뜰 때까지 대기 후 클릭
  while (true) {
    const found = await exec(tabId, () => {
      const btn = Array.from(document.querySelectorAll('div')).find(d => d.textContent.trim() === "Create New Room" && d.children.length <= 2);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (found?.[0]?.result) break;
    await sleep(300);
  }
  // URL이 /form/ 으로 바뀔 때까지 대기 (이전 폼 DOM 잔재 방지)
  while (true) {
    const r = await exec(tabId, () => window.location.href.includes('/form/'), [], "MAIN");
    if (r?.[0]?.result) break;
    await sleep(200);
  }
  // Room Type 드롭다운이 뜰 때까지 무한 대기
  while (true) {
    const r = await exec(tabId, () => !!document.querySelector('[data-testid="select-rs-room-roomtype"]'));
    if (r?.[0]?.result) break;
    await sleep(300);
  }

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-roomtype"]')?.click());
  await sleep(200);

  // 옵션이 실제로 뜰 때까지 무한 대기
  while (true) {
    const r = await exec(tabId, () => document.querySelectorAll('[data-testid="select-rs-room-roomtype-options"] span').length);
    if ((r?.[0]?.result || 0) > 0) break;
    await sleep(150);
  }

  await exec(tabId, (type) => {
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-roomtype-options"] span'))
      .find(s => s.textContent.trim() === type)?.closest('div').click();
  }, [roomType]);

  // Room Description 필드가 뜰 때까지 무한 대기
  while (true) {
    const r = await exec(tabId, () => !!document.querySelector('[data-testid="textfield-rs-room-description"]'));
    if (r?.[0]?.result) break;
    await sleep(150);
  }

  // Room Description (extra bed/crib 안내문, Room Type 다음 순서)
  await exec(tabId, (desc) => {
    const el = document.querySelector('[data-testid="textfield-rs-room-description"]');
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, desc);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [room.extraBedDesc || "Extra beds and cribs are unavailable for this room type"]);
  await sleep(200);

  await exec(tabId, () => {
    const input = document.querySelector('[data-testid="input-rs-room-numofrooms"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(500);

  await exec(tabId, (sizeValue) => {
    const input = document.querySelector('[data-testid="input-rs-room-size"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, sizeValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [(room.sizeText && room.sizeText.match(/[\d.]+/)?.[0]) || getCountryDefaults(room.country).size]);
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-unit"]')?.click());
  while (true) {
    const r = await exec(tabId, () => document.querySelectorAll('[data-testid="select-rs-room-unit-options"] span').length);
    if ((r?.[0]?.result || 0) > 0) break;
    await sleep(150);
  }
  await exec(tabId, () => {
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-unit-options"] span'))
      .find(s => s.textContent.trim().toLowerCase() === 'sqm')?.closest('div').click();
  });
  await sleep(300);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-window"]')?.click());
  while (true) {
    const r = await exec(tabId, () => document.querySelectorAll('[data-testid="select-rs-room-window-options"] span').length);
    if ((r?.[0]?.result || 0) > 0) break;
    await sleep(150);
  }
  await exec(tabId, (hasWindow) => {
    const target = hasWindow ? "Available" : "Not Available";
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-window-options"] span'))
      .find(s => s.textContent.trim() === target)?.closest('div').click();
  }, [room.windowType !== -100]);
  await sleep(300);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-view"]')?.click());
  while (true) {
    const r = await exec(tabId, () => !!document.querySelector('[data-testid="select-rs-room-view-queryinput"]'));
    if (r?.[0]?.result) break;
    await sleep(150);
  }
  await exec(tabId, (view) => {
    const input = document.querySelector('[data-testid="select-rs-room-view-queryinput"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, view);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, [room.roomView || "No Special View"]);
  while (true) {
    const r = await exec(tabId, () => document.querySelectorAll('[data-testid="select-rs-room-view-options"] span').length);
    if ((r?.[0]?.result || 0) > 0) break;
    await sleep(150);
  }
  await exec(tabId, (view) => {
    const opts = document.querySelectorAll('[data-testid="select-rs-room-view-options"] span');
    const found = Array.from(opts).find(s => s.textContent.trim() === view);
    const fallback = Array.from(opts).find(s => s.textContent.trim() === 'No Special View');
    (found || fallback)?.closest('div').click();
  }, [room.roomView || "No Special View"]);
  await sleep(300);

  await exec(tabId, () => document.querySelector('[data-testid="button-rs-room-open-bed-settings"]')?.click());
  while (true) {
    const r = await exec(tabId, () => !!document.querySelector('[data-testid="radio-option-single-bedroom"]'));
    if (r?.[0]?.result) break;
    await sleep(150);
  }

  const hasMultipleBedrooms = (room.bedText || '').includes(' || ');

  if (hasMultipleBedrooms) {
    // Multiple Bedrooms: click left-side radio first, then fill each bedroom
    await exec(tabId, () => document.querySelector('[data-testid="radio-option-multiple-bedrooms"]')?.click());
    while (true) {
      const r = await exec(tabId, () => document.querySelectorAll('[data-testid^="radio-option-fixed-arrangement-"]').length);
      if ((r?.[0]?.result || 0) > 0) break;
      await sleep(150);
    }

    const bedroomTexts = room.bedText.split(' || ');
    // Tera creates 2 bedrooms by default when switching to Multiple Bedrooms,
    // so only click "Add Another Bedroom" when the index exceeds what already exists.
    let existingBedrooms = (await exec(tabId, () =>
      document.querySelectorAll('[data-testid^="radio-option-fixed-arrangement-"]').length
    ))?.[0]?.result || 0;
    for (let brIdx = 0; brIdx < bedroomTexts.length; brIdx++) {
      if (brIdx >= existingBedrooms) {
        const countBefore = existingBedrooms;
        await exec(tabId, () => document.querySelector('[data-testid="button-add-another-bedroom"]')?.click());
        while (true) {
          const r = await exec(tabId, () => document.querySelectorAll('[data-testid^="radio-option-fixed-arrangement-"]').length);
          if ((r?.[0]?.result || 0) > countBefore) break;
          await sleep(150);
        }
        existingBedrooms++;
      }
      const brText = bedroomTexts[brIdx];
      const brHasOr = brText.toLowerCase().includes(' or ');

      if (brHasOr) {
        await exec(tabId, (brIdx) => {
          const fixedInput = document.querySelector(`[data-testid="radio-option-fixed-arrangement-${brIdx}"]`);
          const wrap = fixedInput?.parentElement?.parentElement?.parentElement?.parentElement;
          wrap?.querySelector('input[value="MULTIPLE"]')?.click();
        }, [brIdx]);
        while (true) {
          const r = await exec(tabId, (brIdx) => !!document.querySelector(`[data-testid="select-multiple-bed-arrangement-${brIdx}-0"]`), [brIdx]);
          if (r?.[0]?.result) break;
          await sleep(150);
        }
        const brBeds = brText.split(/ or /i).map(s => s.trim()).flatMap(a => parseBeds(a));
        await exec(tabId, async (beds, brIdx) => {
          const delay = ms => new Promise(r => setTimeout(r, ms));
          for (let i = 0; i < beds.length; i++) {
            document.querySelector(`[data-testid="select-multiple-bed-arrangement-${brIdx}-${i}"]`)?.click();
            await delay(400);
            const input = document.querySelector(`[data-testid="select-multiple-bed-arrangement-${brIdx}-${i}-queryinput"]`);
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, beds[i].type);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              await delay(400);
              Array.from(document.querySelectorAll(`[data-testid="select-multiple-bed-arrangement-${brIdx}-${i}-options"] span`))
                .find(s => s.textContent.trim() === beds[i].type)?.closest('div').click();
              await delay(300);
            }
            const countInput = document.querySelector(`[data-testid="input-multiple-bed-arrangement-${brIdx}-${i}"]`);
            if (countInput) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(countInput, beds[i].count);
              countInput.dispatchEvent(new Event('input', { bubbles: true }));
              countInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }, [brBeds, brIdx]);
      } else {
        const brBeds = parseBeds(brText);
        await exec(tabId, async (beds, brIdx) => {
          const delay = ms => new Promise(r => setTimeout(r, ms));
          for (let i = 0; i < beds.length; i++) {
            if (i > 0) { document.querySelector(`[data-testid="button-add-another-bedtype-${brIdx}"]`)?.click(); await delay(400); }
            document.querySelector(`[data-testid="select-bedtype-fixed-${brIdx}-${i}"]`)?.click();
            await delay(400);
            const input = document.querySelector(`[data-testid="select-bedtype-fixed-${brIdx}-${i}-queryinput"]`);
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, beds[i].type);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              await delay(400);
              Array.from(document.querySelectorAll(`[data-testid="select-bedtype-fixed-${brIdx}-${i}-options"] span`))
                .find(s => s.textContent.trim() === beds[i].type)?.closest('div').click();
              await delay(300);
            }
            const countInput = document.querySelector(`[data-testid="input-numberofbeds-fixed-${brIdx}-${i}"]`);
            if (countInput) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(countInput, beds[i].count);
              countInput.dispatchEvent(new Event('input', { bubbles: true }));
              countInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }, [brBeds, brIdx]);
      }
      await sleep(400);
    }
    // Remove any extra bedrooms beyond what's needed (e.g. accidentally added too many)
    const totalBedrooms = (await exec(tabId, () =>
      document.querySelectorAll('[data-testid^="radio-option-fixed-arrangement-"]').length
    ))?.[0]?.result || 0;
    for (let i = totalBedrooms; i > bedroomTexts.length; i--) {
      await exec(tabId, () => {
        const btns = Array.from(document.querySelectorAll('button'))
          .filter(b => b.textContent.trim() === 'Remove This Bedroom');
        btns[btns.length - 1]?.click();
      });
      await sleep(400);
    }
  } else {
    // Single Bedroom: click left-side radio, then set arrangement
    const hasOr = (room.bedText || '').toLowerCase().includes(' or ');
    await exec(tabId, () => document.querySelector('[data-testid="radio-option-single-bedroom"]')?.click());
    while (true) {
      const r = await exec(tabId, () => !!document.querySelector('[data-testid="radio-option-fixed-arrangement-0"]'));
      if (r?.[0]?.result) break;
      await sleep(150);
    }

    if (hasOr) {
      await exec(tabId, () => {
        const fixedInput = document.querySelector('[data-testid="radio-option-fixed-arrangement-0"]');
        const wrap = fixedInput?.parentElement?.parentElement?.parentElement?.parentElement;
        wrap?.querySelector('input[value="MULTIPLE"]')?.click();
      });
      while (true) {
        const r = await exec(tabId, () => !!document.querySelector('[data-testid="select-multiple-bed-arrangement-0-0"]'));
        if (r?.[0]?.result) break;
        await sleep(150);
      }
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
  }
  await sleep(500);

  await exec(tabId, () => document.querySelector('[data-testid="button-add-facilities"]')?.click());
  while (true) {
    const r = await exec(tabId, () => !!document.querySelector('[data-testid^="checkbox-facility-"]'));
    if (r?.[0]?.result) break;
    await sleep(150);
  }
  const facilityStr = (() => {
    const fromScan = (room.facilityStr || '').split(',').map(c => c.trim()).filter(Boolean);
    if (room.country === 'KR') {
      const kDefs = DEFAULT_FACILITIES_KR.split(',').map(c => c.trim());
      return [...new Set([...kDefs, ...fromScan])].join(', ');
    }
    return fromScan.length ? room.facilityStr : DEFAULT_FACILITIES;
  })();
  await exec(tabId, (codes) => {
    if (!codes) return;
    for (const code of codes.split(',').map(c => c.trim()).filter(Boolean)) {
      const cb = document.querySelector(`[data-testid="checkbox-facility-${code}"]`);
      if (cb && !cb.checked) cb.click();
    }
  }, [facilityStr]);
  await sleep(200);
  await exec(tabId, () => document.querySelector('[data-testid="button-modal-save"]')?.click());
  await sleep(200);
  await exec(tabId, () => document.querySelector('[data-testid="button-modal-save"]')?.click());
  while (true) {
    const r = await exec(tabId, () => !document.querySelector('[data-testid="button-modal-save"]'));
    if (r?.[0]?.result) break;
    await sleep(150);
  }

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-gender"]')?.click());
  while (true) {
    const r = await exec(tabId, () => document.querySelectorAll('[data-testid="select-rs-room-gender-options"] span').length);
    if ((r?.[0]?.result || 0) > 0) break;
    await sleep(150);
  }
  await exec(tabId, (name) => {
    const lower = name.toLowerCase();
    const target = (lower.includes('male only') || (lower.includes('male') && !lower.includes('female'))) ? 'Male Only'
      : lower.includes('female') ? 'Female Only' : 'All';
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-gender-options"] span'))
      .find(s => s.textContent.trim() === target)?.closest('div').click();
  }, [room.roomName || ""]);
  await sleep(300);

  await exec(tabId, () => document.querySelector('[data-testid="select-rs-room-smoking"]')?.click());
  while (true) {
    const r = await exec(tabId, () => document.querySelectorAll('[data-testid="select-rs-room-smoking-options"] span').length);
    if ((r?.[0]?.result || 0) > 0) break;
    await sleep(150);
  }
  await exec(tabId, (smoking) => {
    const target = smoking === 'YES' ? 'Smoking' : 'Non-Smoking';
    Array.from(document.querySelectorAll('[data-testid="select-rs-room-smoking-options"] span'))
      .find(s => s.textContent.trim() === target)?.closest('div').click();
  }, [room.smoking || 'NO']);
  await sleep(300);

  await exec(tabId, () => {
    const cb = document.querySelector('[data-testid="checkbox-rs-room-customizable-name"]');
    if (cb && !cb.checked) cb.click();
  });
  while (true) {
    const r = await exec(tabId, () => !!document.querySelector('[data-testid="input-rs-room-custom-name"]'));
    if (r?.[0]?.result) break;
    await sleep(150);
  }
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
  }, [room.maxAdults || room.occupancy || 2]);
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

  await exec(tabId, (amount) => {
    const input = document.querySelector('[data-testid="input-rs-room-rate-protection-amount"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (input.value) {
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setter.call(input, amount);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [getCountryDefaults(room.country).rateProtection]);
  await sleep(500);
}

// ── 사진 카테고리 자동 분류 + 적용 (mobilenet 라이브러리 우회, tf.loadLayersModel 직접 사용) ──
let _labelsCache = null;

async function classifyRoomPhotos(tabId) {
  // 1) tf.min.js가 이미 로드되어 있는지 확인 후, 없을 때만 주입 (중복 등록 방지)
  const tfLoaded = await exec(tabId, () => typeof window.tf !== 'undefined', [], "MAIN");
  if (!tfLoaded?.[0]?.result) {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      files: ["tf.min.js"]
    });
    await sleep(300);
  }

  // 2) 라벨 파일을 fetch해서 Tera 페이지로 전달 (extension 리소스 URL 사용, 첫 호출만 fetch)
  if (!_labelsCache) {
    const labelsRes = await fetch(chrome.runtime.getURL("imagenet_labels.json"));
    _labelsCache = await labelsRes.json();
  }
  const labels = _labelsCache;

  // 3) 모델 로드 + 각 이미지 분류 + 라벨 반환 (Tera 페이지 컨텍스트에서 실행)
  const result = await exec(tabId, async (labels) => {
    const BATHROOM_DIRECT  = ['bathtub', 'tub, vat', 'shower curtain', 'toilet seat', 'washbasin'];
    const BATHROOM_CONTEXT = ['soap dispenser', 'soap dish', 'plunger', 'bathrobe'];
    const BEDROOM_DIRECT   = ['four-poster', 'studio couch', 'day bed', 'crib, cot', 'cradle', 'bunk bed'];
    const BEDROOM_CONTEXT  = ['quilt', 'comforter', 'pillow', 'blanket', 'couch', 'wardrobe', 'chest of drawers', 'ottoman'];

    const mapTop15ToCategory = (top15) => {
      const scores = { Bathroom: 0, Bedroom: 0 };
      for (const [idx, score] of top15) {
        if (score < 0.030) continue;
        const lower = (labels[String(idx)] || '').toLowerCase();
        if      (BATHROOM_DIRECT.some(k => lower.includes(k)))  scores.Bathroom += score * 1.5;
        else if (BATHROOM_CONTEXT.some(k => lower.includes(k))) scores.Bathroom += score * 1.0;
        else if (BEDROOM_DIRECT.some(k => lower.includes(k)))   scores.Bedroom  += score * 1.5;
        else if (BEDROOM_CONTEXT.some(k => lower.includes(k)))  scores.Bedroom  += score * 1.0;
      }
      if (scores.Bathroom === 0 && scores.Bedroom === 0) return 'Others';
      if (scores.Bathroom > scores.Bedroom * 1.8) return 'Bathroom';
      if (scores.Bedroom > 0) return 'Bedroom';
      if (scores.Bathroom > 0.08) return 'Bathroom';
      return 'Others';
    };

    try {
      if (!window.__teraTfModel) {
        window.__teraTfModel = await tf.loadLayersModel(
          'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
        );
      }
      const model = window.__teraTfModel;

     const imgs = Array.from(document.querySelectorAll('img.css-fb1zjp'));
      console.log('[classify] 이미지 개수:', imgs.length);
      const results = [];

      const loadCleanImage = (src) => new Promise((resolve, reject) => {
        const cleanImg = new Image();
        cleanImg.crossOrigin = 'anonymous';
        cleanImg.onload = () => resolve(cleanImg);
        cleanImg.onerror = reject;
        cleanImg.src = src;
      });

      for (let i = 0; i < imgs.length; i++) {
        const srcUrl = imgs[i].src;
        try {
          // fetch로 이미지를 blob으로 받아서 object URL로 다시 로드 (오염 회피)
          const res = await fetch(srcUrl);
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const cleanImg = await loadCleanImage(objUrl);

          const prediction = tf.tidy(() => {
            let tensor = tf.browser.fromPixels(cleanImg)
              .resizeBilinear([224, 224])
              .toFloat();
            tensor = tensor.div(127.5).sub(1); // normalize to [-1, 1]
            tensor = tensor.expandDims(0);
            return model.predict(tensor);
          });
          const data = await prediction.data();
          prediction.dispose();
          URL.revokeObjectURL(objUrl);

          const top15 = Array.from(data).map((v, idx) => [idx, v]).sort((a,b) => b[1]-a[1]).slice(0, 15);
          const top5Labels = top15.slice(0, 5).map(([idx]) => labels[String(idx)] || '');
          console.log(`[classify] 사진 ${i}:`, top15.slice(0, 5).map(([idx, score]) => `${labels[String(idx)]} (${score.toFixed(3)})`));

          const category = mapTop15ToCategory(top15);
          console.log(`[classify] 사진 ${i} 최종:`, top5Labels[0], '-> score 결과:', category);
          results.push({ index: i, label: top5Labels[0], category });
        } catch (e) {
          console.log(`[classify] 사진 ${i} 에러:`, e.message);
          results.push({ index: i, label: '', category: 'Others' });
        }
      }

      // 첫/마지막 사진 보정: AI가 Others로 떨어졌고, 다른 사진 중에 해당 카테고리가 전혀 없을 때만 강제 지정
      if (results.length > 0) {
        const lastIdx = results.length - 1;

        const hasBedroomElsewhere = results.some((r, idx) => idx !== 0 && r.category === 'Bedroom');
        if (results[0].category === 'Others' && !hasBedroomElsewhere) {
          results[0].category = 'Bedroom';
          console.log('[classify] 첫 사진 보정 -> Bedroom');
        }

        const hasBathroomElsewhere = results.some((r, idx) => idx !== lastIdx && r.category === 'Bathroom');
        if (results[lastIdx].category === 'Others' && !hasBathroomElsewhere) {
          results[lastIdx].category = 'Bathroom';
          console.log('[classify] 마지막 사진 보정 -> Bathroom');
        }
      }

      return results;
    } catch (e) {
      console.log('[classify] error:', e.message);
      return [];
    }
  }, [labels], "MAIN");

  const classifications = result?.[0]?.result || [];

  // 4) 분류 결과대로 각 사진의 카테고리 드롭다운 클릭
  for (const { index, category } of classifications) {
    await exec(tabId, (idx) => {
      const dropdown = document.querySelector(`[data-testid="select-asset-category-${idx}"]`);
      dropdown?.click();
    }, [index], "MAIN");
    await sleep(500);

    await exec(tabId, (idx, cat) => {
      const options = document.querySelectorAll(`[data-testid="select-asset-category-${idx}-options"] span`);
      const found = Array.from(options).find(s => s.textContent.trim() === cat);
      found?.closest('div').click();
    }, [index, category], "MAIN");
    await sleep(400);

    await exec(tabId, () => document.body.click(), [], "MAIN");
    await sleep(200);
  }

  return classifications;
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
  if (d.breakfast_price && d.breakfast_price !== "-") {
    push("Breakfast", setInput("hotel,hotelProperties,breakfastCharge", d.breakfast_price));
  } else {
    const brkInput = document.querySelector('input[name="hotel,hotelProperties,breakfastCharge"]');
    if (brkInput) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(brkInput, "");
      brkInput.dispatchEvent(new Event('input', { bubbles: true }));
      brkInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  const atVal = d.airport_transfer === "Yes" ? "true" : "false";
  push("Airport Transfer", clickRadio("hotel,hotelProperties,isAvailableAirportTransfer", atVal));
  if (atVal === "true" && d.airport_transfer_fee && d.airport_transfer_fee !== "-") {
    const feeVal = /free/i.test(d.airport_transfer_fee) ? "0" : d.airport_transfer_fee;
    push("Transfer Fee", setInput("hotel,hotelProperties,airportTransferFee", feeVal));
  }

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
  } else {
    const noRadio = document.querySelector('input[type="radio"][value="no"]');
    if (noRadio) {
      noRadio.click();
      noRadio.dispatchEvent(new Event('change', { bubbles: true }));
      results.push({ field: "Local Address No", status: "ok" });
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
async function dismissLeaveModalIfPresent(tabId) {
  const r = await exec(tabId, () => {
    const btn = Array.from(document.querySelectorAll('button span')).find(el => el.textContent.trim().includes('Yes, move'));
    if (btn) { btn.closest('button').click(); return true; }
    return false;
  });
  if (r?.[0]?.result) await sleep(1000);
  return r?.[0]?.result || false;
}

async function clickSidebarTab(tabId, tabName) {
  await exec(tabId, (name) => {
    Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === name)?.click();
  }, [tabName]);
  await sleep(300);
  // 탭 전환 직후 "저장 안 한 변경사항" 모달이 뜨면 처리
  await dismissLeaveModalIfPresent(tabId);
}

async function runHotelAutofill(tabId) {
  setExtractStatus(t().hotelAutofillDetails);
  try {
    const results = await exec(tabId, hotelDetailsScript, [currentHotelData]);
    const res = results?.[0]?.result || [];
    if (res.find(r => r.field === "Reload")) { setExtractStatus(t().hotelAutofillReload, "error"); return; }
    // React 상태 처리 후 저장 버튼 재클릭, 저장 완료까지 충분히 대기
    await sleep(800);
    await exec(tabId, () => document.querySelector('button.c-btn--variant-orange span')?.closest('button').click());
    await sleep(4000);
    await dismissLeaveModalIfPresent(tabId);

    // Facilities 탭
    if (currentHotelData._tripFacilities?.length > 0) {
      setExtractStatus(t().hotelAutofillFacilities);
      await clickSidebarTab(tabId, "Facilities");
      await sleep(1500);
      const teraValues = getTeraFacilities(currentHotelData._tripFacilities);
      await exec(tabId, hotelFacilitiesScript, [teraValues]);
      await sleep(2500);
      await dismissLeaveModalIfPresent(tabId);
    }

    // Overview 탭
    setExtractStatus(t().hotelAutofillOverview);
    await clickSidebarTab(tabId, "Overview");
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
    await sleep(2500);
    await dismissLeaveModalIfPresent(tabId);

    // Address 탭
    setExtractStatus(t().hotelAutofillAddress);
    await clickSidebarTab(tabId, "Address");

    for (let i = 0; i < 6; i++) {
      await sleep(500);
      const moved = await dismissLeaveModalIfPresent(tabId);
      if (moved) break;
    }

    await sleep(1500);
    await exec(tabId, hotelAddressScript, [currentHotelData]);
    await sleep(1000);
    await dismissLeaveModalIfPresent(tabId);
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

// Room Scan (방 목록만 추출, ZIP 생성 없음)
document.getElementById("startBtn").addEventListener("click", async () => {
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  roomData = [];
  setTeraStatus("");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isAgoda = tab.url?.includes("agoda.com");
    const isTrip = tab.url?.includes("trip.com/hotels");
    const isBooking = tab.url?.includes("booking.com");
    const isAirbnb = tab.url?.includes("airbnb.com");
    if (!isTrip && !isAgoda && !isBooking && !isAirbnb) {
      setStatus(t().notTripPage, "error");
      btn.disabled = false;
      return;
    }

    setStatus(t().scan1);
    const result = isAgoda ? await scanAgodaTab(tab.id)
      : isBooking ? await scanBookingTab(tab.id)
      : isAirbnb ? await scanAirbnbTab(tab.id)
      : await scanTab(tab.id);
    if (!result) { btn.disabled = false; return; }
    if (result.hotelName) document.getElementById("hotelName").value = result.hotelName;
    const allRooms = new Map();
    (result.rooms || []).forEach(r => { if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r); });

    let finalRooms = [...allRooms.values()];
    if (finalRooms.length === 0) { setStatus(t().noRooms, "error"); btn.disabled = false; return; }

    if (isAgoda) finalRooms = await processBedGroups(finalRooms);

    roomData = finalRooms;
    hotelPhotos = result.hotelPhotos || [];
    chrome.storage.session.set({ roomData: finalRooms, hotelPhotos });
    setStatus(t().scan1done(finalRooms.length), "success");

    const roomList = document.getElementById("roomList");
    roomList.innerHTML = `<div class="room-item"><label class="room-check-all"><input type="checkbox" id="checkAll" checked> All</label></div>`;
    finalRooms.forEach((room, i) => {
      // Parse bedrooms from bedText (" || " separates bedrooms)
      const parseBedroomText = (text) => {
        const hasOr = (text || '').includes(' or ');
        const beds = (text || '').split(hasOr ? / or /i : /\s+and\s+/i).map(part => {
          const m = part.trim().match(/^(\d+)\s+(.+?)\s+beds?/i);
          if (!m) return null;
          const type = BED_TYPES.find(t => t.toLowerCase() === m[2].trim().toLowerCase()) || 'Double';
          return { count: parseInt(m[1]) || 1, type };
        }).filter(Boolean);
        return { isMultiple: hasOr, beds: beds.length ? beds : [{ count: 1, type: 'Double' }] };
      };

      const hasMultipleBedrooms = (room.bedText || '').includes(' || ');
      let isMultipleBedrooms = hasMultipleBedrooms;
      const editBedrooms = (hasMultipleBedrooms
        ? (room.bedText || '').split(' || ')
        : [room.bedText || '']
      ).map(parseBedroomText);

      const initSize = room.sizeText?.match(/[\d.]+/)?.[0] || '';

      const entry = document.createElement("div");
      entry.className = "room-entry";
      entry.innerHTML = `
        <div class="room-item">
          <input type="checkbox" class="room-cb" data-index="${i}" checked>
          <span class="room-name-label" style="flex:1"></span>
          <button class="room-edit-btn" type="button" title="Edit">✎</button>
        </div>
        <div class="room-edit-panel">
          <div class="room-edit-field"><span class="room-edit-label">Name</span><input class="room-edit-input" data-field="roomName"></div>
          <div class="room-edit-field" style="align-items:flex-start">
            <span class="room-edit-label" style="padding-top:5px">Bed</span>
            <div style="flex:1">
              <div style="display:flex;gap:4px;margin-bottom:8px">
                <button class="bed-mode-btn${!isMultipleBedrooms ? ' active' : ''}" data-mode="single" type="button">Single Bedroom</button>
                <button class="bed-mode-btn${isMultipleBedrooms ? ' active' : ''}" data-mode="multi-bedroom" type="button">Multiple Bedrooms</button>
              </div>
              <div class="bedrooms-wrap"></div>
            </div>
          </div>
          <div class="room-edit-field">
            <span class="room-edit-label">Size</span>
            <input class="room-edit-input" data-field="sizeText" style="flex:1">
            <span class="bed-unit-label" style="margin-left:4px">m²</span>
          </div>
          <div class="room-edit-field"><span class="room-edit-label">Adults</span><input class="room-edit-input" type="number" min="1" max="10" data-field="maxAdults"></div>
        </div>`;

      entry.querySelector('.room-name-label').textContent = room.roomName || '';
      entry.querySelector('[data-field="roomName"]').value = room.roomName || '';
      entry.querySelector('[data-field="sizeText"]').value = initSize;
      entry.querySelector('[data-field="maxAdults"]').value = room.maxAdults || 2;

      const bedroomsWrap = entry.querySelector('.bedrooms-wrap');

      const syncBeds = () => {
        const encoded = editBedrooms.map(br =>
          br.beds.map(b => `${b.count} ${b.type} bed`).join(br.isMultiple ? ' or ' : ' and ')
        );
        roomData[i].bedText = isMultipleBedrooms ? encoded.join(' || ') : encoded[0];
        chrome.storage.session.set({ roomData });
      };

      const renderBedRows = (br, wrap) => {
        wrap.innerHTML = '';
        br.beds.forEach((bed, bi) => {
          const row = document.createElement('div');
          row.className = 'bed-row';
          row.innerHTML = `
            <div class="bed-count-row">
              <input class="room-edit-input bed-count-input" type="number" min="1" max="10" value="${bed.count}">
              <span class="bed-unit-label">bed(s)</span>
              ${br.beds.length > 1 ? `<button class="bed-remove-btn" type="button">×</button>` : ''}
            </div>
            <div class="bed-type-grid">
              ${BED_TYPES.map(t => `<button class="bed-type-btn${bed.type === t ? ' active' : ''}" type="button" data-type="${t}">${t}</button>`).join('')}
            </div>`;
          row.querySelector('.bed-count-input').addEventListener('change', (e) => {
            br.beds[bi].count = parseInt(e.target.value) || 1; syncBeds();
          });
          row.querySelectorAll('.bed-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              br.beds[bi].type = btn.dataset.type;
              row.querySelectorAll('.bed-type-btn').forEach(b => b.classList.toggle('active', b === btn));
              syncBeds();
            });
          });
          if (br.beds.length > 1) {
            row.querySelector('.bed-remove-btn').addEventListener('click', (e) => {
              e.stopPropagation(); br.beds.splice(bi, 1); renderBedRows(br, wrap); syncBeds();
            });
          }
          wrap.appendChild(row);
        });
        if (!(br.isMultiple && br.beds.length >= 2)) {
          const addBtn = document.createElement('button');
          addBtn.type = 'button'; addBtn.className = 'bed-add-btn';
          addBtn.textContent = '+ Add bed type';
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation(); br.beds.push({ count: 1, type: 'Double' }); renderBedRows(br, wrap); syncBeds();
          });
          wrap.appendChild(addBtn);
        }
      };

      const renderBedroom = (br, idx) => {
        const sec = document.createElement('div');
        sec.className = 'bedroom-section';
        sec.innerHTML = `
          ${isMultipleBedrooms ? `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <span class="bedroom-label">Bedroom ${idx + 1}</span>
            ${editBedrooms.length > 1 ? `<button class="bedroom-remove-btn" type="button">×</button>` : ''}
          </div>` : ''}
          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px">
            <button class="bed-mode-btn${!br.isMultiple ? ' active' : ''}" data-mode="fixed" type="button">Fixed Bed Arrangement</button>
            <button class="bed-mode-btn${br.isMultiple ? ' active' : ''}" data-mode="multiple" type="button">Multiple Bed Arrangement</button>
          </div>
          <div class="bed-edit-wrap"></div>`;
        sec.querySelectorAll('.bed-mode-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            br.isMultiple = btn.dataset.mode === 'multiple';
            sec.querySelectorAll('.bed-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
            syncBeds();
          });
        });
        if (isMultipleBedrooms && editBedrooms.length > 1) {
          sec.querySelector('.bedroom-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); editBedrooms.splice(idx, 1); renderAllBedrooms(); syncBeds();
          });
        }
        renderBedRows(br, sec.querySelector('.bed-edit-wrap'));
        return sec;
      };

      const renderAllBedrooms = () => {
        bedroomsWrap.innerHTML = '';
        if (!isMultipleBedrooms) {
          const br = editBedrooms[0];
          const arrangCol = document.createElement('div');
          arrangCol.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:8px';
          arrangCol.innerHTML = `
            <button class="bed-mode-btn${!br.isMultiple ? ' active' : ''}" data-mode="fixed" type="button">Fixed Bed Arrangement</button>
            <button class="bed-mode-btn${br.isMultiple ? ' active' : ''}" data-mode="multiple" type="button">Multiple Bed Arrangement</button>`;
          bedroomsWrap.appendChild(arrangCol);
          const bedEditWrap = document.createElement('div');
          bedroomsWrap.appendChild(bedEditWrap);
          renderBedRows(br, bedEditWrap);
          arrangCol.querySelectorAll('.bed-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              br.isMultiple = btn.dataset.mode === 'multiple';
              arrangCol.querySelectorAll('.bed-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
              renderBedRows(br, bedEditWrap);
              syncBeds();
            });
          });
        } else {
          editBedrooms.forEach((br, idx) => bedroomsWrap.appendChild(renderBedroom(br, idx)));
          const addBr = document.createElement('button');
          addBr.type = 'button'; addBr.className = 'bed-add-btn';
          addBr.textContent = '+ Add bedroom';
          addBr.addEventListener('click', (e) => {
            e.stopPropagation();
            editBedrooms.push({ isMultiple: false, beds: [{ count: 1, type: 'Double' }] });
            renderAllBedrooms(); syncBeds();
          });
          bedroomsWrap.appendChild(addBr);
        }
      };

      entry.querySelectorAll('.bed-mode-btn[data-mode="single"], .bed-mode-btn[data-mode="multi-bedroom"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          isMultipleBedrooms = btn.dataset.mode === 'multi-bedroom';
          entry.querySelectorAll('.bed-mode-btn[data-mode="single"], .bed-mode-btn[data-mode="multi-bedroom"]').forEach(b => b.classList.toggle('active', b === btn));
          if (isMultipleBedrooms && editBedrooms.length === 1) {
            editBedrooms.push({ isMultiple: false, beds: [{ count: 1, type: 'Double' }] });
          }
          renderAllBedrooms(); syncBeds();
        });
      });

      renderAllBedrooms();

      entry.querySelector('[data-field="roomName"]').addEventListener('change', (e) => {
        roomData[i].roomName = e.target.value;
        entry.querySelector('.room-name-label').textContent = e.target.value;
        chrome.storage.session.set({ roomData });
      });
      entry.querySelector('[data-field="sizeText"]').addEventListener('change', (e) => {
        roomData[i].sizeText = e.target.value;
        chrome.storage.session.set({ roomData });
      });
      entry.querySelector('[data-field="maxAdults"]').addEventListener('change', (e) => {
        const val = parseInt(e.target.value) || 2;
        roomData[i].maxAdults = val;
        roomData[i].occupancy = val + ' adults';
        chrome.storage.session.set({ roomData });
      });
      entry.querySelector('.room-name-label').addEventListener('click', () => {
        entry.querySelector('.room-cb').checked = !entry.querySelector('.room-cb').checked;
      });
      entry.querySelector('.room-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        entry.querySelector('.room-edit-panel').classList.toggle('open');
      });

      roomList.appendChild(entry);
    });
    document.getElementById("checkAll").addEventListener("change", (e) => {
      document.querySelectorAll(".room-cb").forEach(cb => cb.checked = e.target.checked);
    });
    fillClickCount = 0;
    roomList.style.display = "block";
    document.getElementById("selectFillBtn").style.display = "block";
    document.getElementById("photoZipBtn").style.display = "block";
    document.getElementById("hotelPhotoBtn").style.display = "block";
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
  openOrFocusSheet();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isAgodaExtract = tab.url?.includes("agoda.com");
    const isTripExtract  = tab.url?.includes("trip.com");
    const isBookingExtract = tab.url?.includes("booking.com");
    const isAirbnbExtract = tab.url?.includes("airbnb.com");
    if (!isTripExtract && !isAgodaExtract && !isBookingExtract && !isAirbnbExtract) { setExtractStatus(t().extractNotTrip, "error"); return; }

    if (isBookingExtract) {
      const bookingRes = await exec(tab.id, (personName) => {
        const HOTEL_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz-8HSlpjcpIKqNtpjt2GwJlNFtBoeBOrX7ubNMBsvVDU7p2nDEuZUHAL-98jHn7cpq8A/exec";
        // "Guests are asking" FAQ 위젯은 실제 보유 여부와 무관하게 모든 호텔에 같은 질문 템플릿("Is there an airport shuttle service?" 등)을
        // 보여줘서 아래 키워드 매칭에 오탐을 일으키므로 검사 대상 텍스트에서 제외
        const rawText = document.body?.innerText || "";
        const faqText = document.querySelector('[data-testid="ask-questions-entry-desktop-wrapper"]')?.innerText || "";
        const text = faqText ? rawText.split(faqText).join(" ") : rawText;
        const hotelName = document.querySelector('#hp_hotel_name')?.innerText?.trim()
          || document.querySelector('h2[data-testid="header-title"]')?.innerText?.trim()
          || document.querySelector('h1')?.innerText?.trim() || '';

        // Check-in/out from page text (booking.com은 12시간제 AM/PM 표기가 많아 24시간제로 변환)
        const to24h = (hhmm, ampm) => {
          if (!ampm) return hhmm;
          let [h, mi] = hhmm.split(':').map(Number);
          const isPM = /pm/i.test(ampm);
          if (isPM && h !== 12) h += 12;
          if (!isPM && h === 12) h = 0;
          return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
        };
        let checkIn = '14:00', checkOut = '12:00';
        let m = text.match(/check.?in[:\s]*(?:from\s*)?(\d{1,2}:\d{2})\s*(am|pm)?/i);
        if (m) checkIn = to24h(m[1], m[2]);
        m = text.match(/check.?out[:\s]*(?:until\s*|before\s*)?(\d{1,2}:\d{2})\s*(am|pm)?/i);
        if (m) checkOut = to24h(m[1], m[2]);

        // JSON-LD (Schema.org) - address, GPS, star rating
        let address = '', lat = '', lng = '', starRating = '0';
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          try {
            const json = JSON.parse(s.textContent);
            const candidates = json['@graph'] || (Array.isArray(json) ? json : [json]);
            const hotel = candidates.find(j => /hotel|lodging/i.test(j['@type'] || ''));
            if (hotel) {
              if (hotel.geo?.latitude) { lat = parseFloat(hotel.geo.latitude).toFixed(4); lng = parseFloat(hotel.geo.longitude).toFixed(4); }
              if (hotel.address) {
                const a = hotel.address;
                if (typeof a === 'string') {
                  address = a;
                } else {
                  const street = (a.streetAddress || '').replace(/\s*\(.*?\)/g, '').trim();
                  address = [a.addressRegion, a.addressLocality, street].filter(Boolean).join(', ');
                }
              }
              if (hotel.starRating?.ratingValue) starRating = String(Math.floor(hotel.starRating.ratingValue));
              break;
            }
          } catch(e) {}
        }
        if (!address) {
          const addrEl = document.querySelector('[data-testid="address"], .hp_address_subtitle');
          address = (addrEl?.innerText?.trim() || '').replace(/\n/g, ', ');
        }

        // booking.com JSON-LD엔 geo/starRating이 없어 별도 소스에서 보강
        if (!lat) {
          for (const s of document.querySelectorAll('script:not([src])')) {
            const c = s.textContent;
            const latM = c.match(/b_map_center_latitude\s*=\s*([\d.-]+)/);
            const lngM = c.match(/b_map_center_longitude\s*=\s*([\d.-]+)/);
            if (latM && lngM) { lat = parseFloat(latM[1]).toFixed(4); lng = parseFloat(lngM[1]).toFixed(4); break; }
          }
        }
        if (starRating === '0') {
          const starEl = document.querySelector('[data-testid="quality-rating"], [data-testid="rating-stars"]');
          const starM = starEl?.getAttribute('aria-label')?.match(/(\d+(?:\.\d+)?)\s*out of\s*5\s*stars?/i);
          if (starM) starRating = String(Math.floor(parseFloat(starM[1])));
        }

        // Currency: booking.com의 가격 표시(.bui-price-display__value)는 세션/계정 통화 설정을 따라가서
        // (예: 마카오 호텔인데 로그인 통화가 KRW면 "KRW ..."로 표시됨) 호텔 실제 소재국 기준으로 우선 판정
        const a = address.toLowerCase();
        const currencyMap = [["japan","JPY"],["hong kong","HKD"],["thailand","THB"],["indonesia","IDR"],["singapore","SGD"],["malaysia","MYR"],["vietnam","VND"],["philippines","PHP"],["taiwan","TWD"],["china","CNY"],["australia","AUD"],["india","INR"],["united arab emirates|uae","AED"],["saudi","SAR"],["new zealand","NZD"],["fiji","FJD"],["macau|macao","MOP"]];
        let currency = '';
        for (const [re, cur] of currencyMap) { if (new RegExp(re).test(a)) { currency = cur; break; } }
        if (!currency) {
          const priceCodeM = document.querySelector('.bui-price-display__value')?.textContent?.trim().match(/^([A-Z]{3})\b/);
          if (priceCodeM) {
            currency = priceCodeM[1];
          } else {
            const symbolMap = [['NT$','TWD'],['HK$','HKD'],['S$','SGD'],['RM','MYR'],['Rp','IDR'],['₱','PHP'],['₫','VND'],['฿','THB'],['¥','JPY'],['₩','KRW']];
            currency = 'KRW';
            for (const [sym, cur] of symbolMap) { if (text.includes(sym)) { currency = cur; break; } }
          }
        }

        // Accommodation type
        const n = hotelName.toLowerCase();
        let accommodationType = 'HOTEL';
        if (/resort/.test(n)) accommodationType = 'RESORT';
        else if (/hostel|backpacker/.test(n)) accommodationType = 'HOSTEL_BACKPACKER_ACCOMMODATION';
        else if (/villa/.test(n)) accommodationType = 'VILLA';
        else if (/apartment|apart/.test(n)) accommodationType = 'APARTMENT';
        else if (/capsule/.test(n)) accommodationType = 'CAPSULE_HOTEL';
        else if (/guesthouse|guest house/.test(n)) accommodationType = 'GUESTHOUSE';

        // Hotel Bulk Insert - hotel-level facility codes only
        const fmap = [
          {keywords:['24-hour front desk','front desk [24-hour]','24 hour front desk'],code:'HAS_24_HOUR_FRONT_DESK'},
          {keywords:['wi-fi in public','wi-fi in all rooms','free wi-fi','wi-fi [free]','wifi in public'],code:'WIFI_PUBLIC_AREA'},
          {keywords:['car park','parking'],code:'CARPARK'},
          {keywords:['room service'],code:'ROOM_SERVICE'},
          {keywords:['laundry service','laundromat'],code:'LAUNDRY_SERVICE'},
          {keywords:['air conditioning'],code:'AIR_CONDITIONING'},
          {keywords:['restaurant'],code:'RESTAURANT'},
          {keywords:['shower'],code:'SHOWER'},
          {keywords:['television','cable tv','lcd tv'],code:'TELEVISION'},
          {keywords:['safety deposit'],code:'SAFETY_DEPOSIT_BOX'},
          {keywords:['atm','banking','cash machine'],code:'ATM_OR_BANKING'},
          {keywords:['non-smoking rooms','non-smoking','smoke-free'],code:'NON_SMOKING_ROOM'},
          {keywords:['luggage storage'],code:'LUGGAGE_STORAGE'},
          {keywords:['outdoor pool','swimming pool'],code:'OUTDOOR_POOL'},
          {keywords:['smoking area'],code:'SMOKING_AREA'},
          {keywords:['desk'],code:'DESK'},
          {keywords:['car hire','car rental'],code:'CAR_HIRE'},
          {keywords:['cable tv','cable television'],code:'CABLE_TV'},
          {keywords:['shop'],code:'SHOPS'},
          {keywords:['meeting','banquet','seminar','conference'],code:'MEETING_FACILITIES'},
        ];
        const ft = text.toLowerCase();
        const hotelFacilities = fmap.filter(f => f.keywords.some(k => ft.includes(k))).map(f => f.code).join(', ');

        fetch(HOTEL_WEB_APP_URL, {
          method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ type: 'hotel', hotelName, address, latitude: lat, longitude: lng, starRating, checkIn, checkOut, currency, accommodationType, hotelFacilities, personName })
        });
        return hotelName;
      }, [selectedPerson || 'Others'], 'MAIN');

      const bookingHotelName = bookingRes?.[0]?.result;
      if (!bookingHotelName) { setExtractStatus('booking.com 페이지를 새로고침 후 다시 시도해주세요.', "error"); return; }

      setExtractStatus(t().extractDone(bookingHotelName), "success");
      await openOrFocusTab("https://docs.google.com/spreadsheets/d/1ETcFuTHjFJpxZL9KwTcxMrJd1E_X5iWXdbe4LzBQxmA/*", HOTEL_SHEET_URL);
      return;
    }

    if (isAirbnbExtract) {
      // TODO: Airbnb Hotel Bulk Insert 구현
      setExtractStatus(currentLang === 'kr' ? 'Airbnb Hotel Bulk Insert는 아직 구현되지 않았습니다.' : 'Airbnb Hotel Bulk Insert is not implemented yet.', "error");
      return;
    }

    if (isAgodaExtract) {
      const agodaRes = await exec(tab.id, () => window.__teraAgodaRooms, [], "MAIN");
      const agoda = agodaRes?.[0]?.result;
      if (!agoda?.propertyName) { setExtractStatus('Agoda 페이지를 새로고침 후 다시 시도해주세요.', "error"); return; }

      await exec(tab.id, (personName) => {
        const HOTEL_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz-8HSlpjcpIKqNtpjt2GwJlNFtBoeBOrX7ubNMBsvVDU7p2nDEuZUHAL-98jHn7cpq8A/exec";
        const agoda = window.__teraAgodaRooms;
        const text = document.body?.innerText || "";

        const hotelName = agoda?.propertyName || document.querySelector('h1')?.innerText?.trim() || '';

        // Check-in/out from benefits in room-grid
        let checkIn = '14:00', checkOut = '12:00';
        outer: for (const room of (agoda?.rooms || [])) {
          for (const offer of (room.offers || [])) {
            for (const b of (offer.benefits || [])) {
              const cin = b.text?.match(/Check-in\s+(\d{1,2}:\d{2})/i);
              const cout = b.text?.match(/Check-out\s+(\d{1,2}:\d{2})/i);
              if (cin) checkIn = cin[1];
              if (cout) checkOut = cout[1];
              if (cin || cout) break outer;
            }
          }
        }
        // fallback: DOM text
        if (checkIn === '14:00') { const m = text.match(/check.?in[:\s]+(\d{1,2}:\d{2})/i); if (m) checkIn = m[1]; }
        if (checkOut === '12:00') { const m = text.match(/check.?out[:\s]+(\d{1,2}:\d{2})/i); if (m) checkOut = m[1]; }

        // Currency from price text symbol
        const priceText = agoda?.rooms?.[0]?.offers?.[0]?.price?.final?.text || '';
        const symbolMap = [['NT$','TWD'],['HK$','HKD'],['S$','SGD'],['RM','MYR'],['Rp','IDR'],['₱','PHP'],['₫','VND'],['฿','THB'],['¥','JPY'],['₩','KRW']];
        let currency = 'KRW';
        for (const [sym, cur] of symbolMap) { if (priceText.includes(sym)) { currency = cur; break; } }

        // Address
        // JSON-LD (Schema.org) - most reliable source for address, GPS, stars
        let address = '', lat = '', lng = '', starRating = '0';
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          try {
            const json = JSON.parse(s.textContent);
            // Agoda wraps everything in @graph array
            const candidates = json['@graph'] || (Array.isArray(json) ? json : [json]);
            const hotel = candidates.find(j => /hotel|lodging/i.test(j['@type'] || ''));
            if (hotel) {
              if (hotel.geo?.latitude) { lat = parseFloat(hotel.geo.latitude).toFixed(4); lng = parseFloat(hotel.geo.longitude).toFixed(4); }
              if (!lat && hotel.hasMap) {
                const m = hotel.hasMap.match(/center=([\d.-]+)[,%2c]+([\d.-]+)/i);
                if (m) { lat = parseFloat(m[1]).toFixed(4); lng = parseFloat(m[2]).toFixed(4); }
              }
              if (hotel.address) {
                const a = hotel.address;
                if (typeof a === 'string') {
                  address = a;
                } else {
                  const street = (a.streetAddress || '').replace(/\s*\(.*?\)/g, '').trim();
                  address = [a.addressRegion, a.addressLocality, street].filter(Boolean).join(', ');
                }
              }
              if (hotel.starRating?.ratingValue) starRating = String(Math.floor(hotel.starRating.ratingValue));
              break;
            }
          } catch(e) {}
        }
        // fallback GPS: inline script JSON
        if (!lat) {
          for (const s of document.querySelectorAll('script:not([src])')) {
            const c = s.textContent.match(/"latitude"\s*:\s*([\d.-]+)[^}]{1,200}"longitude"\s*:\s*([\d.-]+)/);
            if (c) { lat = parseFloat(c[1]).toFixed(4); lng = parseFloat(c[2]).toFixed(4); break; }
          }
        }
        // fallback address: DOM
        if (!address) {
          const addrEl = document.querySelector('[data-selenium="hotel-address"], [data-element-name="hotel-header-location"]');
          address = (addrEl?.innerText?.trim() || '').replace(/\n/g, ', ');
        }
        // fallback star: "3.5 stars out of 5" in page text
        if (starRating === '0') {
          const m = text.match(/(\d+\.?\d*)\s*stars?\s*out\s*of\s*5/i);
          if (m) starRating = String(Math.floor(parseFloat(m[1])));
        }

        // Accommodation type
        const n = hotelName.toLowerCase();
        let accommodationType = 'HOTEL';
        if (/resort/.test(n)) accommodationType = 'RESORT';
        else if (/hostel|backpacker/.test(n)) accommodationType = 'HOSTEL_BACKPACKER_ACCOMMODATION';
        else if (/villa/.test(n)) accommodationType = 'VILLA';
        else if (/apartment|apart/.test(n)) accommodationType = 'APARTMENT';
        else if (/capsule/.test(n)) accommodationType = 'CAPSULE_HOTEL';
        else if (/guesthouse|guest house/.test(n)) accommodationType = 'GUESTHOUSE';

        // Hotel Bulk Insert - hotel-level facility codes only
        const fmap = [
          {keywords:['24-hour front desk','front desk [24-hour]','24 hour front desk'],code:'HAS_24_HOUR_FRONT_DESK'},
          {keywords:['wi-fi in public','wi-fi in all rooms','free wi-fi','wi-fi [free]','wifi in public'],code:'WIFI_PUBLIC_AREA'},
          {keywords:['car park','parking'],code:'CARPARK'},
          {keywords:['room service'],code:'ROOM_SERVICE'},
          {keywords:['laundry service','laundromat'],code:'LAUNDRY_SERVICE'},
          {keywords:['air conditioning'],code:'AIR_CONDITIONING'},
          {keywords:['restaurant'],code:'RESTAURANT'},
          {keywords:['shower'],code:'SHOWER'},
          {keywords:['television','cable tv','lcd tv'],code:'TELEVISION'},
          {keywords:['safety deposit'],code:'SAFETY_DEPOSIT_BOX'},
          {keywords:['atm','banking','cash machine'],code:'ATM_OR_BANKING'},
          {keywords:['non-smoking rooms','non-smoking','smoke-free'],code:'NON_SMOKING_ROOM'},
          {keywords:['luggage storage'],code:'LUGGAGE_STORAGE'},
          {keywords:['outdoor pool','swimming pool'],code:'OUTDOOR_POOL'},
          {keywords:['smoking area'],code:'SMOKING_AREA'},
          {keywords:['desk'],code:'DESK'},
          {keywords:['car hire','car rental'],code:'CAR_HIRE'},
          {keywords:['cable tv','cable television'],code:'CABLE_TV'},
          {keywords:['shop'],code:'SHOPS'},
          {keywords:['meeting','banquet','seminar','conference'],code:'MEETING_FACILITIES'},
        ];
        const ft = text.toLowerCase();
        const hotelFacilities = fmap.filter(f => f.keywords.some(k => ft.includes(k))).map(f => f.code).join(', ');

        fetch(HOTEL_WEB_APP_URL, {
          method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ type: 'hotel', hotelName, address, latitude: lat, longitude: lng, starRating, checkIn, checkOut, currency, accommodationType, hotelFacilities, personName })
        });
      }, [selectedPerson || 'Others'], 'MAIN');

      setExtractStatus(t().extractDone(agoda.propertyName), "success");
      await openOrFocusTab("https://docs.google.com/spreadsheets/d/1ETcFuTHjFJpxZL9KwTcxMrJd1E_X5iWXdbe4LzBQxmA/*", HOTEL_SHEET_URL);
      return;
    }

    const results = await exec(tab.id, extractScript);
    const data = results?.[0]?.result;
    if (!data) { setExtractStatus(t().extractFail, "error"); return; }

    const locale = COUNTRY_LOCALE_MAP[data._countryRaw] || "en-XX";
    const apiData = await fetchLocalData(data._hotelId, locale);
    await processApiData(data, apiData);

    currentHotelData = data;
    renderHotelPreview(data);
    setExtractStatus(t().extractDone(data.name_en || (currentLang === 'kr' ? '호텔' : 'Hotel')), "success");

    // Sheet 전송
       await exec(tab.id, (d, personName) => {
      const HOTEL_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz-8HSlpjcpIKqNtpjt2GwJlNFtBoeBOrX7ubNMBsvVDU7p2nDEuZUHAL-98jHn7cpq8A/exec";
      const hotelFacilityMap = [
        {keywords:["24-hour front desk","front desk [24-hour]","24 hour front desk"],code:"HAS_24_HOUR_FRONT_DESK"},
        {keywords:["wi-fi in public areas","free wi-fi","wi-fi in all rooms","wifi in public"],code:"WIFI_PUBLIC_AREA"},
        {keywords:["car park","parking"],code:"CARPARK"},
        {keywords:["room service"],code:"ROOM_SERVICE"},
        {keywords:["laundry service","laundromat"],code:"LAUNDRY_SERVICE"},
        {keywords:["air conditioning"],code:"AIR_CONDITIONING"},
        {keywords:["restaurant"],code:"RESTAURANT"},
        {keywords:["shower"],code:"SHOWER"},
        {keywords:["television","cable tv","lcd tv"],code:"TELEVISION"},
        {keywords:["safety deposit"],code:"SAFETY_DEPOSIT_BOX"},
        {keywords:["atm","banking","cash machine"],code:"ATM_OR_BANKING"},
        {keywords:["non-smoking rooms","non-smoking","smoke-free"],code:"NON_SMOKING_ROOM"},
        {keywords:["luggage storage"],code:"LUGGAGE_STORAGE"},
        {keywords:["outdoor pool","swimming pool"],code:"OUTDOOR_POOL"},
        {keywords:["smoking area"],code:"SMOKING_AREA"},
        {keywords:["desk"],code:"DESK"},
        {keywords:["car hire","car rental"],code:"CAR_HIRE"},
        {keywords:["cable tv","cable television"],code:"CABLE_TV"},
        {keywords:["shop"],code:"SHOPS"},
        {keywords:["meeting","banquet","seminar","conference"],code:"MEETING_FACILITIES"},
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
        body: JSON.stringify({ type: "hotel", hotelName, address, latitude: lat, longitude: lng, starRating, checkIn, checkOut, currency, accommodationType, hotelFacilities, personName })
      });
    }, [currentHotelData, selectedPerson || "Others"], "MAIN");

    await openOrFocusTab("https://docs.google.com/spreadsheets/d/1ETcFuTHjFJpxZL9KwTcxMrJd1E_X5iWXdbe4LzBQxmA/*", HOTEL_SHEET_URL);

  } catch (e) {
    setExtractStatus("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
  }
});

// ── Agoda Hotel Detail Extract (runs in page MAIN world) ──
const agodaExtractForDetail = async () => {
  const agoda = window.__teraAgodaRooms;

  // "Some helpful facts" + BelowFold API 모두 lazy-load → 스크롤로 트리거 후 대기
  window.scrollTo(0, Math.min(2500, document.body.scrollHeight / 2));
  await new Promise(r => setTimeout(r, 1200));
  window.scrollTo(0, 0);

  // BelowFold: 인터셉트된 것 우선, 없으면 hotel_id로 직접 fetch
  let belowFold = window.__teraAgodaBelowFold;
  if (!belowFold) {
    const idM = window.location.href.match(/\/(\d{5,8})\.html/)
      || window.location.search.match(/[?&]hotel_id=(\d+)/i);
    const hotelId = idM?.[1];
    if (hotelId) {
      try {
        const r = await fetch(`/api/cronos/property/BelowFoldParams/GetSecondaryData?hotel_id=${hotelId}&checkIn=&los=2&adults=2&children=0&rooms=1`);
        if (r.ok) belowFold = await r.json();
      } catch(e) {}
    }
  }
  const text = document.body?.innerText || "";
  const data = {};

  data.name_en = agoda?.propertyName || document.querySelector('h1')?.innerText?.trim() || '';

  // Extract times from DOM property-feature elements (primary source)
  const featureTexts = {};
  document.querySelectorAll('[data-element-name="property-feature"]').forEach(el => {
    const leafSpans = [...el.querySelectorAll('span')].filter(s => s.children.length === 0);
    const label = leafSpans[0]?.textContent?.trim().toLowerCase() || '';
    const value = leafSpans[leafSpans.length - 1]?.textContent?.trim() || '';
    if (label && value) featureTexts[label] = value;
  });

  let checkIn = featureTexts['check-in from'] || '';
  let checkOut = featureTexts['check-out until'] || '';
  let checkinEnd = featureTexts['reception open until'] || '';
  let checkoutStart = featureTexts['check-out from'] || '';

  // Fallback: room benefits API
  if (!checkIn || !checkOut) {
    outer: for (const room of (agoda?.rooms || [])) {
      for (const offer of (room.offers || [])) {
        for (const b of (offer.benefits || [])) {
          const cin = b.text?.match(/Check-in\s+(\d{1,2}:\d{2})/i);
          const cout = b.text?.match(/Check-out\s+(\d{1,2}:\d{2})/i);
          if (cin && !checkIn) checkIn = cin[1];
          if (cout && !checkOut) checkOut = cout[1];
          if (checkIn && checkOut) break outer;
        }
      }
    }
  }
  if (!checkIn) { const m = text.match(/check.?in[:\s]+(\d{1,2}:\d{2})/i); if (m) checkIn = m[1]; }
  if (!checkOut) { const m = text.match(/check.?out[:\s]+(\d{1,2}:\d{2})/i); if (m) checkOut = m[1]; }

  // 24hr front desk: icon label "24-hour front desk" = Yes, "Reception open until HH:MM" = No
  const fdIcon = document.querySelector('i.ficon-24hour-frontdesk');
  const fdLabel = fdIcon?.closest('[data-element-name="property-feature"]')?.textContent || '';
  const is24hr = fdIcon ? /24.hour front desk/i.test(fdLabel) : /24.hour front desk/i.test(text);
  data.front_desk_hours = is24hr ? 'Yes' : 'No';

  data.checkin_time = checkIn || '14:00';
  data.checkout_time = checkOut || '12:00';
  data.checkin_end = is24hr ? '23:59' : (checkinEnd || '23:59');
  data.checkout_start = is24hr ? '00:00' : (checkoutStart || '00:00');

  // JSON-LD → local name, address, postal_code, country
  let address = '', postalCode = '', countryCode = '', localName = '';
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = JSON.parse(s.textContent);
      const candidates = json['@graph'] || (Array.isArray(json) ? json : [json]);
      const hotel = candidates.find(j => /hotel|lodging/i.test(j['@type'] || ''));
      if (hotel) {
        if (hotel.name) localName = hotel.name;
        if (hotel.address) {
          const a = hotel.address;
          if (typeof a === 'string') {
            address = a;
          } else {
            const street = (a.streetAddress || '').replace(/\s*\(.*?\)/g, '').trim();
            const parts = [a.addressRegion, a.addressLocality, street].filter(Boolean);
            const seenParts = [];
            address = parts.filter(p => {
              const n = p.replace(/\s+/g, ' ').trim();
              if (seenParts.some(s2 => s2 === n || s2.includes(n) || n.includes(s2))) return false;
              seenParts.push(n);
              return true;
            }).join(', ');
            postalCode = a.postalCode || '';
            const rawCountry = typeof a.addressCountry === 'string' ? a.addressCountry : (a.addressCountry?.['@id'] || '');
            countryCode = rawCountry.toLowerCase().replace(/^https?:\/\/.*\//, '');
            // 이 함수는 chrome.scripting.executeScript로 페이지에 주입되어 popup.js 바깥 변수(클로저)에 접근 못 하므로 맵을 직접 인라인
            const countryNameToVoltCode = {
              "south korea": "kr", korea: "kr",
              japan: "jp", china: "cn",
              "hong kong": "hk", macau: "cn", macao: "cn",
              indonesia: "id", vietnam: "vn", thailand: "th",
              philippines: "ph", malaysia: "my", singapore: "sg",
              taiwan: "tw",
            };
            countryCode = countryNameToVoltCode[countryCode] || countryCode;
          }
        }
        break;
      }
    } catch(e) {}
  }
  data.name_local = '';
  if (!address) {
    const addrEl = document.querySelector('[data-selenium="hotel-address"], [data-element-name="hotel-header-location"]');
    address = (addrEl?.innerText?.trim() || '').replace(/\n/g, ', ');
  }
  data.address = address;
  data.postal_code = postalCode;

  // BelowFold: 한국어 이름/주소 덮어쓰기
  if (belowFold) {
    const kName = belowFold?.searchbox?.searchCriteria?.searchText;
    if (kName && kName !== data.name_en) data.name_local = kName;
    const bAddr = belowFold?.address;
    if (bAddr?.address) data.address = [bAddr.cityName, bAddr.address].filter(Boolean).join(', ');
  }

  // Property details: usefulInfo 우선, 없으면 페이지 텍스트 (스크롤 후 로딩된 "Some helpful facts")
  const useful = window.__teraAgodaUsefulInfo || [];
  const getU = (keyword) => useful.find(i => i.name?.toLowerCase().includes(keyword.toLowerCase()))?.description || '';

  const builtM = text.match(/(?:opened|established|built)\s*(?:in\s*)?:?\s*(\d{4})/i);
  data.built_year = getU('year property opened') || getU('year opened') || getU('opened') || getU('year') || builtM?.[1] || '';
  const renM = text.match(/[Rr]enovated?\s*(?:in\s*)?:?\s*(\d{4})/);
  data.renovated_year = getU('renovated') || renM?.[1] || data.built_year || '';

  data.room_count = getU('rooms') || getU('room')
    || text.match(/Number of (?:guest )?rooms?\s*[:\s]+(\d+)/i)?.[1]
    || text.match(/(\d+)\s*(?:guest\s*)?rooms?/i)?.[1] || '';
  data.floor_count = getU('floor')
    || text.match(/Number of floors?\s*[:\s]+(\d+)/i)?.[1]
    || text.match(/(\d+)\s*floors?/i)?.[1] || '';
  data.restaurant_count = getU('restaurant')
    || text.match(/Number of restaurants?\s*[:\s]+(\d+)/i)?.[1]
    || text.match(/(\d+)\s*restaurants?/i)?.[1] || '-';
  data.bar_count = getU('bar')
    || text.match(/Number of bars?\s*[:\s]+(\d+)/i)?.[1]
    || text.match(/(\d+)\s*bars?\b/i)?.[1] || '-';

  const voltageRaw = getU('voltage')
    || text.match(/Voltage\s*[:\s]+(\d+)/i)?.[1];
  if (voltageRaw) {
    data.voltage = /^\d+$/.test(voltageRaw) ? voltageRaw + 'V' : voltageRaw;
  } else {
    const voltMap = { kr: '220V', jp: '100V', cn: '220V', hk: '220V', id: '220V', vn: '220V', th: '220V', ph: '220V', my: '240V', sg: '230V', tw: '110V' };
    data.voltage = voltMap[countryCode] || '';
  }

  // Breakfast price: "Breakfast charge: 22000 KRW" / "₩ 22,000" / "KRW 22000"
  const brkM = text.match(/Breakfast charge[^\n]*:\s*([\d,]+)\s*(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)/i)
    || text.match(/(?:breakfast|buffet)[^\n]*₩\s*([\d,]+)/i)
    || text.match(/(?:breakfast|buffet)[^\n]*(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)\s*([\d,]+)/i);
  if (brkM) data.breakfast_price = brkM[1].replace(/,/g, '');

  // Room service, parking, airport transfer
  data.room_service = /room\s*service/i.test(text) ? 'Yes' : 'No';
  if (/free\s*(?:on.?site\s*)?parking|parking\s*\(free\)/i.test(text)) {
    data.parking = 'Yes'; data.parking_type = 'Free';
  } else if (/paid\s*parking|parking\s*(?:charge|fee)|parking\s*\(chargeable\)/i.test(text)) {
    data.parking = 'Yes'; data.parking_type = 'Paid';
  } else if (/\bparking\b/i.test(text)) {
    data.parking = 'Yes'; data.parking_type = 'Free';
  } else {
    data.parking = 'No'; data.parking_type = '-';
  }
  data.parking_price = '-';
  data.airport_transfer = /airport\s*(?:pickup|shuttle|transfer)/i.test(text) ? 'Yes' : 'No';
  if (data.airport_transfer === 'Yes') {
    if (/free[^.]*airport\s*(?:pickup|shuttle|transfer)|airport\s*(?:pickup|shuttle|transfer)[^.]*free/i.test(text)) {
      data.airport_transfer_fee = 'Free';
    } else {
      const atFeeM = text.match(/airport\s*(?:pickup|shuttle|transfer)[^.]*?(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)\s*([\d,]+)/i)
        || text.match(/(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)\s*([\d,]+)[^.]*airport\s*(?:pickup|shuttle|transfer)/i);
      data.airport_transfer_fee = atFeeM ? atFeeM[1].replace(/,/g, '') : '-';
    }
  } else {
    data.airport_transfer_fee = '-';
  }

  // Facilities: 전체 페이지 텍스트로 키워드 매칭 (DOM 셀렉터 대신)
  data._tripFacilities = [{ desc: text }];

  return data;
};

// ── booking.com Hotel Detail Extract (runs in page MAIN world) ──
const bookingExtractForDetail = async () => {
  // "Guests are asking" FAQ 위젯은 실제 보유 여부와 무관하게 모든 호텔에 같은 질문 템플릿을 보여줘서
  // 아래 키워드 매칭(airport transfer 등)에 오탐을 일으키므로 검사 대상 텍스트에서 제외.
  // 위젯 셀렉터가 안 걸리는 경우를 대비해 "Is there ...?" 류의 질문 문장도 통째로 한번 더 제거
  const rawText = document.body?.innerText || '';
  const faqText = document.querySelector('[data-testid="ask-questions-entry-desktop-wrapper"]')?.innerText || '';
  const text = (faqText ? rawText.split(faqText).join(' ') : rawText)
    .replace(/(?:Is there|Are there|Do you have|Does (?:the|this) (?:hotel|property|place))[^?\n]{0,120}\?/gi, ' ');
  const data = {};

  data.name_en = document.querySelector('#hp_hotel_name')?.innerText?.trim()
    || document.querySelector('h2[data-testid="header-title"]')?.innerText?.trim()
    || document.querySelector('h1')?.innerText?.trim() || '';
  data.name_local = '';

  // JSON-LD (Schema.org) → address, postal_code, country, star rating
  let address = '', postalCode = '', countryCode = '';
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = JSON.parse(s.textContent);
      const candidates = json['@graph'] || (Array.isArray(json) ? json : [json]);
      const hotel = candidates.find(j => /hotel|lodging/i.test(j['@type'] || ''));
      if (hotel) {
        if (hotel.address) {
          const a = hotel.address;
          if (typeof a === 'string') {
            address = a;
          } else {
            const street = (a.streetAddress || '').replace(/\s*\(.*?\)/g, '').trim();
            const parts = [a.addressRegion, a.addressLocality, street].filter(Boolean);
            const seenParts = [];
            address = parts.filter(p => {
              const n = p.replace(/\s+/g, ' ').trim();
              if (seenParts.some(s2 => s2 === n || s2.includes(n) || n.includes(s2))) return false;
              seenParts.push(n);
              return true;
            }).join(', ');
            postalCode = a.postalCode || '';
            const rawCountry = typeof a.addressCountry === 'string' ? a.addressCountry : (a.addressCountry?.['@id'] || '');
            countryCode = rawCountry.toLowerCase().replace(/^https?:\/\/.*\//, '');
            // 이 함수는 chrome.scripting.executeScript로 페이지에 주입되어 popup.js 바깥 변수(클로저)에 접근 못 하므로 맵을 직접 인라인
            const countryNameToVoltCode = {
              "south korea": "kr", korea: "kr",
              japan: "jp", china: "cn",
              "hong kong": "hk", macau: "cn", macao: "cn",
              indonesia: "id", vietnam: "vn", thailand: "th",
              philippines: "ph", malaysia: "my", singapore: "sg",
              taiwan: "tw",
            };
            countryCode = countryNameToVoltCode[countryCode] || countryCode;
          }
        }
        break;
      }
    } catch(e) {}
  }
  if (!address) {
    const addrEl = document.querySelector('[data-testid="address"], .hp_address_subtitle');
    address = (addrEl?.innerText?.trim() || '').replace(/\n/g, ', ');
  }
  data.address = address;
  data.postal_code = postalCode;

  // 한국어 이름/주소: booking.com이 제공하는 hreflang=ko 대체 페이지를 불러와서 다시 추출
  // ("Address in Local Language" 필드가 실제로는 영문/로마자 주소로 채워지고 있었음)
  try {
    const koLink = document.querySelector('link[rel="alternate"][hreflang="ko"]')?.href;
    if (koLink) {
      const koHtml = await (await fetch(koLink)).text();
      const koDoc = new DOMParser().parseFromString(koHtml, 'text/html');
      const koName = koDoc.querySelector('#hp_hotel_name')?.textContent?.trim()
        || koDoc.querySelector('h2[data-testid="header-title"]')?.textContent?.trim()
        || koDoc.querySelector('h1')?.textContent?.trim() || '';
      if (koName && koName !== data.name_en) data.name_local = koName;

      let koAddress = '';
      for (const s of koDoc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const json = JSON.parse(s.textContent);
          const candidates = json['@graph'] || (Array.isArray(json) ? json : [json]);
          const hotel = candidates.find(j => /hotel|lodging/i.test(j['@type'] || ''));
          const a = hotel?.address;
          if (a && typeof a !== 'string') {
            const street = (a.streetAddress || '').replace(/\s*\(.*?\)/g, '').trim();
            // 한국어 데이터는 addressRegion/streetAddress가 겹치거나 서로 포함관계인 경우가 있어 정규화 후 제거
            const parts = [a.addressRegion, a.addressLocality, street].filter(Boolean);
            const seenParts = [];
            koAddress = parts.filter(p => {
              const n = p.replace(/\s+/g, ' ').trim();
              if (seenParts.some(s2 => s2 === n || s2.includes(n) || n.includes(s2))) return false;
              seenParts.push(n);
              return true;
            }).join(', ');
          }
          if (hotel) break;
        } catch (e) {}
      }
      if (!koAddress) {
        const koAddrEl = koDoc.querySelector('[data-testid="address"], .hp_address_subtitle');
        koAddress = (koAddrEl?.textContent?.trim() || '').replace(/\n/g, ', ');
      }
      if (koAddress && /[가-힣]/.test(koAddress)) data.address = koAddress;
    }
  } catch (e) {}

  // booking.com은 "Check-in / From 2:00 PM"처럼 12시간제(AM/PM)를 쓰는 경우가 많아 24시간제로 변환
  const to24h = (hhmm, ampm) => {
    if (!ampm) return hhmm;
    let [h, mi] = hhmm.split(':').map(Number);
    const isPM = /pm/i.test(ampm);
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  };

  // Check-in / Check-out (페이지 텍스트 정규식)
  let checkIn = '', checkOut = '', checkinEnd = '', checkoutStart = '';
  let m = text.match(/check.?in[:\s]*(?:from\s*)?(\d{1,2}:\d{2})\s*(am|pm)?/i);
  if (m) checkIn = to24h(m[1], m[2]);
  m = text.match(/check.?out[:\s]*(?:until\s*|before\s*)?(\d{1,2}:\d{2})\s*(am|pm)?/i);
  if (m) checkOut = to24h(m[1], m[2]);
  m = text.match(/check.?in[^\n]{0,20}?[–-]\s*(\d{1,2}:\d{2})\s*(am|pm)?/i);
  if (m) checkinEnd = to24h(m[1], m[2]);

  const is24hr = /24.hour front desk/i.test(text);
  data.front_desk_hours = is24hr ? 'Yes' : 'No';
  data.checkin_time = checkIn || '14:00';
  data.checkout_time = checkOut || '12:00';
  data.checkin_end = is24hr ? '23:59' : (checkinEnd || '23:59');
  data.checkout_start = is24hr ? '00:00' : (checkoutStart || '00:00');

  // Property details (건축년도, 객실/층/레스토랑/바 수) - 페이지 텍스트 정규식
  const builtM = text.match(/(?:opened|established|built)\s*(?:in\s*)?:?\s*(\d{4})/i);
  data.built_year = builtM?.[1] || '';
  const renM = text.match(/[Rr]enovated?\s*(?:in\s*)?:?\s*(\d{4})/);
  data.renovated_year = renM?.[1] || data.built_year || '';
  // "Number of ~:" 같은 명시적 문구가 있을 때만 채움 (검색 위젯의 "1 room" 같은 오탐 방지)
  data.room_count = text.match(/Number of (?:guest )?rooms?\s*[:\s]+(\d+)/i)?.[1] || '';
  data.floor_count = text.match(/Number of floors?\s*[:\s]+(\d+)/i)?.[1] || '';
  data.restaurant_count = text.match(/Number of restaurants?\s*[:\s]+(\d+)/i)?.[1] || '-';
  data.bar_count = text.match(/Number of bars?\s*[:\s]+(\d+)/i)?.[1] || '-';

  const voltageRaw = text.match(/Voltage\s*[:\s]+(\d+)/i)?.[1];
  if (voltageRaw) {
    data.voltage = voltageRaw + 'V';
  } else {
    const voltMap = { kr: '220V', jp: '100V', cn: '220V', hk: '220V', id: '220V', vn: '220V', th: '220V', ph: '220V', my: '240V', sg: '230V', tw: '110V' };
    data.voltage = voltMap[countryCode] || '';
  }

  // Breakfast price
  const brkM = text.match(/Breakfast charge[^\n]*:\s*([\d,]+)\s*(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)/i)
    || text.match(/(?:breakfast|buffet)[^\n]*₩\s*([\d,]+)/i)
    || text.match(/(?:breakfast|buffet)[^\n]*(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)\s*([\d,]+)/i);
  if (brkM) data.breakfast_price = brkM[1].replace(/,/g, '');

  // Room service, parking, airport transfer
  data.room_service = /room\s*service/i.test(text) ? 'Yes' : 'No';
  if (/free\s*(?:on.?site\s*)?parking|parking\s*\(free\)/i.test(text)) {
    data.parking = 'Yes'; data.parking_type = 'Free';
  } else if (/paid\s*parking|parking\s*(?:charge|fee)|parking\s*\(chargeable\)/i.test(text)) {
    data.parking = 'Yes'; data.parking_type = 'Paid';
  } else if (/\bparking\b/i.test(text)) {
    data.parking = 'Yes'; data.parking_type = 'Free';
  } else {
    data.parking = 'No'; data.parking_type = '-';
  }
  data.parking_price = '-';
  data.airport_transfer = /airport\s*(?:pickup|shuttle|transfer)/i.test(text) ? 'Yes' : 'No';
  if (data.airport_transfer === 'Yes') {
    if (/free[^.]*airport\s*(?:pickup|shuttle|transfer)|airport\s*(?:pickup|shuttle|transfer)[^.]*free/i.test(text)) {
      data.airport_transfer_fee = 'Free';
    } else {
      const atFeeM = text.match(/airport\s*(?:pickup|shuttle|transfer)[^.]*?(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)\s*([\d,]+)/i)
        || text.match(/(?:KRW|USD|JPY|CNY|HKD|THB|IDR|SGD|MYR|PHP|VND|TWD)\s*([\d,]+)[^.]*airport\s*(?:pickup|shuttle|transfer)/i);
      data.airport_transfer_fee = atFeeM ? atFeeM[1].replace(/,/g, '') : '-';
    }
  } else {
    data.airport_transfer_fee = '-';
  }

  // Facilities: 전체 페이지 텍스트로 키워드 매칭
  data._tripFacilities = [{ desc: text }];

  return data;
};

// ── Airbnb Hotel Detail Extract (runs in page MAIN world) ──
const airbnbExtractForDetail = async () => {
  const data = {};

  // JSON-LD (schema.org VacationRental) — 이름/주소(도시)/국가
  let ld = null;
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = JSON.parse(s.textContent);
      const candidates = Array.isArray(json) ? json : [json];
      const found = candidates.find(j => /vacationrental/i.test(j['@type'] || ''));
      if (found) { ld = found; break; }
    } catch (e) {}
  }

  data.name_en = ld?.name || document.querySelector('h1')?.innerText?.trim() || '';
  data.name_local = '';
  data.address = ld?.address?.addressLocality || '';

  // 실제 편의시설/체크인아웃/사진 정보는 data-deferred-state-0 안의 GraphQL 응답(niobeClientData)에서 파싱
  // (페이지 텍스트 정규식보다 훨씬 정확 — 이미 구조화된 amenity available 여부, house rules 항목을 그대로 사용)
  let policies = null, amenityGroups = [], mediaItems = [];
  try {
    const raw = document.getElementById('data-deferred-state-0')?.textContent
      || document.querySelector('script[id^="data-deferred-state"]')?.textContent;
    if (raw) {
      const stateJson = JSON.parse(raw);
      let pdp = null, node = null;
      for (const [, resp] of (stateJson.niobeClientData || [])) {
        const p = resp?.data?.presentation?.stayProductDetailPage;
        if (p) pdp = p;
        const n = resp?.data?.node;
        if (n?.pdpPresentation) node = n;
      }
      const sections = pdp?.sections?.sections || [];
      policies = sections.find(s => s?.sectionId === 'POLICIES_DEFAULT')?.section || null;
      const photoModal = sections.find(s => s?.sectionId === 'PHOTO_TOUR_SCROLLABLE_MODAL')?.section;
      mediaItems = photoModal?.mediaItems || [];
      amenityGroups = node?.pdpPresentation?.amenities?.seeAllAmenitiesGroups || [];
    }
  } catch (e) {}

  // Check-in/out: house rules 항목이 "Check-in after 4:00 PM" / "Checkout before 10:00 AM" 형태로 나옴
  const houseRuleTitles = (policies?.houseRules || []).map(r => r.title || '').join(' | ');
  const to24h = (hhmm, ampm) => {
    let [h, mi] = hhmm.split(':').map(Number);
    if (/pm/i.test(ampm || '') && h !== 12) h += 12;
    if (/am/i.test(ampm || '') && h === 12) h = 0;
    return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  };
  const cinM = houseRuleTitles.match(/Check-?in[^0-9]*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
  const coutM = houseRuleTitles.match(/Check-?out[^0-9]*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
  data.front_desk_hours = 'No';
  data.checkin_time = cinM ? to24h(cinM[1], cinM[2]) : '';
  data.checkin_end = '23:59';
  data.checkout_start = '00:00';
  data.checkout_time = coutM ? to24h(coutM[1], coutM[2]) : '';

  // Airbnb는 호텔 건축/객실수 개념이 없어 공란 유지 (수동 입력)
  data.built_year = '';
  data.renovated_year = '';
  data.room_count = '';
  data.floor_count = '';
  data.restaurant_count = '';
  data.bar_count = '';
  data.room_service = 'No';
  data.breakfast_price = '';

  // Voltage: JSON-LD에 국가가 없는 경우가 많아 페이지 텍스트에서 국가명을 찾아 매핑 (다른 사이트와 동일한 방식)
  const countryNameToVoltCode = {
    "south korea": "kr", korea: "kr",
    japan: "jp", china: "cn",
    "hong kong": "hk", macau: "cn", macao: "cn",
    indonesia: "id", vietnam: "vn", thailand: "th",
    philippines: "ph", malaysia: "my", singapore: "sg",
    taiwan: "tw",
  };
  const voltMap = { kr: '220V', jp: '100V', cn: '220V', hk: '220V', id: '220V', vn: '220V', th: '220V', ph: '220V', my: '240V', sg: '230V', tw: '110V' };
  const bodyText = document.body?.innerText || '';
  let countryCode = (ld?.address?.addressCountry || '').toLowerCase();
  countryCode = countryNameToVoltCode[countryCode] || countryCode;
  if (!countryCode) {
    for (const name of Object.keys(countryNameToVoltCode)) {
      if (bodyText.toLowerCase().includes(name)) { countryCode = countryNameToVoltCode[name]; break; }
    }
  }
  data.voltage = voltMap[countryCode] || '';

  // Amenities: available === true 항목만 모아 기존 HOTEL_FACILITY_MAP 키워드 매칭에 재사용
  const availableTitles = amenityGroups
    .flatMap(g => g.amenities || [])
    .filter(a => a.available)
    .map(a => a.title)
    .join(', ');

  if (/free parking/i.test(availableTitles)) {
    data.parking = 'Yes'; data.parking_type = 'Free';
  } else if (/paid parking/i.test(availableTitles)) {
    data.parking = 'Yes'; data.parking_type = 'Paid';
  } else if (/\bparking\b/i.test(availableTitles)) {
    data.parking = 'Yes'; data.parking_type = 'Free';
  } else {
    data.parking = 'No'; data.parking_type = '-';
  }
  data.parking_price = '-';

  data.airport_transfer = /airport\s*(?:pickup|shuttle|transfer)/i.test(availableTitles) ? 'Yes' : 'No';
  data.airport_transfer_fee = '-';

  data._tripFacilities = [{ desc: availableTitles }];

  // Photos: mediaItems[].baseUrl이 이미 원본 해상도라 별도 hi-res 변환 불필요
  data._airbnbPhotos = [...new Set(mediaItems.map(m => m.baseUrl).filter(Boolean))];

  return data;
};

// Hotel Detail Insert (Tera Autofill)
document.getElementById("sheetBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const btn = document.getElementById("sheetBtn");

  // 지금 탭이 Trip.com이면: 추출 → currentHotelData 갱신 → Tera 탭으로 이동
  if (tab.url?.includes("trip.com")) {
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
      renderHotelPreview(data);
      setExtractStatus(t().extractDone(data.name_en || (currentLang === 'kr' ? '호텔' : 'Hotel')), "success");

      await openOrFocusTab("https://tera.traveloka.com/data/hotel-data/*", TERA_HOTEL_DATA_URL);
      setExtractStatus(
        (currentLang === 'kr'
          ? `${data.name_en || '호텔'} - 버튼을 한 번 더 눌러서 시작해 주세요.`
          : `${data.name_en || 'Hotel'} - Click one more time to begin.`),
        "success"
      );
    } catch (e) {
      setExtractStatus("Error: " + e.message, "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // 지금 탭이 Agoda이면: 추출 → currentHotelData 갱신 → Tera 탭으로 이동
  if (tab.url?.includes("agoda.com")) {
    btn.disabled = true;
    setExtractStatus(t().extracting);
    try {
      const results = await exec(tab.id, agodaExtractForDetail, [], "MAIN");
      const data = results?.[0]?.result;
      if (!data?.name_en) { setExtractStatus(t().extractFail, "error"); return; }
      currentHotelData = data;
      renderHotelPreview(data);
      setExtractStatus(t().extractDone(data.name_en), "success");
      await openOrFocusTab("https://tera.traveloka.com/data/hotel-data/*", TERA_HOTEL_DATA_URL);
      setExtractStatus(
        currentLang === 'kr'
          ? `${data.name_en} - 버튼을 한 번 더 눌러서 시작해 주세요.`
          : `${data.name_en} - Click one more time to begin.`,
        "success"
      );
    } catch (e) {
      setExtractStatus("Error: " + e.message, "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // 지금 탭이 booking.com이면: 추출 → currentHotelData 갱신 → Tera 탭으로 이동
  if (tab.url?.includes("booking.com")) {
    btn.disabled = true;
    setExtractStatus(t().extracting);
    try {
      const results = await exec(tab.id, bookingExtractForDetail, [], "MAIN");
      const data = results?.[0]?.result;
      if (!data?.name_en) { setExtractStatus(t().extractFail, "error"); return; }
      currentHotelData = data;
      renderHotelPreview(data);
      setExtractStatus(t().extractDone(data.name_en), "success");
      await openOrFocusTab("https://tera.traveloka.com/data/hotel-data/*", TERA_HOTEL_DATA_URL);
      setExtractStatus(
        currentLang === 'kr'
          ? `${data.name_en} - 버튼을 한 번 더 눌러서 시작해 주세요.`
          : `${data.name_en} - Click one more time to begin.`,
        "success"
      );
    } catch (e) {
      setExtractStatus("Error: " + e.message, "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // 지금 탭이 Airbnb이면: 추출 → currentHotelData 갱신 → Tera 탭으로 이동
  if (tab.url?.includes("airbnb.com")) {
    btn.disabled = true;
    setExtractStatus(t().extracting);
    try {
      const results = await exec(tab.id, airbnbExtractForDetail, [], "MAIN");
      const data = results?.[0]?.result;
      if (!data?.name_en) { setExtractStatus(t().extractFail, "error"); return; }
      currentHotelData = data;
      renderHotelPreview(data);
      setExtractStatus(t().extractDone(data.name_en), "success");
      await openOrFocusTab("https://tera.traveloka.com/data/hotel-data/*", TERA_HOTEL_DATA_URL);
      setExtractStatus(
        currentLang === 'kr'
          ? `${data.name_en} - 버튼을 한 번 더 눌러서 시작해 주세요.`
          : `${data.name_en} - Click one more time to begin.`,
        "success"
      );
    } catch (e) {
      setExtractStatus("Error: " + e.message, "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // 지금 탭이 Tera면: 호텔 확인 → Details 탭 클릭 (필요시 이동 확인 모달 처리) → 자동입력 실행
  if (tab.url?.includes("tera.traveloka.com")) {
    if (!currentHotelData) { setExtractStatus(t().hotelInsertNoData, "error"); return; }
    btn.disabled = true;
    try {
      await exec(tab.id, () => {
        Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === "Details")?.click();
      });
      await sleep(800);

      // "저장 안 하고 이동하시겠습니까?" 확인 모달이 뜨면 "Yes, move to the other tab" 클릭
      const movePrompt = await exec(tab.id, () => {
        const btn = Array.from(document.querySelectorAll('button span')).find(el => el.textContent.trim() === 'Yes, move to the other tab');
        if (btn) { btn.closest('button').click(); return true; }
        return false;
      });
      if (movePrompt?.[0]?.result) await sleep(1000);

      await runHotelAutofill(tab.id);
    } catch (e) {
      setExtractStatus("Error: " + e.message, "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  setExtractStatus(t().extractNotTrip, "error");
});

// Init
setLang(currentLang);
document.getElementById('btnKR').addEventListener('click', () => setLang('kr'));
document.getElementById('btnEN').addEventListener('click', () => setLang('en'));
checkForUpdates();

document.querySelectorAll('.person-btn').forEach(btn => {
  if (btn.dataset.person === selectedPerson) btn.classList.add('active');
  btn.addEventListener('click', () => {
    selectedPerson = btn.dataset.person;
    localStorage.setItem('teraPerson', selectedPerson);
    document.querySelectorAll('.person-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// Reset
document.getElementById("resetBtn").addEventListener("click", () => {
  currentHotelData = null;
  renderHotelPreview(null);
  roomData = [];
  chrome.storage.session.remove('roomData');
  setStatus(t().defaultStatus);
  setTeraStatus("");
  setExtractStatus("");
  document.getElementById("roomList").style.display = "none";
  document.getElementById("selectFillBtn").style.display = "none";
  document.getElementById("photoZipBtn").style.display = "none";
  document.getElementById("hotelPhotoBtn").style.display = "none";
  hotelPhotos = [];
  chrome.storage.session.remove('hotelPhotos');
});


// Fill (Full Auto / Manual)
async function runFill(isAuto) {
  autoMode = isAuto;
  const selected = Array.from(document.querySelectorAll(".room-cb:checked")).map(cb => roomData[parseInt(cb.dataset.index)]);
  if (selected.length === 0) { setTeraStatus(currentLang === 'kr' ? "선택된 방이 없어요." : "No rooms selected.", "error"); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url?.includes("room-data")) {
    chrome.tabs.create({ url: "https://tera.traveloka.com/room/room-data/" });
    setTeraStatus("Check if this is a correct hotel. Press again to start.");
    return;
  }
  const fillBtn = document.getElementById("selectFillBtn");
  fillBtn.disabled = true;
  try {
    for (let i = 0; i < selected.length; i++) {
      const room = selected[i];
      setTeraStatus(t().teraRunning(i + 1, selected.length));
      await teraFillOneRoom(tab.id, room, matchRoomType(room.roomName));
      const photos = await fetchPhotosAsBase64(room.roomPhotos);
      await uploadRoomPhotos(tab.id, photos);
      setTeraStatus(currentLang === 'kr' ? 'AI 사진 분류 중...' : 'Classifying photos with AI...');
      await classifyRoomPhotos(tab.id);
      await waitForContinue(room.roomName);
      await exec(tab.id, () => document.querySelector('[data-testid="button-mainform-submit"]')?.click(), [], "MAIN");
      // Save 버튼 뜰 때까지 대기
      while (true) {
        const r = await exec(tab.id, () => !!Array.from(document.querySelectorAll('.css-jr388n')).find(b => b.textContent.trim() === 'Save'));
        if (r?.[0]?.result) break;
        await sleep(300);
      }
      await exec(tab.id, () => Array.from(document.querySelectorAll('.css-jr388n')).find(b => b.textContent.trim() === 'Save')?.click());
      // Save 처리 후 redirect 시작까지 여유 시간
      await sleep(2000);
      // /form/ URL 벗어날 때까지 대기
      while (true) {
        const urlCheck = await exec(tab.id, () => window.location.href.includes('/form/'), [], "MAIN");
        if (!urlCheck?.[0]?.result) break;
        await waitForContinue(room.roomName, true);
        await exec(tab.id, () => document.querySelector('[data-testid="button-mainform-submit"]')?.click());
        while (true) {
          const r = await exec(tab.id, () => !!Array.from(document.querySelectorAll('.css-jr388n')).find(b => b.textContent.trim() === 'Save'));
          if (r?.[0]?.result) break;
          await sleep(300);
        }
        await exec(tab.id, () => Array.from(document.querySelectorAll('.css-jr388n')).find(b => b.textContent.trim() === 'Save')?.click());
        await sleep(2000);
      }
      await sleep(800);
    }
    setTeraStatus(t().teraDone(selected.length), "success");
  } catch (err) {
    setTeraStatus(t().teraError(err.message), "error");
  }
  fillBtn.disabled = false;
}

let fillClickCount = 0;
const fillPopup = document.getElementById("fillPopup");
document.getElementById("selectFillBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  fillClickCount++;
  if (fillClickCount === 1) {
    runFill(false);
  } else {
    fillPopup.style.display = fillPopup.style.display === "block" ? "none" : "block";
  }
});
document.getElementById("fullAutoBtn").addEventListener("click", () => {
  fillPopup.style.display = "none";
  runFill(true);
});
document.getElementById("manualFillBtn").addEventListener("click", () => {
  fillPopup.style.display = "none";
  runFill(false);
});
document.addEventListener("click", () => { fillPopup.style.display = "none"; });

// ===== 사진 업로드 (Trip → Tera) =====
// 방 사진 URL들을 popup에서 fetch → base64 배열로 (CSP 회피)
async function fetchPhotosAsBase64(urls) {
  const seen = new Set();
  const unique = (urls || []).filter(u => { const k = (u || '').split('?')[0]; if (!u || seen.has(k)) return false; seen.add(k); return true; });
  const out = [];
  for (const url of unique) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      out.push(b64);
    } catch (e) { /* 실패한 사진은 건너뜀 */ }
  }
  return out;
}

// 열린 폼의 dropzone에 사진들을 drop 주입 + Upload (한 장씩)
async function uploadRoomPhotos(tabId, base64List) {
  if (!base64List || base64List.length === 0) return;
  for (const b64 of base64List) {
    await exec(tabId, async (b64) => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      try {
        // base64 직접 디코딩 (fetch 안 씀 = CSP 회피)
        const comma = b64.indexOf(',');
        const mime = b64.slice(0, comma).match(/data:(.*?);/)[1];
        const bin = atob(b64.slice(comma + 1));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });

        // webp → jpg 변환 (Tera는 jpg/png만)
        const imgUrl = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = imgUrl; });
        const sw = img.naturalWidth, sh = img.naturalHeight;
        const curRatio = sw / sh;
        const RATIOS_U = [1, 1.5, 1.7778];
        const tgtRatio = RATIOS_U.reduce((a, b) => Math.abs(b - curRatio) < Math.abs(a - curRatio) ? b : a);

        // Auto-detect: >15% crop → Fit mode (white background)
        let cropPct = 0;
        if (curRatio > tgtRatio) cropPct = 1 - tgtRatio / curRatio;
        else if (curRatio < tgtRatio) cropPct = 1 - curRatio / tgtRatio;
        const useFit = cropPct > 0.15;

        let sx = 0, sy = 0, cropW = sw, cropH = sh;
        if (curRatio > tgtRatio) { cropW = Math.round(sh * tgtRatio); sx = Math.round((sw - cropW) / 2); }
        else if (curRatio < tgtRatio) { cropH = Math.round(sw / tgtRatio); sy = Math.round((sh - cropH) / 2); }

        let cw = cropW, ch = cropH;
        const MAXD = 4000;
        if (cw > MAXD || ch > MAXD) { const scale = Math.min(MAXD / cw, MAXD / ch); cw = Math.round(cw * scale); ch = Math.round(ch * scale); }

        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        if (useFit) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
          const scale = Math.min(cw / sw, ch / sh);
          const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
          ctx.drawImage(img, 0, 0, sw, sh, Math.round((cw - dw) / 2), Math.round((ch - dh) / 2), dw, dh);
        } else {
          ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cw, ch);
        }
        URL.revokeObjectURL(imgUrl);
        const jpgBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
        const file = new File([jpgBlob], 'photo.jpg', { type: 'image/jpeg' });

        // dropzone에 drop 이벤트로 주입 (change는 인증 안 붙음, drop은 붙음)
        const input = document.querySelector('[data-testid="upload-dropzone-1"]');
        if (!input) return;
        const dropTarget = input.closest('div') || input;
        const dt = new DataTransfer();
        dt.items.add(file);
        for (const type of ['dragenter', 'dragover', 'drop']) {
          dropTarget.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
          await delay(80);
        }

        // 프리뷰 모달(slick-slider)이 뜰 때까지 무한 대기
        let previewBtn = null;
        while (true) {
          await delay(100);
          previewBtn = document.querySelector('[data-testid="button-upload-preview-photo"]');
          if (previewBtn && previewBtn.offsetParent) break;
          previewBtn = null;
        }

        previewBtn.click();

        // 프리뷰 모달이 DOM에서 완전히 사라질 때까지 대기 (최대 8초)
        for (let i = 0; i < 80; i++) {
          await delay(100);
          if (!document.querySelector('[data-testid="button-upload-preview-photo"]')) break;
        }

        // 모달 close 애니메이션 + slick-slider 정리 시간 확보
        await delay(350);
      } catch (e) { /* 한 장 실패해도 계속 */ }
    }, [b64], "MAIN");
    await sleep(150); // popup-content 핸드오프 최소 간격
  }
}

// ── Hotel Photo Upload (ALL HOTEL PHOTOS section on Tera hotel-photo page) ──
async function uploadHotelPhotosToTera(tabId, base64List) {
  if (!base64List || base64List.length === 0) return;

  // Inject fetch interceptor once to detect 401 on upload endpoint
  await exec(tabId, () => {
    if (window.__teraUploadPatched) return;
    window.__teraUploadPatched = true;
    window.__teraUploadCode = null;
    const orig = window.fetch;
    window.fetch = async function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      try {
        const res = await orig.apply(this, args);
        if (url.includes('uploadAccomAsset')) window.__teraUploadCode = res.status;
        return res;
      } catch (e) {
        if (url.includes('uploadAccomAsset')) window.__teraUploadCode = -1;
        throw e;
      }
    };
  }, [], "MAIN");

  // 1) Click "Manage Photos" button
  const clicked = await exec(tabId, () => {
    const btn = Array.from(document.querySelectorAll('button span')).find(s => s.textContent.trim() === 'Manage Photos');
    if (btn) { btn.closest('button').click(); return true; }
    return false;
  }, [], "MAIN");
  if (!clicked?.[0]?.result) throw new Error('Manage Photos button not found');
  await sleep(700);

  // 2) Click "Add more photos" button
  const clicked2 = await exec(tabId, () => {
    const btn = Array.from(document.querySelectorAll('button span')).find(s => s.textContent.trim() === 'Add more photos');
    if (btn) { btn.closest('button').click(); return true; }
    return false;
  }, [], "MAIN");
  if (!clicked2?.[0]?.result) throw new Error('Add more photos button not found');
  await sleep(700);

  // 3) Upload each photo; retry on 401
  let i = 0;
  while (i < base64List.length) {
    setTeraStatus(`Uploading hotel photo ${i + 1}/${base64List.length}...`);

    // Reset intercepted status before this upload
    await exec(tabId, () => { window.__teraUploadCode = null; }, [], "MAIN");

    const uploadRes = await exec(tabId, async (b64) => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      try {
        const comma = b64.indexOf(',');
        const mime = b64.slice(0, comma).match(/data:(.*?);/)[1];
        const bin = atob(b64.slice(comma + 1));
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        const blob = new Blob([bytes], { type: mime });

        // Convert: ratio crop (1:1 / 3:2 / 16:9) + resize (min 800×600, max 4096×4096) + min 300KB
        const MIN_W = 800, MIN_H = 600, MAX_W = 4096, MAX_H = 4096;
        const imgUrl = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = imgUrl; });
        const sw = img.naturalWidth, sh = img.naturalHeight;

        // 1) Auto-detect crop/fit
        const curRatio = sw / sh;
        const RATIOS_H = [1, 1.5, 1.7778];
        const tgtRatio = RATIOS_H.reduce((a, b) => Math.abs(b - curRatio) < Math.abs(a - curRatio) ? b : a);

        let cropPct = 0;
        if (curRatio > tgtRatio) cropPct = 1 - tgtRatio / curRatio;
        else if (curRatio < tgtRatio) cropPct = 1 - curRatio / tgtRatio;
        const useFit = cropPct > 0.15;

        let sx = 0, sy = 0, cropW = sw, cropH = sh;
        if (curRatio > tgtRatio) { cropW = Math.round(sh * tgtRatio); sx = Math.round((sw - cropW) / 2); }
        else if (curRatio < tgtRatio) { cropH = Math.round(sw / tgtRatio); sy = Math.round((sh - cropH) / 2); }

        // 2) 출력 크기: max 4096 다운스케일, min 800×600 업스케일
        let cw = cropW, ch = cropH;
        if (cw > MAX_W || ch > MAX_H) { const s = Math.min(MAX_W / cw, MAX_H / ch); cw = Math.round(cw * s); ch = Math.round(ch * s); }
        if (cw < MIN_W || ch < MIN_H) { const s = Math.max(MIN_W / cw, MIN_H / ch); cw = Math.round(cw * s); ch = Math.round(ch * s); }
        if (cw <= 1280) { const s = 1281 / cw; cw = 1281; ch = Math.round(ch * s); }
        console.log(`[hotel upload] original=${sw}x${sh} → canvas=${cw}x${ch} fit=${useFit}`);

        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx2 = canvas.getContext('2d');
        ctx2.imageSmoothingEnabled = true; ctx2.imageSmoothingQuality = 'high';
        if (useFit) {
          ctx2.fillStyle = '#ffffff';
          ctx2.fillRect(0, 0, cw, ch);
          const scale = Math.min(cw / sw, ch / sh);
          const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
          ctx2.drawImage(img, 0, 0, sw, sh, Math.round((cw - dw) / 2), Math.round((ch - dh) / 2), dw, dh);
        } else {
          ctx2.drawImage(img, sx, sy, cropW, cropH, 0, 0, cw, ch);
        }
        URL.revokeObjectURL(imgUrl);

        // 3) 최소 300KB: 품질 올려서 재시도, 그래도 안 되면 1.5배 업스케일
        let jpgBlob = null;
        for (const q of [0.92, 0.97, 1.0]) {
          jpgBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
          if (jpgBlob.size >= 300 * 1024) break;
        }
        if (jpgBlob.size < 300 * 1024) {
          const c2 = document.createElement('canvas');
          c2.width = Math.min(Math.round(cw * 1.5), MAX_W);
          c2.height = Math.min(Math.round(ch * 1.5), MAX_H);
          c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height);
          jpgBlob = await new Promise(r => c2.toBlob(r, 'image/jpeg', 0.92));
        }
        const file = new File([jpgBlob], 'photo.jpg', { type: 'image/jpeg' });

        // Try dropzone first (same as room photos)
        const dropzone = document.querySelector('[data-testid="upload-dropzone-1"]');
        if (dropzone) {
          const dt = new DataTransfer();
          dt.items.add(file);
          const target = dropzone.closest('div') || dropzone;
          for (const type of ['dragenter', 'dragover', 'drop']) {
            target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
            await delay(80);
          }
        } else {
          // Fallback: inject into hidden file input
          const input = document.querySelector('[data-testid="file-input"]');
          if (!input) return;
          const dt = new DataTransfer();
          dt.items.add(file);
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
          nativeSetter.call(input, dt.files);
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Wait for "Upload" button (orange) - up to 60s for slow networks
        let uploadBtn = null;
        for (let k = 0; k < 500; k++) {
          await delay(120);
          uploadBtn = Array.from(document.querySelectorAll('button span'))
            .find(s => s.textContent.trim() === 'Upload')?.closest('button');
          if (uploadBtn && uploadBtn.offsetParent) break;
          uploadBtn = null;
        }
        if (!uploadBtn) return { ok: false, reason: 'no-upload-btn' };
        uploadBtn.click();
        // Wait for Upload button to disappear (upload complete) - up to 30s
        for (let k = 0; k < 250; k++) {
          await delay(120);
          if (!Array.from(document.querySelectorAll('button span')).find(s => s.textContent.trim() === 'Upload')) break;
        }
        await delay(350);
        return { ok: true };
      } catch (e) {
        console.error('[hotel upload] error:', e.message);
        return { ok: false, reason: e.message };
      }
    }, [base64List[i]], "MAIN");

    // Wait for server response code (poll up to 30s)
    let code = null;
    for (let w = 0; w < 150; w++) {
      await sleep(200);
      const codeRes = await exec(tabId, () => window.__teraUploadCode, [], "MAIN");
      code = codeRes?.[0]?.result;
      if (code !== null && code !== undefined) break;
    }
    const statusMsg = code === 200
      ? (currentLang === 'kr' ? `Photo ${i + 1} 완료 - complete` : `Photo ${i + 1} complete`)
      : (currentLang === 'kr' ? `Photo ${i + 1} 실패 - failed (${code ?? 'no response'})` : `Photo ${i + 1} failed (${code ?? 'no response'})`);
    setTeraStatus(statusMsg, code === 200 ? '' : 'error');
    if (code !== 200) {
      await sleep(1500);
      let retryNow = false;
      const teraEl = document.getElementById("teraStatus");
      const showCountdown = (s) => {
        const msg = currentLang === 'kr'
          ? `Photo ${i + 1} 오류 (${code ?? 'no response'}) - ${s}초 후 재시도...`
          : `Photo ${i + 1} error (${code ?? 'no response'}) - retrying in ${s}s...`;
        teraEl.innerHTML = `${msg} <button id="retryNowBtn" style="margin-left:6px;padding:2px 8px;font-size:11px;border-radius:6px;background:#0071e3;color:#fff;border:none;cursor:pointer;">Retry now</button>`;
        teraEl.className = "status error";
        const btn = document.getElementById("retryNowBtn");
        if (btn) btn.onclick = () => { retryNow = true; };
      };
      for (let s = 60; s > 0; s--) {
        if (retryNow) break;
        showCountdown(s);
        await sleep(1000);
      }
      setTeraStatus('', '');
      continue; // retry same i
    }

    await sleep(500);
    i++;
  }

  // After all uploads: select the last N photos and click "Add the selected photos"
  await sleep(800);
  setTeraStatus(`Selecting last ${base64List.length} photos...`);

  await exec(tabId, (count) => {
    const labels = Array.from(document.querySelectorAll('.css-hwa8qp .c-checkbox--is-empty'));
    labels.slice(-count).forEach(lbl => lbl.click());
  }, [base64List.length], "MAIN");

  await sleep(500);

  await exec(tabId, () => {
    const btn = Array.from(document.querySelectorAll('button span'))
      .find(s => s.textContent.trim().toLowerCase().includes('add the selected'));
    btn?.closest('button')?.click();
  }, [], "MAIN");

}

document.getElementById("hotelPhotoBtn").addEventListener("click", async () => {
  if (hotelPhotos.length === 0) {
    setTeraStatus("No hotel photos. Run Room Scan first.", "error");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 아직 hotel-photo 페이지가 아니면 이동 후 확인 요청
  if (!tab.url?.includes("hotel-photo")) {
    chrome.tabs.create({ url: "https://tera.traveloka.com/data/hotel-photo/" });
    setTeraStatus("Check if this is a correct hotel. Press again to start.");
    return;
  }

  const btn = document.getElementById("hotelPhotoBtn");
  btn.disabled = true;
  try {
    setTeraStatus(`Fetching ${hotelPhotos.length} hotel photos...`);
    const base64List = await fetchPhotosAsBase64(hotelPhotos);
    setTeraStatus(`Uploading ${base64List.length} hotel photos...`);
    await uploadHotelPhotosToTera(tab.id, base64List);
    setTeraStatus(`Hotel photos uploaded: ${base64List.length}`, "success");
  } catch (e) {
    setTeraStatus("Error: " + e.message, "error");
  }
  btn.disabled = false;
});

// Photo ZIP (선택한 방 + 호텔 사진 zip 다운로드)
document.getElementById("photoZipBtn").addEventListener("click", async () => {
  const selected = Array.from(document.querySelectorAll(".room-cb:checked")).map(cb => roomData[parseInt(cb.dataset.index)]);
  if (selected.length === 0) {
    setTeraStatus(currentLang === 'kr' ? "선택된 방이 없어요." : "No rooms selected.", "error");
    return;
  }
  const btn = document.getElementById("photoZipBtn");
  btn.disabled = true;
  try {
    const hotelName = document.getElementById("hotelName")?.value || currentHotelData?.name_en || "hotel";
    const { totalPhotos, failCount } = await downloadRoomPhotosAsZip(
      hotelName,
      selected,
      hotelPhotos,
      (msg) => setTeraStatus(msg)
    );
    setTeraStatus(
      currentLang === 'kr'
        ? `완료: ${totalPhotos}장 / 실패 ${failCount}장`
        : `Done: ${totalPhotos} photos / ${failCount} failed`,
      "success"
    );
  } catch (e) {
    setTeraStatus("Error: " + e.message, "error");
  }
  btn.disabled = false;
});