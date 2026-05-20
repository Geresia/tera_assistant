const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyHBK7PHgEfx-cqeAgS68gMcfW2jGiDyAer3huebmICKFzr5t318hORDVqCDFo1UVDYoQ/exec";
const CURRENT_VERSION = "3.2";
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/Geresia/trip_scraper_extension/main/version.json";

async function checkForUpdates() {
  try {
    const res = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
    const data = await res.json();
    if (data.version && data.version !== CURRENT_VERSION) {
      const banner = document.getElementById("updateBanner");
      banner.style.display = "block";
      banner.textContent = `🔔 Update available! v${data.version} → Click to download`;
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

function getDateOffsetUrl(baseUrl, offsetDays) {
  const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const checkInMatch = baseUrl.match(/checkIn=([\d-]+)/i);
  if (!checkInMatch) return null;
  const base = new Date(checkInMatch[1]);
  const newCheckIn = new Date(base);
  newCheckIn.setDate(base.getDate() + offsetDays);
  const newCheckOut = new Date(newCheckIn);
  newCheckOut.setDate(newCheckIn.getDate() + 1);
  return baseUrl
    .replace(/checkIn=[\d-]+/i, `checkIn=${fmt(newCheckIn)}`)
    .replace(/checkOut=[\d-]+/i, `checkOut=${fmt(newCheckOut)}`);
}

function waitForTabLoad(tabId) {
  return new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 8000);
      }
    });
  });
}

async function scrapeTab(tabId, includeHotelPhotos = false) {
  // content.js를 MAIN world에 inject
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
    world: "MAIN"
  });
  await new Promise(r => setTimeout(r, 800));

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (withHotelPhotos) => {
      window.__scrapeResult = null;
      window.__scrapeDone = false;
      if (typeof window.__scrapeRooms !== "function") {
        window.__scrapeResult = { rooms: [], hotelPhotos: [] };
        window.__scrapeDone = true;
        return;
      }
      window.__scrapeRooms(withHotelPhotos)
        .then(result => { window.__scrapeResult = result; window.__scrapeDone = true; })
        .catch(() => { window.__scrapeResult = { rooms: [], hotelPhotos: [] }; window.__scrapeDone = true; });
    },
    args: [includeHotelPhotos]
  });

  // window 변수 폴링 (최대 120초)
  for (let i = 0; i < 240; i++) {
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

// URL 패턴으로 1차 저화질 판단
function isLowQualityUrl(url) {
  const match = url.match(/_R_(\d+)_(\d+)_/);
  if (match) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w < 1280 || h < 720) return true;
    const ratio = w / h;
    if (ratio < 0.5 || ratio > 2.0) return true;
  }
  const wMatch = url.match(/_W_(\d+)_(\d+)_/);
  if (wMatch) {
    const w = Number(wMatch[1]);
    const h = Number(wMatch[2]);
    if (h > 0 && (w < 1280 || h < 720)) return true;
  }
  return false;
}

const TARGET_W = 1280;
const TARGET_H = 720;
const NEAR_THRESHOLD = 0.7; // 90% 이상이면 canvas 업스케일

