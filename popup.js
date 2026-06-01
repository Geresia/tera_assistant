const STRINGS = {
  kr: {
    startBtn: "스캔 시작",
    hotelNamePlaceholder: "호텔 이름 입력 (사진용)",
    defaultStatus: "Trip.com 호텔 페이지에서 실행하세요.",
    noHotelId: "Hotel ID를 입력하세요.",
    notTripPage: "Trip.com 호텔 페이지에서 실행하세요.",
    scan1: "스캔 중...",
    scan1done: (rooms, total, photos) => `완료: ${total}개 객실 | 호텔사진: ${photos}장`,
    noRooms: "객실을 찾지 못했습니다.",
    sending: "전송 중...",
    sent: (n) => `전송 완료! 총 ${n}개 객실`,
    zipping: "사진 ZIP 생성 중...",
    done: (rooms, photos) => `완료! 객실 ${rooms}개 + 사진 ${photos}장`,
    noPhotos: (n) => `전송 완료! 총 ${n}개 객실 (사진 없음)`,
    noJszip: (n) => `전송 완료! 총 ${n}개 객실 (JSZip 없음)`,
    update: (v) => `업데이트 있어요! v${v} → 클릭해서 다운로드`,
  },
  en: {
    startBtn: "Start Scan",
    hotelNamePlaceholder: "Enter Hotel Name (for photos)",
    defaultStatus: "Run this on a Trip.com hotel page.",
    noHotelId: "Please enter Hotel ID.",
    notTripPage: "Please run this on a Trip.com hotel page.",
    scan1: "Scanning...",
    scan1done: (rooms, total, photos) => `Done: ${total} rooms | Hotel photos: ${photos}`,
    noRooms: "No rooms found.",
    sending: "Sending...",
    sent: (n) => `Sent! Total ${n} rooms`,
    zipping: "Creating photo ZIP...",
    done: (rooms, photos) => `Done! ${rooms} rooms + ${photos} photos`,
    noPhotos: (n) => `Sent! ${n} rooms (no photos)`,
    noJszip: (n) => `Sent! ${n} rooms (JSZip missing)`,
    update: (v) => `Update available! v${v} → Click to download`,
  }
};

let currentLang = localStorage.getItem('scraperLang') || 'kr';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('scraperLang', lang);
  document.getElementById('btnKR').className = 'lang-btn' + (lang === 'kr' ? ' active' : '');
  document.getElementById('btnEN').className = 'lang-btn' + (lang === 'en' ? ' active' : '');
  document.getElementById('startBtn').textContent = STRINGS[lang].startBtn;
  document.getElementById('hotelName').placeholder = STRINGS[lang].hotelNamePlaceholder;
  document.getElementById('status').textContent = STRINGS[lang].defaultStatus;
  const banner = document.getElementById('updateBanner');
  if (banner.dataset.version) {
    banner.textContent = STRINGS[lang].update(banner.dataset.version);
  }
}

function t() { return STRINGS[currentLang]; }

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyHBK7PHgEfx-cqeAgS68gMcfW2jGiDyAer3huebmICKFzr5t318hORDVqCDFo1UVDYoQ/exec";
const CURRENT_VERSION = "4.3";
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
  el.className = type;
  console.log("[Scraper]", msg);
}

async function scrapeTab(tabId, includeHotelPhotos = false) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => { window.__scrapeRoomsLoaded = false; }
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
    world: "MAIN"
  });
  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
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
      target: { tabId },
      world: "MAIN",
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
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w < TARGET_W * NEAR_THRESHOLD || h < TARGET_H * NEAR_THRESHOLD) return true;
    const ratio = w / h;
    if (ratio < 0.5 || ratio > 2.0) return true;
  }
  const wMatch = url.match(/_W_(\d+)_(\d+)_/);
  if (wMatch) {
    const w = Number(wMatch[1]);
    const h = Number(wMatch[2]);
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
      canvas.width = newW;
      canvas.height = newH;
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
  if (blob.size < 10 * 1024) return { blob, isLow: true };
  return new Promise(resolve => {
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;
      URL.revokeObjectURL(objUrl);
      if (ratio < 0.5 || ratio > 2.0) { resolve({ blob, isLow: true }); return; }

      if (w > MAX_W || h > MAX_H) {
        const scale = Math.min(MAX_W / w, MAX_H / h);
        const newW = Math.round(w * scale);
        const newH = Math.round(h * scale);
        const downscaled = await resizeBlob(blob, newW, newH);
        resolve({ blob: downscaled, isLow: false });
        return;
      }

      if (w >= TARGET_W && h >= TARGET_H) { resolve({ blob, isLow: false }); return; }
      if (w >= TARGET_W * NEAR_THRESHOLD && h >= TARGET_H * NEAR_THRESHOLD) {
        const upscaled = await resizeBlob(blob, TARGET_W, TARGET_H);
        resolve({ blob: upscaled, isLow: false });
        return;
      }
      resolve({ blob, isLow: true });
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve({ blob, isLow: false }); };
    img.src = objUrl;
  });
}

function sanitizeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

document.getElementById("startBtn").addEventListener("click", async () => {
  const hotelId = document.getElementById("hotelId").value.trim();
  const hotelName = document.getElementById("hotelName").value.trim() || hotelId;

  if (!hotelId) {
    setStatus(t().noHotelId, "error");
    return;
  }

  const btn = document.getElementById("startBtn");
  btn.disabled = true;

  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const baseUrl = currentTab.url;

    if (!baseUrl.includes("trip.com/hotels")) {
      setStatus(t().notTripPage, "error");
      btn.disabled = false;
      return;
    }

    const allRooms = new Map();

    setStatus(t().scan1);
    const result1 = await scrapeTab(currentTab.id);
    const hotelPhotos = result1.hotelPhotos || [];
    (result1.rooms || []).forEach(r => { if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r); });
    setStatus(t().scan1done((result1.rooms||[]).length, allRooms.size, hotelPhotos.length));

    const finalRooms = [...allRooms.values()];

    if (finalRooms.length === 0) {
      setStatus(t().noRooms, "error");
      btn.disabled = false;
      return;
    }

    setStatus(t().sending);
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        hotelId,
        source: "Trip.com",
        sourceUrl: baseUrl,
        isKoreanHotel: /korea|\/kr\/|countryId=1\b/i.test(baseUrl),
        rooms: finalRooms
      })
    });

    setStatus(t().sent(finalRooms.length), "success");

    if (typeof JSZip !== "undefined") {
      setStatus(t().zipping);
      const zip = new JSZip();
      const hotelFolder = zip.folder(sanitizeName(hotelName));
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
        const hotelPhotoFolder = hotelFolder.folder("호텔 전체");
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
        a.download = `${sanitizeName(hotelName)}_photos.zip`;
        a.click();
        URL.revokeObjectURL(zipUrl);
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
  document.getElementById("hotelId").focus();
});

setLang(currentLang);
document.getElementById('btnKR').addEventListener('click', () => setLang('kr'));
document.getElementById('btnEN').addEventListener('click', () => setLang('en'));
checkForUpdates();
