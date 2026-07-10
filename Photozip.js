// ── Photo ZIP Download (Room Scan 결과의 roomPhotos + hotelPhotos를 zip으로 묶어 다운로드) ──
// popup.js는 이 파일이 노출하는 window.downloadRoomPhotosAsZip(...) 만 호출하면 됨.

(function () {
  const TARGET_W = 1280, TARGET_H = 720;
  const MAX_W = 4096, MAX_H = 4096;

  const RATIOS = [1, 1.5, 1.7778];
  const FIT_THRESHOLD = 0.15;

  // Auto crop/fit: if more than 15% would be cropped → Fit mode (transparent PNG)
  // Otherwise → center Crop (JPEG)
  async function processBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });

      const sw = img.naturalWidth, sh = img.naturalHeight;
      const curRatio = sw / sh;
      const tgtRatio = RATIOS.reduce((a, b) => Math.abs(b - curRatio) < Math.abs(a - curRatio) ? b : a);

      let cropPercent = 0;
      if (curRatio > tgtRatio) cropPercent = 1 - tgtRatio / curRatio;
      else if (curRatio < tgtRatio) cropPercent = 1 - curRatio / tgtRatio;
      const useFit = cropPercent > FIT_THRESHOLD;

      // Canvas base size (target ratio dimensions)
      let sx = 0, sy = 0, cropW = sw, cropH = sh;
      if (curRatio > tgtRatio) { cropW = Math.round(sh * tgtRatio); sx = Math.round((sw - cropW) / 2); }
      else if (curRatio < tgtRatio) { cropH = Math.round(sw / tgtRatio); sy = Math.round((sh - cropH) / 2); }

      let cw = cropW, ch = cropH;
      if (cw > MAX_W || ch > MAX_H) { const s = Math.min(MAX_W / cw, MAX_H / ch); cw = Math.round(cw * s); ch = Math.round(ch * s); }
      if (cw < TARGET_W && ch < TARGET_H) { const s = Math.max(TARGET_W / cw, TARGET_H / ch); cw = Math.round(cw * s); ch = Math.round(ch * s); }

      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (useFit) {
        const scale = Math.min(cw / sw, ch / sh);
        const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
        const dx = Math.round((cw - dw) / 2), dy = Math.round((ch - dh) / 2);
        ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
        return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      } else {
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cw, ch);
        return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      }
    } catch (e) {
      console.log('[photoZip] process 실패, 원본 사용:', e.message);
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function sanitize(name) {
    return (name || 'untitled').replace(/[<>:"/\\|?*]/g, '_').trim().replace(/\s+/g, '_') || 'untitled';
  }

  // rooms: [{ roomName, roomPhotos: [url, ...] }, ...]
  // hotelPhotos: [url, ...]
  // onProgress: (msg) => void
  async function downloadRoomPhotosAsZip(hotelName, rooms, hotelPhotos, onProgress) {
    const log = (msg) => { if (onProgress) onProgress(msg); console.log('[photoZip]', msg); };

    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip이 로드되지 않았습니다. popup.html에 jszip.min.js script 태그를 확인하세요.');
    }

    const zip = new JSZip();
    const hotelFolderName = sanitize(hotelName) || 'hotel';
    const root = zip.folder(hotelFolderName);

    let totalPhotos = 0;
    let failCount = 0;

    // 호텔 전체 사진
    if (hotelPhotos && hotelPhotos.length > 0) {
      const hotelFolder = root.folder('Hotel');
      for (let i = 0; i < hotelPhotos.length; i++) {
        log(`Processing hotel photos... (${i + 1}/${hotelPhotos.length})`);
        try {
          const res = await fetch(hotelPhotos[i]);
          if (!res.ok) throw new Error(res.status);
          const blob = await res.blob();
          const processed = await processBlob(blob);
          const ext = processed.type === 'image/png' ? 'png' : 'jpg';
          hotelFolder.file(`${String(i + 1).padStart(2, '0')}.${ext}`, processed);
          totalPhotos++;
        } catch (e) {
          failCount++;
          log(`Hotel photo ${i + 1} failed: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 50));
      }
    }

    // 방별 사진 (선택된 방만 전달받음)
    for (const room of (rooms || [])) {
      const photos = room.roomPhotos || [];
      if (photos.length === 0) continue;

      const roomFolder = root.folder(sanitize(room.roomName));
      for (let i = 0; i < photos.length; i++) {
        log(`${room.roomName} processing... (${i + 1}/${photos.length})`);
        try {
          const res = await fetch(photos[i]);
          if (!res.ok) throw new Error(res.status);
          const blob = await res.blob();
          const processed = await processBlob(blob);
          const ext = processed.type === 'image/png' ? 'png' : 'jpg';
          roomFolder.file(`${String(i + 1).padStart(2, '0')}.${ext}`, processed);
          totalPhotos++;
        } catch (e) {
          failCount++;
          log(`${room.roomName} photo ${i + 1} failed: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 50));
      }
    }

    if (totalPhotos === 0) {
      throw new Error('No photos to download.');
    }

    log('Compressing...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipUrl = URL.createObjectURL(zipBlob);
    await new Promise(resolve => {
      chrome.downloads.download({
        url: zipUrl,
        filename: `${hotelFolderName}_photos.zip`,
        conflictAction: 'uniquify',
      }, () => {
        setTimeout(() => URL.revokeObjectURL(zipUrl), 3000);
        resolve();
      });
    });

    return { totalPhotos, failCount };
  }

  window.downloadRoomPhotosAsZip = downloadRoomPhotosAsZip;
})();