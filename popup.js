const STRINGS = {
  kr: {
    startBtn: "스캔",
    hotelNamePlaceholder: "호텔 이름 입력 (사진용)",
    defaultStatus: "Trip.com 호텔 페이지에서 실행하세요.",
    notTripPage: "Trip.com 호텔 페이지에서 실행하세요.",
    scan1: "스캔 중...",
    scan1done: (total, photos) => `완료: ${total}개 객실 | 호텔사진: ${photos}장`,
    noRooms: "객실을 찾지 못했습니다.",
    zipping: "사진 ZIP 생성 중...",
    done: (rooms, photos) => `완료! 객실 ${rooms}개 + 사진 ${photos}장`,
    noPhotos: (n) => `완료! 총 ${n}개 객실 (사진 없음)`,
    noJszip: (n) => `완료! 총 ${n}개 객실 (JSZip 없음)`,
    update: (v) => `v${v} 업데이트 해주세요`,
    teraBtn: "Autofill",
    teraNoRooms: "먼저 스캔을 실행하세요.",
    teraNotTera: "tera.traveloka.com 페이지에서 실행하세요.",
    teraRunning: (cur, total) => `입력 중... (${cur}/${total})`,
    teraDone: (n) => `완료! ${n}개 객실 등록`,
    teraError: (name) => `오류: ${name}`,
    extractBtn: "스캔",
    extracting: "스캔 중...",
    extractDone: (name) => `완료: ${name}`,
    extractFail: "스캔 실패",
    extractNotTrip: "Trip.com 호텔 페이지에서 실행하세요.",
    hotelAutofillDetails: "Details 입력 중...",
    hotelAutofillOverview: "Overview 입력 중...",
    hotelAutofillAddress: "Address 입력 중...",
    hotelAutofillDone: "완료!",
    hotelAutofillReload: "페이지 리로드됨 - 다시 시도해주세요.",
  },
  en: {
    startBtn: "Scan",
    hotelNamePlaceholder: "Enter Hotel Name (for photos)",
    defaultStatus: "Run this on a Trip.com hotel page.",
    notTripPage: "Please run this on a Trip.com hotel page.",
    scan1: "Scanning...",
    scan1done: (total, photos) => `Done: ${total} rooms | Photos: ${photos}`,
    noRooms: "No rooms found.",
    zipping: "Creating ZIP...",
    done: (rooms, photos) => `Done! ${rooms} rooms + ${photos} photos`,
    noPhotos: (n) => `Done! ${n} rooms (no photos)`,
    noJszip: (n) => `Done! ${n} rooms (JSZip missing)`,
    update: (v) => `v${v} update available`,
    teraBtn: "Autofill",
    teraNoRooms: "Please scan first.",
    teraNotTera: "Please open tera.traveloka.com first.",
    teraRunning: (cur, total) => `Filling... (${cur}/${total})`,
    teraDone: (n) => `Done! ${n} rooms registered`,
    teraError: (name) => `Error: ${name}`,
    extractBtn: "Extract",
    extracting: "Extracting...",
    extractDone: (name) => `Done: ${name}`,
    extractFail: "Extraction failed.",
    extractNotTrip: "Please open a Trip.com hotel page.",
    hotelAutofillDetails: "Filling Details...",
    hotelAutofillOverview: "Filling Overview...",
    hotelAutofillAddress: "Filling Address...",
    hotelAutofillDone: "Done!",
    hotelAutofillReload: "Page reloaded — please try again.",
  }
};

let currentLang = localStorage.getItem('scraperLang') || 'kr';
let scannedRooms = [];

chrome.storage.session.get('scannedRooms', (data) => {
  if (data.scannedRooms && data.scannedRooms.length > 0) {
    scannedRooms = data.scannedRooms;
    setTeraStatus(`${scannedRooms.length}개 객실 로드됨`, "success");
  }
});

const ROOM_TYPE_OPTIONS = [
  "Junior Suite", "Studio Room", "Deluxe", "Double", "Executive",
  "Single", "Standard", "Suite", "Superior", "Triple", "Twin",
];

function matchRoomType(roomName) {
  const name = roomName.toLowerCase();
  for (const option of ROOM_TYPE_OPTIONS) {
    if (name.includes(option.toLowerCase())) return option;
  }
  return "Standard";
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('scraperLang', lang);
  document.getElementById('btnKR').className = 'lang-btn' + (lang === 'kr' ? ' active' : '');
  document.getElementById('btnEN').className = 'lang-btn' + (lang === 'en' ? ' active' : '');
  document.getElementById('startBtn').textContent = STRINGS[lang].startBtn;
  document.getElementById('hotelName').placeholder = STRINGS[lang].hotelNamePlaceholder;
  document.getElementById('status').textContent = STRINGS[lang].defaultStatus;
  document.getElementById('teraBtn').textContent = STRINGS[lang].teraBtn;
  document.getElementById('extractBtn').textContent = STRINGS[lang].extractBtn;
  const banner = document.getElementById('updateBanner');
  if (banner.dataset.version) {
    banner.textContent = STRINGS[lang].update(banner.dataset.version);
  }
  const pauseLabel = document.getElementById('pauseLabel');
  if (pauseLabel) {
    pauseLabel.textContent = lang === 'kr' ? '사진 업로드 완료 후' : 'After Photo Upload';
  }
}

function t() { return STRINGS[currentLang]; }

const CURRENT_VERSION = "5.0";
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/Geresia/trip_scraper_extension/main/version.json";

async function checkForUpdates() {
  try {
    const res = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
    const data = await res.json();
    if (data.version && data.version !== CURRENT_VERSION) {
      const banner = document.getElementById("updateBanner");
      banner.style.display = "block";
      banner.dataset.version = data.version;
      banner.textContent = t().update(data.version);
      banner.onclick = () => window.open("https://github.com/Geresia/trip_scraper_extension/releases", "_blank");
    }
  } catch (e) {
    console.log("Version check failed:", e.message);
  }
}

