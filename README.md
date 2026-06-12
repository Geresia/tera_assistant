# Trip.com Room Scraper - Chrome Extension

A Chrome Extension that automatically scrapes hotel room data from Trip.com and sends it to Google Sheets, along with downloading room and hotel photos as a ZIP file.

---

## Installation
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the extension folder
5. Contact Sangjae Lee to get access to the Google Sheet

---

## How to Use

### Hotel Info
1. Go to any Trip.com hotel detail page
2. Open the extension (Side Panel)
3. Click **Extract** - automatically extracts hotel data and fills Tera Details, Overview, and Address tabs
4. Click **Sheet** - sends hotel data to Google Sheets

### Room
1. Enter the **Hotel Name** (used for the photo ZIP folder name)
2. Click **Scan** - scrapes all room data and downloads photos as ZIP
3. Open the Tera room registration page
4. Click **Autofill** - automatically fills in all room fields one by one
5. After each room, upload photos manually then click **완료 / Continue**

---

## File Structure
- `manifest.json` - Extension configuration
- `popup.html` / `popup.js` - Extension popup UI and logic
- `content.js` - Scrapes room and hotel photo data from Trip.com
- `background.js` - Opens Side Panel on extension icon click
- `jszip.min.js` - Library for creating ZIP files

---

## Notes
- Works on any Trip.com regional domain (`www.trip.com`, `us.trip.com`, `kr.trip.com`, etc.)
- Room data is parsed from `seoHotelRooms.physicRoomMap` in `__next_f` script tags
- Hotel info is extracted from DOM + `getHotelDetailAggregate` API (local name, address, facilities)
- Tera autofill covers: room type, size, unit, window, view, bed settings, facilities, gender, smoking, room name, occupancy, rate protection
- Photos marked `_LOW_QUALITY` do not meet Traveloka's minimum resolution requirements (1280×720)
- Do not click other tabs while Autofill or Scan is in progress
- If Tera shows an error after saving, the extension will pause and wait - fix the error then click Continue

---

## Version History

- **5.0** - Merged Hotel Info Extractor into Room Scraper. Added Hotel Info section with Extract (auto fills Tera Details/Overview/Address tabs) and Sheet (sends hotel data to Google Sheets) buttons. UI redesigned with clean flat layout and KR/EN language toggle. Switched to Side Panel. Added hotel-level facility extraction, local name, address, check-in/out, parking, breakfast, airport transfer, voltage auto fill support.
- **4.0** - Migrated room scraping and hotel photos to Trip.com API (`physicRoomMap` + `getHotelDetailAggregate`). Removed DOM-based scraping and multi-date scanning (+3/+7 days). Now works on all regional Trip.com domains via `window.location.origin`. Removed `content_scripts` from manifest to prevent auto-execution on page load.
- **3.3** - Added language toggle (KR/EN) and auto expand hidden room types (Show Remaining Room Types). Auto detect check in date from page when URL has no date parameter.
- **3.2** - Fixed isolated world issue for reliable photo scraping
- **3.1** - Added hotel photo collection and canvas upscaling
- **3.0** - Added ZIP photo download feature
- **2.0** - Migrated to Chrome Extension from bookmarklet
