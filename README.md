![Version](https://img.shields.io/badge/version-5.3-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-green)
![JavaScript](https://img.shields.io/badge/JavaScript-91%25-yellow)

# Tera Assistant - Chrome Extension
A Chrome Extension that extracts hotel and room data from Trip.com and automatically fills it into tera.traveloka.com, with photo upload and ZIP download support.

---

## Installation (First Time)

**Step 1 — Download files**

Open PowerShell and paste this one line:

```powershell
$d="$env:USERPROFILE\Desktop\tera_assistant"; mkdir $d -Force; iwr "https://raw.githubusercontent.com/Geresia/tera_assistant/main/update.ps1" -OutFile "$d\update.ps1"; iwr "https://raw.githubusercontent.com/Geresia/tera_assistant/main/Tera_Update.bat" -OutFile "$d\Tera_Update.bat"; powershell -ExecutionPolicy Bypass -File "$d\update.ps1"
```

This creates a `tera_assistant` folder on your Desktop and downloads all extension files from GitHub.

**Step 2 — Load in Chrome**

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `Desktop\tera_assistant` folder

**Step 3**

Contact SangJae Lee for access to the Google Sheet.

---

## Updates

Double-click `Tera_Update.bat` in the `tera_assistant` folder, then reload the extension at `chrome://extensions`.

---

## How to Use

### Hotel Info
| Button | Description |
|---|---|
| **Hotel Bulk Insert** | Extracts hotel data from Trip.com and auto-fills Tera Details, Overview, and Address tabs |
| **Hotel Detail Insert** | Sends hotel data to Google Sheets |

1. Go to any Trip.com hotel page
2. Open the extension Side Panel
3. Click the button you need

### Create New Room
1. Enter the **Hotel Name** (used for photo ZIP folder name)
2. Select **Assigned To**
3. Click **Scan** — scrapes all room data from Trip.com
4. Select the rooms you want to fill (checkboxes appear)
5. Click **Fill** — auto-fills each room on Tera one by one
   - After each room: review, then click **Continue**
6. Click **IMAGE** — downloads all room photos as a ZIP file
7. Click **Hotel Photos Insert** — uploads hotel photos directly to Tera's hotel-photo page (navigate there first)

### Edit Room
| Button | Description |
|---|---|
| **Bed Scan** | Scans existing rooms on Tera and lists them |
| **Room Update** | Auto-updates bed configuration for selected rooms |

---

## File Structure
- `manifest.json` — Extension configuration
- `popup.html` / `popup.js` — Side Panel UI and logic
- `content.js` — Scrapes room and hotel photo data from Trip.com
- `background.js` — Opens Side Panel on extension icon click
- `Tera_Update.bat` / `update.ps1` — One-click update script
- `jszip.min.js` — ZIP file library
- `tf.min.js` / `mobilenet.min.js` / `imagenet_labels.json` — AI photo classification (MobileNet)

---

## Version History
- **5.3** - Added hotel photo upload to Tera (hotel-photo page). AI-based room photo classification using MobileNet. 401 error handling with auto-retry countdown and Retry Now button. Hotel photo limit of 10. Dead code cleanup and version fix.
- **5.0** - Rebranded to Tera Assistant. Merged Hotel Info Extractor into Room Scraper. Added Hotel Info section with Extract and Sheet buttons. UI redesigned with clean flat layout and KR/EN language toggle. Switched to Side Panel. Added hotel-level facility extraction, local name, address, check-in/out, parking, breakfast, airport transfer, voltage auto-fill support.
- **4.0** - Migrated room scraping and hotel photos to Trip.com API (`physicRoomMap` + `getHotelDetailAggregate`). Removed DOM-based scraping. Now works on all regional Trip.com domains.
- **3.3** - Added language toggle (KR/EN) and auto expand hidden room types.
- **3.0** - Added ZIP photo download feature.
- **2.0** - Migrated to Chrome Extension from bookmarklet.