function setStatus(msg, type = "") {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
  console.log("[Scraper]", msg);
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

function waitForContinue(roomName) {
  return new Promise(resolve => {
    const box = document.getElementById('pauseBox');
    const msgEl = document.getElementById('pauseMsg');
    const btn = document.getElementById('continueBtn');
    msgEl.textContent = currentLang === 'kr'
      ? `${roomName} - 사진 업로드 완료 후 계속을 눌러주세요.`
      : `${roomName} - Upload photos, then click Continue.`;
    box.style.display = 'block';
    btn.textContent = currentLang === 'kr' ? '완료' : 'Continue';
    btn.onclick = () => { box.style.display = 'none'; resolve(); };
  });
}

function waitForContinueWithError(roomName) {
  return new Promise(resolve => {
    const box = document.getElementById('pauseBox');
    const msgEl = document.getElementById('pauseMsg');
    const btn = document.getElementById('continueBtn');
    msgEl.textContent = currentLang === 'kr'
      ? `${roomName} — 에러가 있어요. 수정 후 계속을 눌러주세요.`
      : `${roomName} — Error detected. Fix it, then click Continue.`;
    msgEl.style.color = '#d93025';
    box.style.display = 'block';
    btn.textContent = currentLang === 'kr' ? '완료' : 'Continue';
    btn.onclick = () => { box.style.display = 'none'; msgEl.style.color = ''; resolve(); };
  });
}

async function scrapeTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN",
    func: () => { window.__scrapeRoomsLoaded = false; }
  });
  await chrome.scripting.executeScript({
    target: { tabId }, files: ["content.js"], world: "MAIN"
  });
  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN",
    func: () => {
      window.__scrapeResult = null;
      window.__scrapeDone = false;
      if (typeof window.__scrapeRooms !== "function") {
        window.__scrapeResult = { rooms: [], hotelPhotos: [] };
        window.__scrapeDone = true;
        return;
      }
      window.__scrapeRooms()
        .then(result => { window.__scrapeResult = result; window.__scrapeDone = true; })
        .catch(() => { window.__scrapeResult = { rooms: [], hotelPhotos: [] }; window.__scrapeDone = true; });
    },
  });

  for (let i = 0; i < 600; i++) {
    await new Promise(r => setTimeout(r, 500));
    const results = await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: () => ({ done: window.__scrapeDone, result: window.__scrapeResult })
    });
    const data = results?.[0]?.result;
    if (data?.done) return data.result || { rooms: [], hotelPhotos: [] };
  }
  return { rooms: [], hotelPhotos: [] };
}

const TARGET_W = 1280;
const TARGET_H = 720;
const NEAR_THRESHOLD = 0.3;
const MAX_W = 4096;
const MAX_H = 4096;

