<div align="center">

![Version](https://img.shields.io/badge/version-6.1-0EA5E9?style=for-the-badge)
![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-22c55e?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/Geresia/tera_assistant?style=for-the-badge&color=334155)

# Tera Assistant

**Chrome Extension for Traveloka TERA hotel data automation**

</div>

---

## Features

### Hotel Info
| Feature | Source | What it fills |
|---|---|---|
| **Hotel Bulk Insert** | Trip.com / Agoda / Booking.com | Details, Overview, Address tabs |
| **Hotel Detail Insert** | Trip.com / Agoda / Booking.com / Airbnb | Check-in/out, room count, floors, facilities, breakfast, airport transfer, voltage, built year, local name & address |

### Room Management
| Feature | Description |
|---|---|
| **Scan** | Scrapes all room types from Trip.com, Agoda, or Booking.com. On Airbnb, the whole listing is scanned as a single room |
| **Fill** | Auto-fills each room into Tera one by one (bed type, size, view, facilities, description) |
| **IMAGE** | Downloads all room + hotel photos as a ZIP, auto-cropped and resized to TERA specs |
| **Hotel Photos Insert** | Uploads hotel photos directly to Tera's hotel-photo page |
| **Bed Scan / Room Update** | Scans existing Tera rooms and batch-updates bed configuration |

### Smart Photo Processing
Photos are automatically processed before download or upload:
- **Auto Crop/Fit detection** - if more than 15% of the image would be cropped to reach the target ratio (`1:1` `3:2` `16:9`), switches to Fit mode instead
- **Crop mode** - center-crops to target ratio → JPEG
- **Fit mode** - scales to fit with white background → JPEG (upload) / transparent → PNG (ZIP)
- Output capped between `1280×720` and `4096×4096`

### AI Photo Classification
Uses **TensorFlow.js + MobileNet** to classify room photos and assign the correct photo category on Tera automatically.

### Auto Login
When any action redirects to the Tera login page:
1. Fills `@traveloka.com` in the email field
2. Triggers the Google Workspace SSO modal
3. Clicks Continue automatically
4. Selects the `@traveloka.com` account from the Google account chooser

Falls back to a manual prompt if any step fails.

### Data Sources
| Platform | Method |
|---|---|
| **Trip.com** | `physicRoomMap` + `getHotelDetailAggregate` API interception |
| **Agoda** | `room-grid`, `graphql/property`, `BelowFoldParams` API interception via `window.fetch` override at `document_start` |
| **Booking.com** | DOM scraping - room table rows, gallery modal / partner (wholesaler) photo galleries, JSON-LD, `hreflang=ko` fetch for Korean name/address |
| **Airbnb** | JSON-LD + the `data-deferred-state-0` GraphQL payload embedded in the page (amenities, house rules, check-in/out, photos) |

---

## Installation

**Step 1 - Download**

Go to [Tera Image Tool](https://geresia.github.io/TVLK_TERA_IMG_CONVERTER/) and click **Get Tera Assistant** to download it, then unzip to `Desktop\tera_assistant`.

**Step 2 - Load in Chrome**

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `Desktop\tera_assistant`

**Step 3**

Contact SangJae Lee for access to the Google Sheet.

---

## Updates

Double-click `Tera_Update.bat` in the `tera_assistant` folder, then reload at `chrome://extensions`.

---

## How to Use

### Hotel Info

1. Open the extension Side Panel on a Trip.com, Agoda, Booking.com, or Airbnb hotel page
2. Click **Hotel Detail Insert** (or **Hotel Bulk Insert** for Trip.com / Agoda / Booking.com)

> **Agoda:** Wait for the page to fully load before clicking. Korean name/address only available in Korean locale.
> **Airbnb:** Hotel Detail Insert only - there's no Hotel Bulk Insert / Sheet flow for Airbnb yet.

### Create New Room

1. Enter **Hotel Name**
2. Select **Assigned To**
3. Click **Scan** → select rooms → click **Fill**
4. After each room: review → click **Continue**
5. Click **IMAGE** to download the ZIP
6. Navigate to the hotel-photo page on Tera → click **Hotel Photos Insert**

### Edit Room

1. Click **Bed Scan** to list existing rooms on Tera
2. Select rooms → click **Room Update**

---

## File Structure

| File | Description |
|---|---|
| `manifest.json` | Extension config (MV3) |
| `popup.html` / `popup.js` | Side Panel UI and all automation logic |
| `content.js` | Trip.com room & hotel photo scraper |
| `agoda_main.js` | Agoda API interceptor (injected at `document_start`, `world: MAIN`) |
| `booking_main.js` | Booking.com fetch/XHR debug logger (injected at `document_start`, `world: MAIN`) |
| `airbnb_main.js` | Airbnb page patch (injected at `document_start`, `world: MAIN`) |
| `background.js` | Side Panel launcher + auto login trigger |
| `tera_login.js` | Auto login script for `tera.traveloka.com/login/` |
| `google_account.js` | Google account chooser automation |
| `Photozip.js` | ZIP photo download with auto Crop/Fit processing |
| `jszip.min.js` | ZIP library |
| `tf.min.js` / `mobilenet.min.js` / `imagenet_labels.json` | AI photo classification |
| `Tera_Update.bat` / `update.ps1` | One click updater |

---

## Version History

- **6.1** - README refresh (Booking.com/Airbnb docs, install now via Tera Image Tool site).
- **6.0** - Booking.com support: room/hotel photo scan (native gallery + partner/wholesaler galleries), Hotel Bulk & Detail Insert, Korean name/address via `hreflang=ko`, address dedup, airport transfer FAQ-widget false positive fix. Airbnb support: Hotel Detail Insert and single-room/photo scan via the page's `data-deferred-state-0` GraphQL payload. Room voltage closure bug fix. Australia rate protection default fixed (separated fallback default from Korea-specific defaults). Expanded facility keyword matching.
- **5.6** - Multiple Bedrooms autofill support. Detects and removes extra empty bedroom sections. All key waits converted to polling (Create New Room nav, Submit/Save, photo upload preview).
- **5.51** - Details save reliability fix (re-click after React state settles). Google account auto-selection removed (scope too broad). Traveloka bird favicon for extension icon.
- **5.5** - Auto Crop/Fit detection for photo processing (>15% crop threshold → Fit mode). Auto-login on Tera `/login/` redirect with Google Workspace SSO + account chooser automation. Traveloka icon.
- **5.4** - Agoda Hotel Detail Insert: built year from `usefulInfo`, renovated year fallback, facilities via full-page text, breakfast KRW/₩ regex fix, airport transfer `free → 0`, `BelowFold` API direct fetch fallback, Korean name/address `No` radio fallback. Room description left empty.
- **5.3** - Agoda support: Hotel Detail Insert + room scan/fill. API interception via `agoda_main.js` (`room-grid`, `graphql/property`, `BelowFoldParams`).
- **5.0** - Rebranded to Tera Assistant. Side Panel UI, KR/EN toggle, hotel-level auto-fill (facilities, local name, address, check-in/out, parking, breakfast, airport transfer, voltage). Hotel photo upload. MobileNet AI photo classification. 401 auto-retry with countdown.
- **4.0** - Migrated to Trip.com API (`physicRoomMap` + `getHotelDetailAggregate`). Works on all regional Trip.com domains.
- **3.0** - ZIP photo download. Language toggle. Auto-expand hidden room types.
- **2.0** - Migrated from bookmarklet to Chrome Extension.
- **1.0** - Initial release as a browser bookmarklet.
