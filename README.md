![Version](https://img.shields.io/badge/version-5.5-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-green)
![JavaScript](https://img.shields.io/badge/JavaScript-91%25-yellow)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-MobileNet-orange)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Last Commit](https://img.shields.io/github/last-commit/Geresia/tera_assistant)

# Tera Assistant
A Chrome Extension that extracts hotel and room data from Trip.com and Agoda, and automatically fills it into tera.traveloka.com, with photo upload and ZIP download support.

---

## Installation (First Time)

**Step 1 - Download files**

Open PowerShell and paste this one line:

```powershell
$d="$env:USERPROFILE\Desktop\tera_assistant"; mkdir $d -Force; iwr "https://raw.githubusercontent.com/Geresia/tera_assistant/main/update.ps1" -OutFile "$d\update.ps1"; iwr "https://raw.githubusercontent.com/Geresia/tera_assistant/main/Tera_Update.bat" -OutFile "$d\Tera_Update.bat"; powershell -ExecutionPolicy Bypass -File "$d\update.ps1"
```

This creates a `tera_assistant` folder on your Desktop and downloads all extension files from GitHub.

**Step 2 - Load in Chrome**

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `Desktop\tera_assistant` folder

**Step 3**

Contact SangJae Lee for access to the Google Sheet.

---

## Updates

Double click `Tera_Update.bat` in the `tera_assistant` folder, then reload the extension at `chrome://extensions`.

---

## How to Use

### Hotel Info (Trip.com & Agoda)

| Button | Description |
|---|---|
| **Hotel Bulk Insert** | Auto-fills Tera Details, Overview, and Address tabs from Trip.com |
| **Hotel Detail Insert** | Auto-fills Tera hotel detail fields (check-in/out, rooms, floors, facilities, breakfast, etc.) from Trip.com or Agoda |

1. Open the extension Side Panel on the hotel page (Trip.com or Agoda)
2. Click the button you need

> **Agoda notes:**
> - Navigate to the hotel page and wait for it to fully load before clicking Hotel Detail Insert
> - Korean name/address are only available when your Agoda session is in Korean locale

### Create New Room (Trip.com & Agoda)

1. Enter the **Hotel Name** (used for photo ZIP folder name)
2. Select **Assigned To**
3. Click **Scan** - scrapes all room data from Trip.com or Agoda
4. Select the rooms you want to fill (checkboxes appear)
5. Click **Fill** - auto-fills each room on Tera one by one
   - After each room: review, then click **Continue**
6. Click **IMAGE** - downloads all room photos as a ZIP file
7. Click **Hotel Photos Insert** - uploads hotel photos directly to Tera's hotel-photo page (navigate there first)

### Edit Room

| Button | Description |
|---|---|
| **Bed Scan** | Scans existing rooms on Tera and lists them |
| **Room Update** | Auto updates bed configuration for selected rooms |

---

## File Structure
- `manifest.json` - Extension configuration
- `popup.html` / `popup.js` - Side Panel UI and logic
- `content.js` - Scrapes room and hotel photo data from Trip.com
- `agoda_main.js` - Injected into Agoda pages at document_start to intercept API responses (room-grid, graphql/property, BelowFoldParams)
- `background.js` - Opens Side Panel on extension icon click
- `Tera_Update.bat` / `update.ps1` - One-click update script
- `jszip.min.js` - ZIP file library
- `tf.min.js` / `mobilenet.min.js` / `imagenet_labels.json` - AI photo classification (MobileNet)

---

## Version History
- **5.5** - Auto Crop/Fit detection for photo processing: images where more than 15% would be cropped automatically switch to Fit mode (white background, preserves full image). Applied to ZIP download and TERA photo upload.
- **5.4** - Agoda Hotel Detail Insert improvements: built year from usefulInfo ("Year property opened"), renovated year fallback to built year, facilities via full page text, breakfast charge regex fixed for KRW/₩ formats with field clear when not found, airport transfer free -> 0, BelowFold API direct fetch fallback, local name/address No radio when Korean data unavailable. Agoda room description left empty.
- **5.3** - Added Agoda support: Hotel Detail Insert and room scan/fill for Agoda hotel pages. Intercepts room-grid, graphql/property, and BelowFoldParams APIs via agoda_main.js content script injected at document_start.
- **5.0** - Rebranded to Tera Assistant. Merged Hotel Info Extractor into Room Scraper. Added Hotel Info section with Extract and Sheet buttons. UI redesigned with clean flat layout and KR/EN language toggle. Switched to Side Panel. Added hotel-level facility extraction, local name, address, check-in/out, parking, breakfast, airport transfer, voltage auto-fill support. Added hotel photo upload to Tera (hotel-photo page). AI-based room photo classification using MobileNet. 401 error handling with auto-retry countdown and Retry Now button. Hotel photo limit of 10.
- **4.0** - Migrated room scraping and hotel photos to Trip.com API (`physicRoomMap` + `getHotelDetailAggregate`). Removed DOM-based scraping. Now works on all regional Trip.com domains.
- **3.0** - Added ZIP photo download feature. Added language toggle (KR/EN) and auto expand hidden room types.
- **2.0** - Migrated to Chrome Extension from bookmarklet.