function isLowQualityUrl(url) {
  const match = url.match(/_R_(\d+)_(\d+)_/);
  if (match) {
    const w = Number(match[1]), h = Number(match[2]);
    if (w < TARGET_W * NEAR_THRESHOLD || h < TARGET_H * NEAR_THRESHOLD) return true;
    const ratio = w / h;
    if (ratio < 0.5 || ratio > 2.0) return true;
  }
  const wMatch = url.match(/_W_(\d+)_(\d+)_/);
  if (wMatch) {
    const w = Number(wMatch[1]), h = Number(wMatch[2]);
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

function sanitizeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

const BED_TYPE_MAP = {
  'king': 'King', 'queen': 'Queen', 'single': 'Single', 'double': 'Double',
  'twin': 'Twin', 'bunk': 'Bunk', 'capsule': 'Capsule', 'mattress': 'Mattress',
  'sofa': 'Sofa', 'futon': 'Mattress',
};

async function teraFillOneRoom(tabId, room, roomType) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        if (div.textContent.trim() === "Create New Room" && div.children.length <= 2) {
          div.click(); return true;
        }
      }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const trigger = document.querySelector('[data-testid="select-rs-room-roomtype"]');
      if (trigger) { trigger.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (targetType) => {
      const dropdown = document.querySelector('[data-testid="select-rs-room-roomtype-options"]');
      if (!dropdown) return false;
      const spans = dropdown.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent.trim() === targetType) { span.closest('div').click(); return true; }
      }
      return false;
    },
    args: [roomType]
  });

  await new Promise(r => setTimeout(r, 1500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const input = document.querySelector('[data-testid="input-rs-room-numofrooms"]');
      if (!input) return false;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, '1');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (sizeText) => {
      const match = sizeText.match(/[\d.]+/);
      if (!match) return false;
      const input = document.querySelector('[data-testid="input-rs-room-size"]');
      if (!input) return false;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, match[0]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    args: [room.sizeText || ""]
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const trigger = document.querySelector('[data-testid="select-rs-room-unit"]');
      if (trigger) { trigger.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const opts = document.querySelector('[data-testid="select-rs-room-unit-options"]');
      if (!opts) return false;
      const spans = opts.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent.trim().toLowerCase() === 'sqm') { span.closest('div').click(); return true; }
      }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const trigger = document.querySelector('[data-testid="select-rs-room-window"]');
      if (trigger) { trigger.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (hasWindow) => {
      const opts = document.querySelector('[data-testid="select-rs-room-window-options"]');
      if (!opts) return false;
      const target = hasWindow ? "Available" : "Not Available";
      const spans = opts.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent.trim() === target) { span.closest('div').click(); return true; }
      }
      return false;
    },
    args: [room.windowType !== -100]
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const trigger = document.querySelector('[data-testid="select-rs-room-view"]');
      if (trigger) { trigger.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (targetView) => {
      const input = document.querySelector('[data-testid="select-rs-room-view-queryinput"]');
      if (!input) return false;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, targetView);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    },
    args: [room.roomView || "No Special View"]
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (targetView) => {
      const opts = document.querySelectorAll('[data-testid="select-rs-room-view-options"] span');
      if (!opts.length) return false;
      const found = Array.from(opts).find(s => s.textContent.trim() === targetView);
      if (found) { found.closest('div').click(); return true; }
      const fallback = Array.from(opts).find(s => s.textContent.trim() === 'No Special View');
      if (fallback) { fallback.closest('div').click(); return true; }
      return false;
    },
    args: [room.roomView || "No Special View"]
  });

  await new Promise(r => setTimeout(r, 500));

  function parseBeds(text) {
    const beds = [];
    const parts = (text || '').split(/ and /i);
    for (const part of parts) {
      const m = part.trim().match(/^(\d+)\s+(.+?)\s+bed$/i);
      if (m) {
        const raw = m[2].trim().toLowerCase();
        beds.push({ count: m[1], type: BED_TYPE_MAP[raw] || 'Double' });
      }
    }
    if (beds.length === 0) beds.push({ count: '1', type: 'Double' });
    return beds;
  }

  const hasOr = (room.bedText || '').toLowerCase().includes(' or ');
  const arrangements = hasOr ? room.bedText.split(/ or /i).map(s => s.trim()) : null;

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const btn = document.querySelector('[data-testid="button-rs-room-open-bed-settings"]');
      if (btn) { btn.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  if (hasOr) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const radio = document.querySelector('[data-testid="radio-option-single-bedroom"]');
        if (radio) { radio.click(); return true; }
        return false;
      }
    });

    await new Promise(r => setTimeout(r, 500));

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const spans = document.querySelectorAll('span.css-1rlnnbz');
        for (const span of spans) {
          if (span.textContent.trim() === 'Multiple Bed Arrangement') {
            const radio = span.closest('label').querySelector('input[type="radio"]');
            if (radio) { radio.click(); return true; }
          }
        }
        return false;
      }
    });

    await new Promise(r => setTimeout(r, 800));

    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (allBeds) => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < allBeds.length; i++) {
          const trigger = document.querySelector(`[data-testid="select-multiple-bed-arrangement-0-${i}"]`);
          if (trigger) { trigger.click(); await delay(400); }
          const input = document.querySelector(`[data-testid="select-multiple-bed-arrangement-0-${i}-queryinput"]`);
          if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, allBeds[i].type);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(400);
            const opts = Array.from(document.querySelectorAll(`[data-testid="select-multiple-bed-arrangement-0-${i}-options"] span`));
            const found = opts.find(s => s.textContent.trim() === allBeds[i].type);
            if (found) { found.closest('div').click(); await delay(300); }
          }
          const countInput = document.querySelector(`[data-testid="input-multiple-bed-arrangement-0-${i}"]`);
          if (countInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(countInput, allBeds[i].count);
            countInput.dispatchEvent(new Event('input', { bubbles: true }));
            countInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        return true;
      },
      args: [arrangements.flatMap(a => parseBeds(a))]
    });

  } else {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const radio = document.querySelector('[data-testid="radio-option-single-bedroom"]');
        if (radio) { radio.click(); return true; }
        return false;
      }
    });

    await new Promise(r => setTimeout(r, 500));

    const beds = parseBeds(room.bedText);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (beds) => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < beds.length; i++) {
          if (i > 0) {
            const addBtn = document.querySelector('[data-testid="button-add-another-bedtype-0"]');
            if (addBtn) addBtn.click();
            await delay(400);
          }
          const trigger = document.querySelector(`[data-testid="select-bedtype-fixed-0-${i}"]`);
          if (trigger) { trigger.click(); await delay(400); }
          const input = document.querySelector(`[data-testid="select-bedtype-fixed-0-${i}-queryinput"]`);
          if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, beds[i].type);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(400);
            const opts = Array.from(document.querySelectorAll(`[data-testid="select-bedtype-fixed-0-${i}-options"] span`));
            const found = opts.find(s => s.textContent.trim() === beds[i].type);
            if (found) { found.closest('div').click(); await delay(300); }
          }
          const countInput = document.querySelector(`[data-testid="input-numberofbeds-fixed-0-${i}"]`);
          if (countInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(countInput, beds[i].count);
            countInput.dispatchEvent(new Event('input', { bubbles: true }));
            countInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        return true;
      },
      args: [beds]
    });
  }

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const btn = document.querySelector('[data-testid="button-add-facilities"]');
      if (btn) { btn.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (facilityCodes) => {
      if (!facilityCodes || !facilityCodes.length) return false;
      const codes = facilityCodes.split(',').map(c => c.trim()).filter(Boolean);
      for (const code of codes) {
        const cb = document.querySelector(`[data-testid="checkbox-facility-${code}"]`);
        if (cb && !cb.checked) cb.click();
      }
      return true;
    },
    args: [room.facilityStr || ""]
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const btn = document.querySelector('[data-testid="button-modal-save"]');
      if (btn) { btn.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const btn = document.querySelector('[data-testid="button-modal-save"]');
      if (btn) { btn.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const trigger = document.querySelector('[data-testid="select-rs-room-gender"]');
      if (trigger) { trigger.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (roomName) => {
      const lower = roomName.toLowerCase();
      let target = 'All';
      if (lower.includes('male only') || (lower.includes('male') && !lower.includes('female'))) target = 'Male Only';
      else if (lower.includes('female')) target = 'Female Only';
      const opts = document.querySelectorAll('[data-testid="select-rs-room-gender-options"] span');
      const found = Array.from(opts).find(s => s.textContent.trim() === target);
      if (found) { found.closest('div').click(); return true; }
      return false;
    },
    args: [room.roomName || ""]
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const trigger = document.querySelector('[data-testid="select-rs-room-smoking"]');
      if (trigger) { trigger.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (smoking) => {
      const target = smoking === 'YES' ? 'Smoking' : 'Non-Smoking';
      const opts = document.querySelectorAll('[data-testid="select-rs-room-smoking-options"] span');
      const found = Array.from(opts).find(s => s.textContent.trim() === target);
      if (found) { found.closest('div').click(); return true; }
      return false;
    },
    args: [room.smoking || 'NO']
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const cb = document.querySelector('[data-testid="checkbox-rs-room-customizable-name"]');
      if (cb && !cb.checked) { cb.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (roomName) => {
      const input = document.querySelector('[data-testid="input-rs-room-custom-name"]');
      if (!input) return false;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, roomName);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    args: [room.roomName || ""]
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (occupancy) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const maxGuest = document.querySelector('[data-testid="input-rs-room-maxguest"]');
      if (maxGuest) {
        nativeSetter.call(maxGuest, String(occupancy));
        maxGuest.dispatchEvent(new Event('input', { bubbles: true }));
        maxGuest.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const maxAdult = document.querySelector('[data-testid="input-rs-room-maxadult"]');
      if (maxAdult) {
        nativeSetter.call(maxAdult, String(occupancy));
        maxAdult.dispatchEvent(new Event('input', { bubbles: true }));
        maxAdult.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    },
    args: [room.occupancy || 2]
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const sw = document.querySelector('[data-testid="switch-allow-children"]');
      if (sw && sw.checked) { sw.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const sw = document.querySelector('[data-testid="switch-extra-occupancy"]');
      if (sw && sw.checked) { sw.click(); return true; }
      return false;
    }
  });

  await new Promise(r => setTimeout(r, 500));

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const input = document.querySelector('[data-testid="input-rs-room-rate-protection-amount"]');
      if (!input) return false;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, '10000');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  });

  await new Promise(r => setTimeout(r, 500));
}

document.getElementById("teraBtn").addEventListener("click", async () => {
  if (scannedRooms.length === 0) {
    setTeraStatus(t().teraNoRooms, "error");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url?.includes("traveloka.com")) {
    setTeraStatus(t().teraNotTera, "error");
    return;
  }

  const btn = document.getElementById("teraBtn");
  btn.disabled = true;

  try {
    for (let i = 0; i < scannedRooms.length; i++) {
      const room = scannedRooms[i];
      const roomType = matchRoomType(room.roomName);
      setTeraStatus(t().teraRunning(i + 1, scannedRooms.length));
      await teraFillOneRoom(tab.id, room, roomType);
      await waitForContinue(room.roomName);

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const btn = document.querySelector('[data-testid="button-mainform-submit"]');
          if (btn) { btn.click(); return true; }
          return false;
        }
      });

      await new Promise(r => setTimeout(r, 1500));

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const btns = document.querySelectorAll('.css-jr388n');
          for (const btn of btns) {
            if (btn.textContent.trim() === 'Save') { btn.click(); return true; }
          }
          return false;
        }
      });

      await new Promise(r => setTimeout(r, 3000));

      while (true) {
        const errorCheck = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => !!document.querySelector('[data-id="IcSystemStatusFail16"]')
        });
        if (!errorCheck?.[0]?.result) break;
        await waitForContinueWithError(room.roomName);
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const btn = document.querySelector('[data-testid="button-mainform-submit"]');
            if (btn) { btn.click(); return true; }
            return false;
          }
        });
        await new Promise(r => setTimeout(r, 1500));
      }

      await new Promise(r => setTimeout(r, 800));
    }
    setTeraStatus(t().teraDone(scannedRooms.length), "success");
  } catch(err) {
    setTeraStatus(t().teraError(err.message), "error");
  }
  btn.disabled = false;
});

