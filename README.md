# Tera Assistant - Chrome Extension
A Chrome Extension that extracts hotel and room data from Trip.com and automatically fills it into tera.traveloka.com, with photo ZIP download support.

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

## Version History
- **5.0** - Rebranded to Tera Assistant. Merged Hotel Info Extractor into Room Scraper. Added Hotel Info section with Extract (auto-fills Tera Details/Overview/Address tabs) and Sheet (sends hotel data to Google Sheets) buttons. UI redesigned with clean flat layout and KR/EN language toggle. Switched to Side Panel. Added hotel-level facility extraction, local name, address, check-in/out, parking, breakfast, airport transfer, voltage auto-fill support.
- **4.0** - Migrated room scraping and hotel photos to Trip.com API (`physicRoomMap` + `getHotelDetailAggregate`). Removed DOM-based scraping and multi-date scanning (+3/+7 days). Now works on all regional Trip.com domains via `window.location.origin`. Removed `content_scripts` from manifest to prevent auto-execution on page load.
- **3.3** - Added language toggle (KR/EN) and auto expand hidden room types. Auto detect check-in date from page when URL has no date parameter.
- **3.2** - Fixed isolated world issue for reliable photo scraping.
- **3.1** - Added hotel photo collection and canvas upscaling.
- **3.0** - Added ZIP photo download feature.
- **2.0** - Migrated to Chrome Extension from bookmarklet.