// canvas로 이미지 업스케일 (비율 유지)
async function upscaleBlob(blob, targetW, targetH) {
  return new Promise(resolve => {
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      // 비율 유지하면서 targetW x targetH 안에 맞게 스케일
      const scaleW = targetW / srcW;
      const scaleH = targetH / srcH;
      const scale = Math.max(scaleW, scaleH);

      const newW = Math.round(srcW * scale);
      const newH = Math.round(srcH * scale);

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

// 이미지 blob 품질 체크 + 필요시 canvas 업스케일
// 반환: { blob, isLow }
async function checkAndUpscale(blob) {
  if (blob.size < 10 * 1024) return { blob, isLow: true }; // 10KB 미만 → LOW

  return new Promise(resolve => {
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;
      URL.revokeObjectURL(objUrl);

      // 비율 체크
      if (ratio < 0.5 || ratio > 2.0) {
        resolve({ blob, isLow: true });
        return;
      }

      // 크기 체크
      const meetsSize = w >= TARGET_W && h >= TARGET_H;
      if (meetsSize) {
        resolve({ blob, isLow: false });
        return;
      }

      // 90% 이상이면 canvas 업스케일
      const nearSize = w >= TARGET_W * NEAR_THRESHOLD && h >= TARGET_H * NEAR_THRESHOLD;
      if (nearSize) {
        const upscaled = await upscaleBlob(blob, TARGET_W, TARGET_H);
        resolve({ blob: upscaled, isLow: false });
        return;
      }

      // 90% 미만 → LOW_QUALITY
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
    setStatus("Hotel ID를 입력하세요.", "error");
    return;
  }

  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  const openedTabs = [];

  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const baseUrl = currentTab.url;

    if (!baseUrl.includes("trip.com/hotels")) {
      setStatus("Trip.com 호텔 페이지에서 실행하세요.", "error");
      btn.disabled = false;
      return;
    }

    const allRooms = new Map();

    // 1차 스캔
    setStatus("1차 스캔 중 (현재 날짜)...");
    const result1 = await scrapeTab(currentTab.id, true);
    const hotelPhotos = result1.hotelPhotos || [];
    (result1.rooms || []).forEach(r => { if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r); });
    setStatus(`1차 완료: ${(result1.rooms||[]).length}개 → 누적 ${allRooms.size}개 | 호텔사진: ${hotelPhotos.length}장`);

    // 2차 스캔 (+3일)
    const url2 = getDateOffsetUrl(baseUrl, 3);
    if (url2) {
      setStatus("2차 스캔 중 (+3일)...");
      const tab2 = await chrome.tabs.create({ url: url2, active: false });
      openedTabs.push(tab2.id);
      await waitForTabLoad(tab2.id);
      const result2 = await scrapeTab(tab2.id, false);
      (result2.rooms || []).forEach(r => {
        if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r);
        else if (r.roomPhotos && r.roomPhotos.length > 0 && (!allRooms.get(r.roomName).roomPhotos || allRooms.get(r.roomName).roomPhotos.length === 0)) {
          // 기존 방에 사진이 없으면 사진만 업데이트
          const existing = allRooms.get(r.roomName);
          existing.roomPhotos = r.roomPhotos;
          allRooms.set(r.roomName, existing);
        }
      });
      setStatus(`2차 완료: ${(result2.rooms||[]).length}개 → 누적 ${allRooms.size}개`);
    }

    // 3차 스캔 (+7일)
    const url3 = getDateOffsetUrl(baseUrl, 7);
    if (url3) {
      setStatus("3차 스캔 중 (+7일)...");
      const tab3 = await chrome.tabs.create({ url: url3, active: false });
      openedTabs.push(tab3.id);
      await waitForTabLoad(tab3.id);
      const result3 = await scrapeTab(tab3.id, false);
      (result3.rooms || []).forEach(r => {
        if (!allRooms.has(r.roomName)) allRooms.set(r.roomName, r);
        else if (r.roomPhotos && r.roomPhotos.length > 0 && (!allRooms.get(r.roomName).roomPhotos || allRooms.get(r.roomName).roomPhotos.length === 0)) {
          const existing = allRooms.get(r.roomName);
          existing.roomPhotos = r.roomPhotos;
          allRooms.set(r.roomName, existing);
        }
      });
      setStatus(`3차 완료: ${(result3.rooms||[]).length}개 → 누적 ${allRooms.size}개`);
    }

    const finalRooms = [...allRooms.values()];

    if (finalRooms.length === 0) {
      setStatus("객실을 찾지 못했습니다.", "error");
      btn.disabled = false;
      return;
    }

    // Google Sheets 전송
    setStatus("전송 중...");
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

    setStatus(`✅ 전송 완료! 총 ${finalRooms.length}개 객실`, "success");

    // 사진 ZIP 생성
    if (typeof JSZip !== "undefined") {
      setStatus("사진 ZIP 생성 중...");
      const zip = new JSZip();
      const hotelFolder = zip.folder(sanitizeName(hotelName));
      const usedHotelUrls = new Set(); // 호텔 전체 사진 중복 제거용
      const normalizeUrl = url => url.split('?')[0].trim();
      let photoCount = 0;

      for (const room of finalRooms) {
        if (!room.roomPhotos || !room.roomPhotos.length) continue;
        const roomFolder = hotelFolder.folder(sanitizeName(room.roomName));
        let idx = 1;
        const roomSeenUrls = new Set(); // 방 내부 중복만 제거

        for (const url of [...room.roomPhotos]) {
          if (!url || roomSeenUrls.has(normalizeUrl(url))) continue;
          roomSeenUrls.add(normalizeUrl(url));
          usedHotelUrls.add(normalizeUrl(url));
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
            const filename = `${String(idx).padStart(2, "0")}${low ? "_LOW_QUALITY" : ""}.${ext}`;
            roomFolder.file(filename, blob);
            idx++;
            photoCount++;
          } catch (e) {
            console.log("사진 fetch 실패:", url);
          }
        }
      }

      // 호텔 전체 사진 추가 (방 사진과 별도 중복 체크)
      if (hotelPhotos && hotelPhotos.length > 0) {
        const hotelPhotoFolder = hotelFolder.folder("호텔 전체");
        const hotelOnlyUrls = new Set();
        let hidx = 1;
        for (const url of hotelPhotos) {
          if (!url || hotelOnlyUrls.has(normalizeUrl(url))) continue;
          hotelOnlyUrls.add(normalizeUrl(url));
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
            const filename = `${String(hidx).padStart(2, "0")}${low ? "_LOW_QUALITY" : ""}.${ext}`;
            hotelPhotoFolder.file(filename, blob);
            hidx++;
            photoCount++;
          } catch (e) {
            console.log("호텔 사진 fetch 실패:", url);
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
        setStatus(`✅ 완료! 객실 ${finalRooms.length}개 + 사진 ${photoCount}장`, "success");
      } else {
        setStatus(`✅ 전송 완료! 총 ${finalRooms.length}개 객실 (사진 없음)`, "success");
      }
    } else {
      setStatus(`✅ 전송 완료! 총 ${finalRooms.length}개 객실 (JSZip 없음)`, "success");
    }

    // ZIP 완료 후 탭 앞으로 꺼내기
    for (const tabId of openedTabs) {
      await chrome.tabs.update(tabId, { active: true });
      await new Promise(r => setTimeout(r, 300));
    }

  } catch (err) {
    console.error("[Scraper] 에러:", err);
    setStatus("에러: " + err.message, "error");
  }

  btn.disabled = false;
  // 팝업 닫힘 방지 - 결과 확인용 input 포커스
  document.getElementById("hotelId").focus();
});

// 팝업 열릴 때 버전 체크
checkForUpdates();
