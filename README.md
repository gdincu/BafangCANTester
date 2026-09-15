# Bafang CAN-BLE Tester

A lightweight, web-based diagnostic utility to interface with Bafang e-bike systems (such as the DP E12.CAN display) using the Web Bluetooth API.

---

## Features

- **Web Bluetooth Connectivity**: Direct browser-to-bike BLE pairing without needing native drivers or companion mobile apps.
- **Service & Characteristic Inspection**: Inspects GATT properties (`READ`, `WRITE`, `WRITE_NO_RESPONSE`, `NOTIFY`, `INDICATE`) on target characteristics (defaults to `FFF3`).
- **Raw Hex Command Dispatch**: Send arbitrary hex byte payloads with or without response.
- **Quick Preset Commands**:
  - **PAS Levels**: PAS 0 through PAS 4
  - **Headlight Controls**: Headlight ON, OFF, and Alternative State
- **Console Log & Telemetry**:
  - Real-time RX/TX activity feed
  - RX substring filtering (e.g., filter for specific packet types)
  - One-click export to timestamped `.txt` log file
- **Installable PWA**: offline-capable app shell with custom icon, installable on desktop and mobile.

---

## Requirements

- **Browser**: A browser supporting the [Web Bluetooth API](https://caniuse.com/web-bluetooth), such as Google Chrome, Microsoft Edge, or Opera (desktop or Android).
- **Environment**: Web Bluetooth requires a secure context (`https://`) or a local development server (`http://localhost` / `http://127.0.0.1`).

---

## Getting Started

1. **Start the local server**:
   ```
   eg. py -m http.server 8000
   ```
2. **Open in browser**:
   Navigate to [http://localhost:8000](http://localhost:8000).
3. **Connect to your bike**:
   - Turn on your Bafang display/controller.
   - Click **Connect to Bike**.
   - Select your device (`DP E12.CAN`) from the Bluetooth pairing prompt.

---

## Project Structure

```
.
├── css/
│   └── style.css      # Dark-theme styling
├── js/
│   └── script.js      # Web Bluetooth logic, command handlers, and logging
├── icons/
│   ├── icon.svg            # Vector app icon (source)
│   ├── favicon.svg         # SVG favicon
│   ├── favicon.ico         # Legacy multi-size favicon
│   ├── favicon-16x16.png / favicon-32x32.png
│   ├── icon-192.png / icon-512.png        # PWA icons
│   ├── maskable-512.png                   # Maskable PWA icon
│   └── apple-touch-icon.png               # iOS home-screen icon
├── index.html         # User interface
├── manifest.webmanifest  # PWA manifest
├── sw.js              # PWA service worker (offline app shell)
└── README.md          # Project documentation
```

## Installing as an App (PWA)

The app is installable and works offline (the app shell is cached on first visit):

1. Serve over `https://` or `http://localhost` (required for both Web Bluetooth and the service worker).
2. Open the app in Chrome/Edge/Opera, then use the browser's **Install** option (address-bar icon or menu → *Install Bafang CAN-BLE Tester*).
3. On iOS, use Safari → Share → **Add to Home Screen** (uses `apple-touch-icon.png`).