document.getElementById("startBtn").addEventListener("click", async () => {
  const hotelName = document.getElementById("hotelName").value.trim();
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  scannedRooms = [];
  setTeraStatus("");

  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const baseUrl = currentTab.url;

    if (!baseUrl.includes("trip.com/hotels")) {
      setStatus(t().notTripPage, "error");
      btn.disabled = false;
      return;
    }

    setStatus(t().scan1);
    const result1 = await scrapeTab(currentTab.id);
    const hotelPhotos = result1.hotelPhotos || [];
    const allRooms = new Map();
    (result1.rooms || []).forEach(r => { if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r); });
    setStatus(t().scan1done(allRooms.size, hotelPhotos.length));

    const finalRooms = [...allRooms.values()];

    if (finalRooms.length === 0) {
      setStatus(t().noRooms, "error");
      btn.disabled = false;
      return;
    }

    scannedRooms = finalRooms;
    chrome.storage.session.set({ scannedRooms: finalRooms });

    if (typeof JSZip !== "undefined") {
      setStatus(t().zipping);
      const zip = new JSZip();
      const folderName = sanitizeName(hotelName || String(Date.now()));
      const hotelFolder = zip.folder(folderName);
      const normalizeUrl = url => url.split('?')[0].trim();
      let photoCount = 0;

      async function processChunk(urls) {
        return Promise.all(urls.map(async (url) => {
          const ext = url.includes(".webp") ? "jpg" : (url.match(/\.(jpg|jpeg|png)/i)?.[1] || "jpg");
          try {
            const urlLow = isLowQualityUrl(url);
            const res = await fetch(url);
            let blob = await res.blob();
            let low = false;
            if (urlLow) {
              low = true;
            } else {
              const result = await checkAndUpscale(blob);
              blob = result.blob;
              low = result.isLow;
            }
            return { blob, low, ext };
          } catch (e) {
            console.log("Photo fetch failed:", url);
            return null;
          }
        }));
      }

      for (const room of finalRooms) {
        if (!room.roomPhotos || !room.roomPhotos.length) continue;
        const roomFolder = hotelFolder.folder(sanitizeName(room.roomName));
        let idx = 1;
        const roomSeenUrls = new Set();
        const uniqueUrls = [...room.roomPhotos].filter(url => {
          if (!url || roomSeenUrls.has(normalizeUrl(url))) return false;
          roomSeenUrls.add(normalizeUrl(url));
          return true;
        });
        for (let i = 0; i < uniqueUrls.length; i += 6) {
          const chunk = uniqueUrls.slice(i, i + 6);
          const results = await processChunk(chunk);
          for (const result of results) {
            if (!result) continue;
            const filename = `${String(idx).padStart(2, "0")}${result.low ? "_LOW_QUALITY" : ""}.${result.ext}`;
            roomFolder.file(filename, result.blob);
            idx++;
            photoCount++;
          }
        }
      }

      if (hotelPhotos && hotelPhotos.length > 0) {
        const hotelPhotoFolder = hotelFolder.folder("Hotel Photo");
        const hotelOnlyUrls = new Set();
        const uniqueHotelUrls = hotelPhotos.filter(url => {
          if (!url || hotelOnlyUrls.has(normalizeUrl(url))) return false;
          hotelOnlyUrls.add(normalizeUrl(url));
          return true;
        });
        let hidx = 1;
        for (let i = 0; i < uniqueHotelUrls.length; i += 6) {
          const chunk = uniqueHotelUrls.slice(i, i + 6);
          const results = await processChunk(chunk);
          for (const result of results) {
            if (!result) continue;
            const filename = `${String(hidx).padStart(2, "0")}${result.low ? "_LOW_QUALITY" : ""}.${result.ext}`;
            hotelPhotoFolder.file(filename, result.blob);
            hidx++;
            photoCount++;
          }
        }
      }

      if (photoCount > 0) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = `${folderName}_photos.zip`;
        a.click();
        URL.revokeObjectURL(zipBlob);
        setStatus(t().done(finalRooms.length, photoCount), "success");
      } else {
        setStatus(t().noPhotos(finalRooms.length), "success");
      }
    } else {
      setStatus(t().noJszip(finalRooms.length), "success");
    }

  } catch (err) {
    console.error("[Scraper] 에러:", err);
    setStatus("Error: " + err.message, "error");
  }

  btn.disabled = false;
});

setLang(currentLang);
document.getElementById('btnKR').addEventListener('click', () => setLang('kr'));
document.getElementById('btnEN').addEventListener('click', () => setLang('en'));
checkForUpdates();

// ── Hotel Info ──
const FIELD_ORDER = [
  "hotel_id", "name_en", "name_local", "address", "postal_code",
  "checkin_time", "checkin_end", "checkout_start", "checkout_time",
  "front_desk_hours", "built_year", "renovated_year", "room_count",
  "floor_count", "restaurant_count", "bar_count", "breakfast_style",
  "breakfast_price", "breakfast_hours", "airport_transfer",
  "airport_transfer_fee", "parking", "parking_type", "parking_price",
  "room_service", "voltage",
];

let currentHotelData = null;

const COUNTRY_LOCALE_MAP = {
  "south korea": "ko-KR", "korea": "ko-KR",
  "japan": "ja-JP", "china": "zh-CN", "hong kong": "zh-HK",
  "indonesia": "id-ID", "vietnam": "vi-VN", "thailand": "th-TH",
  "philippines": "en-PH", "malaysia": "ms-MY", "singapore": "en-SG",
};

