# Trip.com Room Scraper - Chrome Extension

A Chrome Extension that automatically scrapes hotel room data from Trip.com and sends it to Google Sheets, along with downloading room and hotel photos as a ZIP file.

---

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `trip-scraper-extension` folder
5. Contact Sangjae Lee to get access to the Google Sheet

---

## How to Use

1. Go to any Trip.com hotel detail page (any language/region version works)
2. Click the Extension icon in the top right of Chrome
3. Enter the **Hotel ID**
4. Enter the **Hotel Name** (used for the photo ZIP folder name)
5. Click **Start Scan**
6. The Extension will automatically fetch all room data via API and send it to Google Sheets
7. Room photos and hotel photos will be downloaded as a ZIP file automatically

---

## File Structure

- `manifest.json` - Extension configuration
- `popup.html` / `popup.js` — Extension popup UI and scan flow
- `content.js` - Fetches room and hotel data via Trip.com API
- `background.js` - Service Worker (required for Manifest V3)
- `jszip.min.js` - Library for creating ZIP files

---

## Notes

- Works on any Trip.com regional domain (`www.trip.com`, `us.trip.com`, `kr.trip.com`, etc.)
- Room data is fetched via `physicRoomMap` API - date-independent, returns all registered room types at once
- Hotel photos are fetched via `getHotelDetailAggregate` API (up to 10 photos, high resolution 960x660)
- Do not click other tabs while scanning is in progress
- Photos marked `_LOW_QUALITY` do not meet Traveloka's minimum resolution requirements (1280×720)

---

## Version History

- **4.0** - Migrated room scraping and hotel photos to Trip.com API (`physicRoomMap` + `getHotelDetailAggregate`). Removed DOM-based scraping and multi-date scanning (+3/+7 days). Now works on all regional Trip.com domains via `window.location.origin`. Removed `content_scripts` from manifest to prevent auto-execution on page load.
- **3.3** - Added language toggle (KR/EN) and auto expand hidden room types (Show Remaining Room Types). Auto detect check in date from page when URL has no date parameter.
- **3.2** - Fixed isolated world issue for reliable photo scraping
- **3.1** - Added hotel photo collection and canvas upscaling
- **3.0** - Added ZIP photo download feature
- **2.0** - Migrated to Chrome Extension from bookmarklet
