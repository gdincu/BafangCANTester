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

---

## Requirements

- **Browser**: A browser supporting the [Web Bluetooth API](https://caniuse.com/web-bluetooth), such as Google Chrome, Microsoft Edge, or Opera (desktop or Android).
- **Environment**: Web Bluetooth requires a secure context (`https://`) or a local development server (`http://localhost` / `http://127.0.0.1`).
- **Python**: Python 3.x installed (optional, used to serve files locally via `run.bat`).

---

## Getting Started

1. **Start the local server**:
   Double-click `run.bat` or run the following in your terminal:
   ```bash
   py -m http.server 8000
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
├── index.html         # User interface
├── run.bat            # Quick-launch local Python HTTP server
└── README.md          # Project documentation
```