const fetchLocalData = async (hotelId, locale) => {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const checkIn = fmt(today);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const checkOut = fmt(tomorrow);
  const body = {
    hotelId: parseInt(hotelId), checkIn, checkOut,
    adult: 2, child: 0, childrenAgeList: [], roomQuantity: 1, isBusiness: false,
    location: { geo: { cityID: 0 } }, mapType: "", extra: { useHotPoiQuery: true },
    feature: [], filterInfoList: [], hotelCertificateSwitch: "F",
    hotelInfoOptions: [{ key: "HotelStay", value: "T" }, { key: "InterHome", value: "T" }],
    policyOptions: ["divideHotelPolicy", "EnableNewPetPolicy", "EnableChildrenTipPopLayer", "JapanChildPriceSwitch"],
    policyPageCode: "trip-hotel-detail",
    versionControl: [{ key: "EnableFacilityV2", value: "B" }, { key: "UseTokenIcon", value: "T" }, { key: "MVPv2", value: "T" }],
    head: { platform: "PC", cver: "0", bu: "IBU", group: "trip", locale }
  };
  try {
    const res = await fetch("https://www.trip.com/restapi/soa2/33269/getHotelDetailAggregate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const json = await res.json();
    return json?.data || null;
  } catch (e) { return null; }
};

const extractScript = () => {
  const data = {};
  const url = window.location.href;
  const text = document.body?.innerText || "";

  const subtractOneMin = (timeStr) => {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return timeStr;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    min -= 1;
    if (min < 0) { min = 59; h -= 1; }
    if (h < 0) h = 23;
    return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
  };

  const subtractThirtyMin = (timeStr) => {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return timeStr;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    min -= 30;
    if (min < 0) { min += 60; h -= 1; }
    if (h < 0) h = 23;
    return `${String(h).padStart(2,"00")}:${String(min).padStart(2,"0")}`;
  };

  const idM = url.match(/hotelId=(\d+)/) || url.match(/\/hotels\/[^/]+-(\d+)\//);
  data.hotel_id = idM ? idM[1] : "";
  data.name_en = document.querySelector("h1")?.innerText?.trim() || "";

  const addrEl = document.querySelector('[class*="address"], [class*="Address"]');
  let rawAddr = addrEl?.innerText?.trim() || "";
  rawAddr = rawAddr.replace(/show on map/gi, "").replace(/\n/g, " ").trim();
  const postalM = rawAddr.match(/\b(\d{5})\b/);
  data.postal_code = postalM ? postalM[1] : "";
  data.address = rawAddr;

  let countryRaw = "";
  for (const s of document.querySelectorAll("script:not([src])")) {
    const t = s.textContent || "";
    if (t.includes('"countryName"')) {
      const m = t.match(/"countryName"\s*:\s*"([^"]+)"/);
      if (m) { countryRaw = m[1].toLowerCase(); break; }
    }
  }
  if (!countryRaw) {
    if (/south korea|korea/i.test(text)) countryRaw = "south korea";
    else if (/japan/i.test(text)) countryRaw = "japan";
    else if (/hong kong/i.test(text)) countryRaw = "hong kong";
    else if (/china/i.test(text)) countryRaw = "china";
    else if (/indonesia/i.test(text)) countryRaw = "indonesia";
    else if (/vietnam/i.test(text)) countryRaw = "vietnam";
    else if (/thailand/i.test(text)) countryRaw = "thailand";
    else if (/philippines/i.test(text)) countryRaw = "philippines";
    else if (/malaysia/i.test(text)) countryRaw = "malaysia";
    else if (/singapore/i.test(text)) countryRaw = "singapore";
  }
  data._countryRaw = countryRaw;
  data._hotelId = data.hotel_id;

  const checkDivs = document.querySelectorAll('[class*="hotelPolicy-check__"]');
  let checkinRaw = "", checkoutRaw = "";
  for (const div of checkDivs) {
    const subTitle = div.querySelector('[class*="hotelPolicy-subTitle__"]')?.innerText?.trim() || "";
    const desc = div.querySelector('[class*="hotelPolicy-check_desc__"]')?.innerText?.trim() || "";
    if (subTitle.toLowerCase().includes("check-in")) checkinRaw = desc;
    else if (subTitle.toLowerCase().includes("check-out")) checkoutRaw = desc;
  }

  let frontDeskRaw = "";
  const policyRight = document.querySelector('[class*="hotelPolicy-item_right__"]');
  if (policyRight) {
    for (const p of policyRight.querySelectorAll("p")) {
      if (p.innerText?.toLowerCase().includes("front desk")) {
        frontDeskRaw = p.innerText.replace(/Front desk hours?:\s*/i, "").trim();
      }
    }
  }

  const is24h = /24\/7|24 hours/i.test(frontDeskRaw);
  const cinRangeM = checkinRaw.match(/(\d{1,2}:\d{2})\s*[–\-~]\s*(\d{1,2}:\d{2})/);
  const coutRangeM = checkoutRaw.match(/(\d{1,2}:\d{2})\s*[–\-~]\s*(\d{1,2}:\d{2})/);
  const cinM = checkinRaw.match(/(\d{1,2}:\d{2})/);
  const coutM = checkoutRaw.match(/(\d{1,2}:\d{2})/);

  if (cinRangeM && coutRangeM) {
    data.checkin_time   = cinRangeM[1];
    data.checkin_end    = cinRangeM[2] === "24:00" ? "23:59" : cinRangeM[2];
    data.checkout_start = coutRangeM[1];
    data.checkout_time  = coutRangeM[2];
  } else {
    data.checkin_time   = cinM  ? cinM[1]  : checkinRaw;
    data.checkin_end    = "23:59";
    data.checkout_start = "00:00";
    data.checkout_time  = coutM ? coutM[1] : checkoutRaw;
  }

  if (data.checkout_start && data.checkout_start === data.checkout_time)
    data.checkout_start = subtractOneMin(data.checkout_start);
  if (data.checkin_time && data.checkin_time === data.checkin_end)
    data.checkin_time = subtractThirtyMin(data.checkin_time);

  data.front_desk_hours = (is24h || !frontDeskRaw) ? "Yes" : "No";

  for (const s of document.querySelectorAll("script:not([src])")) {
    const t = s.textContent || "";
    if (!data.built_year && t.includes('"openYear"')) {
      const m = t.match(/"openYear"\s*:\s*"?(\d{4})"?/);
      if (m) data.built_year = m[1];
    }
    if (!data.room_count && t.includes('"roomCount"')) {
      const m = t.match(/"roomCount"\s*:\s*(\d+)/);
      if (m) data.room_count = m[1];
    }
    if (!data.hotel_id && t.includes('"hotelId"')) {
      const m = t.match(/"hotelId"\s*:\s*(\d+)/);
      if (m) data.hotel_id = m[1];
    }
  }

  if (!data.built_year) {
    const m = text.match(/Opened[:\s]+(\d{4})/i);
    if (m) data.built_year = m[1];
  }
  if (!data.room_count) {
    const m = text.match(/Number of Rooms[:\s]+(\d+)/i) || text.match(/(\d+)\s*air-conditioned rooms/i);
    if (m) data.room_count = m[1];
  }
  if (!data.renovated_year) {
    const m = text.match(/[Rr]enovated?\s*(?:in\s*)?:?\s*(\d{4})/);
    data.renovated_year = m ? m[1] : (data.built_year || "1");
  }

  const floorM = text.match(/(\d+)(?:th|rd|nd|st)-floor/i) || text.match(/(\d+)\s*floors?/i);
  if (floorM) data.floor_count = floorM[1];

  const bfEls = document.querySelectorAll('[class*="breakfast"], [class*="Breakfast"]');
  for (const el of bfEls) {
    const t2 = el.innerText || "";
    if (!data.breakfast_style) {
      const m = t2.match(/Style[:\s]+(\w+)/i);
      if (m) data.breakfast_style = m[1];
    }
    if (!data.breakfast_hours) {
      const m = t2.match(/Opening hours?[:\s]+([^\n]+)/i);
      if (m) data.breakfast_hours = m[1].trim();
    }
    if (!data.breakfast_price) {
      const m = t2.match(/(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)/i);
      if (m) data.breakfast_price = m[1].replace(/,/g, "");
    }
  }
  if (!data.breakfast_style && /buffet/i.test(text)) data.breakfast_style = "Buffet";
  if (!data.breakfast_hours) {
    const m = text.match(/\[Mon\s*-\s*Sun\]\s*([\d:]+\s*-\s*[\d:]+)/i);
    if (m) data.breakfast_hours = m[1];
  }
  if (!data.breakfast_price) {
    const bfPriceM = text.match(/(?:breakfast|buffet)[^\n]{0,80}(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)/i)
                  || text.match(/(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)[^\n]{0,50}(?:breakfast|buffet|per person)/i);
    if (bfPriceM) data.breakfast_price = bfPriceM[1].replace(/,/g, "");
  }

  const hasPickup = /airport\s*(pickup|shuttle)/i.test(text);
  const hasDrop = /airport\s*drop/i.test(text);
  data.airport_transfer = (hasPickup || hasDrop) ? "Yes" : "No";
  if (data.airport_transfer === "Yes") {
    if (/airport\s*(?:pickup|shuttle|drop)[^.]*free/i.test(text) || /free[^.]*airport\s*(?:pickup|shuttle|drop)/i.test(text)) {
      data.airport_transfer_fee = "Free";
    } else {
      const feeM = text.match(/airport\s*(?:pickup|shuttle|drop)[^.]*?(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)/i)
                || text.match(/(?:KRW|USD|CNY|JPY|HKD)\s*([\d,]+)[^.]*airport\s*(?:pickup|shuttle|drop)/i);
      data.airport_transfer_fee = feeM ? feeM[1].replace(/,/g, "") : "-";
    }
  } else {
    data.airport_transfer_fee = "-";
  }

  const parkingUnavail = Array.from(document.querySelectorAll('[class*="hotelFacility-popular_descUnavail__"]'))
    .find(el => (el.innerText || "").toLowerCase().includes("parking"));
  const parkingFreeLabel = Array.from(document.querySelectorAll('[aria-label*="parking"], [aria-label*="Parking"]'))
    .find(el => (el.getAttribute("aria-label") || "").toLowerCase().includes("free"));
  const parkingFreeTag = document.querySelector('[class*="hotelFacility-popular_free__"]');
  const parkingDescEls = document.querySelectorAll('[class*="hotelFacility-normal_descA__"]');
  let parkingDescText = "";
  for (const el of parkingDescEls) {
    const t2 = el.innerText || "";
    if (/parking/i.test(t2) || /charge/i.test(t2) || /KRW|JPY|CNY|HKD|USD/i.test(t2)) {
      parkingDescText = t2; break;
    }
  }

  if (parkingUnavail) {
    data._parking = "No"; data._parking_type = "-"; data._parking_price = "-";
  } else if (parkingFreeLabel || parkingFreeTag) {
    data._parking = "Yes"; data._parking_type = "Free"; data._parking_price = "-";
  } else if (parkingDescText) {
    const priceM = parkingDescText.match(/(KRW|JPY|CNY|HKD|USD)\s*([\d,]+)/i);
    data._parking = "Yes";
    data._parking_type = "Paid";
    data._parking_price = priceM ? `${priceM[1].toUpperCase()} ${priceM[2].replace(/,/g, "")}` : "-";
  } else {
    data._parking = null; data._parking_type = null; data._parking_price = null;
  }

  data.room_service = /room\s*service/i.test(text) ? "Yes" : "";
  data.voltage = {
    "south korea": "220V", "korea": "220V", "japan": "100V", "china": "220V",
    "hong kong": "220V", "indonesia": "220V", "vietnam": "220V", "thailand": "220V",
    "philippines": "220V", "malaysia": "240V", "singapore": "230V",
  }[countryRaw] || "";

  return data;
};

const hotelAutofillScript = (fieldData) => {
  const results = [];
  const errorNotif = document.querySelector('.c-notification__message');
  if (errorNotif && errorNotif.textContent.includes('Failed to fetch data')) {
    location.reload();
    return [{ field: "Reload", status: "reloaded" }];
  }

  if (!fieldData.front_desk_hours) fieldData.front_desk_hours = "Yes";
  if (!fieldData.checkin_time)     fieldData.checkin_time     = "14:00";
  if (!fieldData.checkin_end)      fieldData.checkin_end      = "23:59";
  if (!fieldData.checkout_start)   fieldData.checkout_start   = "00:00";
  if (!fieldData.checkout_time)    fieldData.checkout_time    = "12:00";
  if (!fieldData.room_service)     fieldData.room_service     = "No";
  if (!fieldData.parking)          fieldData.parking          = "No";
  if (!fieldData.airport_transfer) fieldData.airport_transfer = "No";

  const setTimeInput = (inputName, timeStr) => {
    if (!timeStr) return false;
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    const formatted = `${String(parseInt(m[1])).padStart(2,"0")}:${String(parseInt(m[2])).padStart(2,"0")}`;
    const input = document.querySelector(`input[name="${inputName}"]`);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, formatted);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const setTextInput = (inputName, value) => {
    const val = (!value || value === "-") ? "0" : value;
    const input = document.querySelector(`input[name="${inputName}"]`);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const setYearInput = (inputName, value) => {
    const val = (!value || value === "-") ? "1" : value;
    const input = document.querySelector(`input[name="${inputName}"]`);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const clickRadio = (name, value) => {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (!radio) return false;
    radio.click();
    return true;
  };

  const fdOk = clickRadio("hotel,hotelProperties,frontDeskType",
    fieldData.front_desk_hours === "Yes" ? "HAS_24_HOUR_FRONT_DESK" : "NOT_HAS_24_HOUR_FRONT_DESK");
  results.push({ field: "24/7", status: fdOk ? "ok" : "not_found" });

  if (fieldData.front_desk_hours === "Yes") {
    results.push({ field: "Check-in Start", status: setTimeInput("hotel,hotelProperties,checkInTime", fieldData.checkin_time) ? "ok" : "not_found" });
    results.push({ field: "Check-out End", status: setTimeInput("hotel,hotelProperties,checkOutTime", fieldData.checkout_time) ? "ok" : "not_found" });
  } else {
    results.push({ field: "Check-in Start", status: setTimeInput("hotel,hotelProperties,checkInTimeRange-startDate", fieldData.checkin_time) ? "ok" : "not_found" });
    results.push({ field: "Check-in End", status: setTimeInput("hotel,hotelProperties,checkInTimeRange-endDate", fieldData.checkin_end) ? "ok" : "not_found" });
    results.push({ field: "Check-out Start", status: setTimeInput("hotel,hotelProperties,checkOutTimeRange-startDate", fieldData.checkout_start) ? "ok" : "not_found" });
    results.push({ field: "Check-out End", status: setTimeInput("hotel,hotelProperties,checkOutTimeRange-endDate", fieldData.checkout_time) ? "ok" : "not_found" });
  }

  results.push({ field: "Built Year", status: setYearInput("hotel,hotelProperties,builtYear", fieldData.built_year) ? "ok" : "not_found" });
  results.push({ field: "Renovated Year", status: setYearInput("hotel,hotelProperties,lastRenovatedYear", fieldData.renovated_year) ? "ok" : "not_found" });
  results.push({ field: "Rooms", status: setTextInput("hotel,hotelProperties,numRooms", fieldData.room_count) ? "ok" : "not_found" });
  results.push({ field: "Floors", status: setTextInput("hotel,hotelProperties,numFloors", fieldData.floor_count) ? "ok" : "not_found" });
  results.push({ field: "Restaurants", status: setTextInput("hotel,hotelProperties,numRestaurants", fieldData.restaurant_count) ? "ok" : "not_found" });
  results.push({ field: "Bars", status: setTextInput("hotel,hotelProperties,numBars", fieldData.bar_count) ? "ok" : "not_found" });

  const voltageVal = (fieldData.voltage || "").replace(/[Vv]/g, "");
  results.push({ field: "Voltage", status: setTextInput("hotel,hotelProperties,roomVoltage", voltageVal) ? "ok" : "not_found" });
  results.push({ field: "Room Service", status: clickRadio("hotel,hotelProperties,roomServiceType", fieldData.room_service === "Yes" ? "AVAILABLE" : "NOT_AVAILABLE") ? "ok" : "not_found" });

  const pkAvailable = fieldData.parking && fieldData.parking !== "No" && fieldData.parking !== "";
  results.push({ field: "Parking", status: clickRadio("hotel,hotelProperties,parkingType", pkAvailable ? "AVAILABLE" : "NOT_AVAILABLE") ? "ok" : "not_found" });
  if (pkAvailable && fieldData.parking_type) {
    results.push({ field: "Parking Fee Type", status: clickRadio("hotel,hotelProperties,parkingFeeType", fieldData.parking_type === "Free" ? "FREE" : "CHARGE") ? "ok" : "not_found" });
  }

  if (fieldData.breakfast_price && fieldData.breakfast_price !== "-") {
    results.push({ field: "Breakfast Price", status: setTextInput("hotel,hotelProperties,breakfastCharge", fieldData.breakfast_price) ? "ok" : "not_found" });
  }

  const atValue = fieldData.airport_transfer === "Yes" ? "true" : "false";
  results.push({ field: "Airport Transfer", status: clickRadio("hotel,hotelProperties,isAvailableAirportTransfer", atValue) ? "ok" : "not_found" });
  if (atValue === "true" && fieldData.airport_transfer_fee && fieldData.airport_transfer_fee !== "-") {
    results.push({ field: "Transfer Fee", status: setTextInput("hotel,hotelProperties,airportTransferFee", fieldData.airport_transfer_fee) ? "ok" : "not_found" });
  }

  const saveBtn = document.querySelector('button.c-btn--variant-orange span');
  if (saveBtn) { saveBtn.closest('button').click(); results.push({ field: "Save", status: "ok" }); }
  else { results.push({ field: "Save", status: "not_found" }); }

  return results;
};

const hotelAddressScript = (fieldData) => {
  const results = [];

  const setTextInput = (inputName, value) => {
    if (!value || value === "-") return false;
    const input = document.querySelector(`input[name="${inputName}"]`);
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

  results.push({ field: "Postal Code", status: setTextInput("hotel,globalAddress,postalCode", fieldData.postal_code) ? "ok" : "not_found" });

  if (fieldData.address && fieldData.address !== "-") {
    const yesRadio = document.querySelector('input[type="radio"][value="yes"]');
    if (yesRadio) {
      yesRadio.click();
      yesRadio.dispatchEvent(new Event('change', { bubbles: true }));
      results.push({ field: "Local Address Yes", status: "ok" });
      results.push({ field: "Local Address", status: setTextarea("hotel,localAddress,lines", fieldData.address) ? "ok" : "not_found" });
    } else {
      results.push({ field: "Local Address Yes", status: "not_found" });
    }
  }

  const saveBtn = document.querySelector('button.c-btn--variant-orange span');
  if (saveBtn) { saveBtn.closest('button').click(); results.push({ field: "Address Save", status: "ok" }); }
  else { results.push({ field: "Address Save", status: "not_found" }); }

  return results;
};

async function runHotelAutofill(tabId) {
  setExtractStatus(t().hotelAutofillDetails);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: hotelAutofillScript,
      args: [currentHotelData],
    });

    const res = results?.[0]?.result || [];
    if (res.find(r => r.field === "Reload")) {
      setExtractStatus(t().hotelAutofillReload, "error");
      return;
    }

    await new Promise(r => setTimeout(r, 2000));

    setExtractStatus(t().hotelAutofillOverview);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const tab = Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === "Overview");
        if (tab) tab.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (localName) => {
        if (!localName) return;
        const input = document.querySelector('input[name="hotel,accommodationLocaleName"]');
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, localName);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const saveBtn = document.querySelector('button.c-btn--variant-orange span');
        if (saveBtn) saveBtn.closest('button').click();
      },
      args: [currentHotelData.name_local || ""]
    });

    await new Promise(r => setTimeout(r, 2000));

    setExtractStatus(t().hotelAutofillAddress);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const tab = Array.from(document.querySelectorAll('a.c-sidebar-item')).find(el => el.textContent.trim() === "Address");
        if (tab) tab.click();
      }
    });

    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      const popupResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const confirmBtn = Array.from(document.querySelectorAll('button.c-btn--variant-orange span'))
            .find(el => el.textContent.trim().includes('Yes, move'));
          if (confirmBtn) { confirmBtn.closest('button').click(); return true; }
          return false;
        }
      });
      if (popupResult?.[0]?.result) break;
    }

    await new Promise(r => setTimeout(r, 1500));
    await chrome.scripting.executeScript({
      target: { tabId },
      func: hotelAddressScript,
      args: [currentHotelData],
    });

    setExtractStatus(t().hotelAutofillDone, "success");
  } catch (e) {
    setExtractStatus("Error: " + e.message, "error");
  }
}

