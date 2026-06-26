// ── Photo ZIP Download (Room Scan 결과의 roomPhotos + hotelPhotos를 zip으로 묶어 다운로드) ──
// popup.js는 이 파일이 노출하는 window.downloadRoomPhotosAsZip(...) 만 호출하면 됨.

(function () {
  const TARGET_W = 1280, TARGET_H = 720;
  const MAX_W = 4096, MAX_H = 4096;

  // Agoda 다운로더와 동일한 리사이즈 로직: 비율 필터 없이 전부 처리.
  // - 작은 이미지는 TARGET 크기로 업스케일
  // - 큰 이미지는 MAX 경계를 넘지 않게 다운스케일
  // - 그 외(TARGET~MAX 사이)는 원본 그대로 사용
  async function resizeBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });

      const w = img.naturalWidth, h = img.naturalHeight;
      let targetW = w, targetH = h;

      if (w > MAX_W || h > MAX_H) {
        const scale = Math.min(MAX_W / w, MAX_H / h);
        targetW = Math.round(w * scale);
        targetH = Math.round(h * scale);
      } else if (w < TARGET_W && h < TARGET_H) {
        const scale = Math.max(TARGET_W / w, TARGET_H / h);
        targetW = Math.round(w * scale);
        targetH = Math.round(h * scale);
      }

      if (targetW === w && targetH === h) return blob;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    } catch (e) {
      console.log('[photoZip] resize 실패, 원본 사용:', e.message);
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
          const resized = await resizeBlob(blob);
          hotelFolder.file(`${String(i + 1).padStart(2, '0')}.jpg`, resized);
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
          const resized = await resizeBlob(blob);
          roomFolder.file(`${String(i + 1).padStart(2, '0')}.jpg`, resized);
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