# Trip.com Room Scraper - Chrome Extension

A Chrome Extension that automatically scrapes hotel room data from Trip.com and sends it to Google Sheets, along with downloading room and hotel photos as a ZIP file.

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `trip-scraper-extension` folder

## How to Use

1. Go to a Trip.com hotel detail page (where room listings are visible)
2. Click the Extension icon in the top right of Chrome
3. Enter the **Hotel ID**
4. Enter the **Hotel Name** (used for the photo ZIP folder name)
5. Click **Start Scan**
6. The Extension will automatically scan the current date / +3 days / +7 days and send data to Google Sheets
7. Room photos and hotel photos will be downloaded as a ZIP file automatically

## File Structure

- `manifest.json` - Extension configuration
- `popup.html` / `popup.js` - Extension popup UI and scan flow
- `content.js` - Scrapes room data from Trip.com pages
- `background.js` - Service Worker (required for Manifest V3)
- `jszip.min.js` - Library for creating ZIP files

## Notes

- Use the English version of Trip.com (`www.trip.com`) for best results
- Do not click other tabs while scanning is in progress
- Photos marked `_LOW_QUALITY` do not meet Traveloka's minimum resolution requirements (1280x720)
- Trip.com page structure changes may require updates to `content.js` selectors

## Version History

- **3.3** - Added language toggle (KR/EN) and auto-expand hidden room types (Show Remaining Room Types)
- **3.2** - Fixed isolated world issue for reliable photo scraping
- **3.1** - Added hotel photo collection and canvas upscaling
- **3.0** - Added ZIP photo download feature
- **2.0** - Migrated to Chrome Extension from bookmarklet