document.getElementById("extractBtn").addEventListener("click", async () => {
  const btn = document.getElementById("extractBtn");
  btn.disabled = true;
  currentHotelData = null;
  setExtractStatus(t().extracting);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url?.includes("trip.com")) {
      setExtractStatus(t().extractNotTrip, "error");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractScript,
    });

    const data = results?.[0]?.result;
    if (!data) { setExtractStatus(t().extractFail, "error"); return; }

    const countryRaw = data._countryRaw || "";
    const locale = COUNTRY_LOCALE_MAP[countryRaw] || "en-XX";

    const localApiData = await fetchLocalData(data._hotelId, locale);
    if (localApiData) {
      const nameInfo = localApiData.hotelBaseInfo?.nameInfo || {};
      data.name_local = nameInfo.nameLocale || nameInfo.name || data.name_en;
      const rawAddr = localApiData.hotelPositionInfo?.address || "";
      const cleanAddr = rawAddr.replace(/show on map/gi, "").replace(/,?\s*\d{5}\s*,?/g, "").replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim();
      if (cleanAddr) data.address = cleanAddr;
      let restaurantCount = 0, barCount = 0;
      for (const cat of localApiData.hotelFacilityPopV2?.hotelFacility || []) {
        for (const group of cat.categoryList || []) {
          for (const item of group.list || []) {
            const desc = (item.facilityDesc || "").toLowerCase();
            if (desc.includes("restaurant") || desc.includes("cafe") || desc.includes("dining")) restaurantCount++;
            if (desc.includes("bar") || desc.includes("lounge")) barCount++;
          }
        }
      }
      data.restaurant_count = restaurantCount > 0 ? String(restaurantCount) : "-";
      data.bar_count = barCount > 0 ? String(barCount) : "-";
    } else {
      data.restaurant_count = "-";
      data.bar_count = "-";
    }

    if (data._parking !== null && data._parking !== undefined) {
      data.parking = data._parking;
      data.parking_type = data._parking_type;
      data.parking_price = data._parking_price;
    } else {
      data.parking = "";
      data.parking_type = "-";
      data.parking_price = "-";
    }

    delete data._countryRaw;
    delete data._hotelId;
    delete data._parking;
    delete data._parking_type;
    delete data._parking_price;

    currentHotelData = data;
    setExtractStatus(t().extractDone(data.name_en || (currentLang === 'kr' ? '호텔' : 'Hotel')), "success");

    const allTabs = await chrome.tabs.query({});
    const teraTab = allTabs.find(t => t.url?.includes("traveloka.com"));
    if (teraTab) {
      await runHotelAutofill(teraTab.id);
    }

  } catch (e) {
    setExtractStatus("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("sheetBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url?.includes("trip.com")) {
    setExtractStatus(t().extractNotTrip, "error");
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const HOTEL_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz384ObCq18jDZIpzbmTDOQOSO00a62xS7urqFoIV1ksyxhPz3-rkpkcn6KCf6OEGGG/exec";
      const hotelFacilityMap = [
        {keywords:["balcony","terrace"],code:"BALCONY_TERRACE"},
        {keywords:["connecting room","interconnecting"],code:"INTERCONNECTING_ROOMS_AVAILABLE"},
        {keywords:["private pool"],code:"PRIVATE_POOL"},
        {keywords:["shower"],code:"SHOWER"},
        {keywords:["bathrobes","bathrobe"],code:"BATHROBES"},
        {keywords:["bathtub"],code:"BATHTUB"},
        {keywords:["hot water","heated water"],code:"HEATED_WATER"},
        {keywords:["air conditioning"],code:"AIR_CONDITIONING"},
        {keywords:["hair dryer"],code:"HAIR_DRYER"},
        {keywords:["desk"],code:"DESK"},
        {keywords:["free wi-fi","wi-fi in public","wi-fi in room","wifi","free internet"],code:"INTERNET_ACCESS_WIFI_COMPLIMENTARY"},
        {keywords:["microwave"],code:"MICROWAVE"},
        {keywords:["washing machine"],code:"WASHING_MACHINE"},
        {keywords:["iron","ironing"],code:"IRONING_FACILITIES"},
        {keywords:["shared bathroom"],code:"SHARED_BATHROOM"},
        {keywords:["television","lcd tv"],code:"TELEVISION"},
        {keywords:["refrigerator"],code:"REFRIGERATOR"},
        {keywords:["mini bar","minibar"],code:"MINI_BAR"},
        {keywords:["electric kettle","coffee","tea"],code:"COFFEE_TEA_MAKER"},
        {keywords:["bottled water"],code:"COMPLIMENTARY_BOTTLED_WATER"}
      ];

      function extractFacilities(list) {
        const texts = [];
        list.forEach(cat => {
          if (cat.title) texts.push(cat.title.toLowerCase());
          if (cat.categoryList) cat.categoryList.forEach(g => {
            if (g.list) g.list.forEach(item => {
              if (item.facilityDesc) texts.push(item.facilityDesc.toLowerCase());
            });
          });
        });
        const combined = texts.join(" ");
        const result = [];
        hotelFacilityMap.forEach(item => {
          if (item.keywords.some(k => combined.includes(k)) && !result.includes(item.code))
            result.push(item.code);
        });
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
      const addressParts = rawAddress.split(",").map(p => p.trim()).filter(Boolean);
      const filtered = addressParts.filter(p => !/^\d{4,}$/.test(p) && !/south korea|korea|japan|thailand|indonesia|singapore|malaysia|vietnam|philippines|taiwan|china|australia|india|united arab emirates|saudi|new zealand|fiji|macau|hong kong/i.test(p));
      const address = filtered.reverse().join(", ");
      const starEl = document.querySelector('[class*="hotelStarLevel"]');
      const starRating = starEl ? (starEl.getAttribute('aria-label') || "0") : "0";
      const policyEls = document.querySelectorAll('[class*="hotelPolicyNew_hotelPolicy-check_desc"]');
      const checkInRaw = policyEls[0] ? policyEls[0].innerText.trim() : "";
      const checkOutRaw = policyEls[1] ? policyEls[1].innerText.trim() : "";
      const checkIn = checkInRaw.match(/\d{1,2}:\d{2}/) ? checkInRaw.match(/\d{1,2}:\d{2}/)[0] : "14:00";
      const checkOut = checkOutRaw.match(/\d{1,2}:\d{2}/) ? checkOutRaw.match(/\d{1,2}:\d{2}/)[0] : "12:00";
      const a = rawAddress.toLowerCase();
      let currency = "KRW";
      if (/japan/.test(a)) currency = "JPY";
      else if (/hong kong/.test(a)) currency = "HKD";
      else if (/thailand/.test(a)) currency = "THB";
      else if (/indonesia/.test(a)) currency = "IDR";
      else if (/singapore/.test(a)) currency = "SGD";
      else if (/malaysia/.test(a)) currency = "MYR";
      else if (/vietnam/.test(a)) currency = "VND";
      else if (/philippines/.test(a)) currency = "PHP";
      else if (/taiwan/.test(a)) currency = "TWD";
      else if (/china/.test(a)) currency = "CNY";
      else if (/australia/.test(a)) currency = "AUD";
      else if (/india/.test(a)) currency = "INR";
      else if (/united arab emirates|uae/.test(a)) currency = "AED";
      else if (/saudi/.test(a)) currency = "SAR";
      else if (/new zealand/.test(a)) currency = "NZD";
      else if (/fiji/.test(a)) currency = "FJD";
      else if (/macau|macao/.test(a)) currency = "MOP";
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
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ type: "hotel", hotelName, address, latitude: lat, longitude: lng, starRating, checkIn, checkOut, currency, accommodationType, hotelFacilities })
      });
      alert("Sent: " + hotelName + "\nFacilities: " + hotelFacilities);
    }
  });

  setExtractStatus(currentLang === 'kr' ? "Sheet로 전송됨" : "Sent to Sheet", "success");
});