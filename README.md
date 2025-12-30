## IoT Weather Station Project

A full‑stack **IoT Weather Station** that collects environmental data using microcontrollers and sensors, transmits it over Wi‑Fi, stores it in a backend database, and visualizes it on a web dashboard.

This project is designed as an **academic + portfolio‑ready system**, demonstrating end‑to‑end IoT pipeline design, backend engineering, data persistence, and frontend visualization.

---

##  Project Objectives

* Collect real‑time weather data (temperature, humidity, wind, light, etc.)
* Transmit sensor data from microcontroller to server via HTTP
* Store readings reliably in a database (SQLite / optional Firebase)
* Display live and historical data on a web dashboard
* Follow clean software architecture and IoT best practices

---

##  System Architecture

```
[Sensors]
   ↓
[Raspberry Pi Pico W / ESP32]
   ↓  (Wi‑Fi + HTTP REST API)
[Node.js + Express Server]
   ↓
[SQLite Database]
   ↓
[Web Dashboard (HTML, CSS, Chart.js)]
```

---

## 🔌 Hardware Components

* **Microcontroller**: Raspberry Pi Pico W / ESP32
* **Temperature & Humidity**: DHT22 / DHT11
* **Wind Direction / Speed**: Potentiometer / Rotary Encoder
* **Light Sensor**: LDR / Analog input
* **Display**: OLED (SH1107 / SSD1306)
* **Indicators**: LEDs (alerts for thresholds)

---

##  Software Stack

### Firmware (Microcontroller)

* Arduino / PlatformIO
* WiFi / HTTPClient libraries
* Sensor drivers (DHT, ADC)

### Backend

* Node.js
* Express.js
* SQLite3
* Axios
* dotenv
* (Optional) Firebase Realtime Database

### Frontend

* HTML5
* CSS3 (custom styling)
* JavaScript
* Google Charts (data visualization)

---

## 📁 Project Folder Structure

```
pico-weather-station/
│
├── firmware/                  # Microcontroller code
│   ├── src/
│   │   └── main.cpp
│   └── platformio.ini
│
├── server/                    # Backend server
│   ├── index.js
│   ├── weather.db
│   ├── routes/
│   ├── controllers/
│   └── public/
│       ├── dashboard.html
│       ├── style.css
│       └── app.js
│
├── .env                       # Environment variables (not committed)
├── .gitignore
├── package.json
└── README.md
```

---

## 🌐 API Endpoints

### POST – Send Weather Data

```
POST /api/weather
```

**Payload (JSON):**

```json
{
  "temperature": 24.5,
  "humidity": 60,
  "wind": 3.2,
  "light": 180
}
```

### GET – Fetch Latest Data

```
GET /api/weather/latest
```

### GET – Fetch Historical Data

```
GET /api/weather/history
```

---

##  Database Schema (SQLite)

```sql
CREATE TABLE weather_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temperature REAL,
  humidity REAL,
  wind REAL,
  light INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Dashboard Features

* Live temperature, humidity, wind, and light readings
* Separate charts for each sensor
* Summary chart for trend analysis
* Auto‑refresh from backend API
* Clean, responsive UI

---

## ⚙️ Setup Instructions

### 1️ Clone Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd pico-weather-station
```

### Backend Setup

```bash
cd server
npm install
npm start
```

Server runs on:

```
http://localhost:3000
```

### Firmware Upload

* Open `firmware/` in PlatformIO or Arduino IDE
* Configure Wi‑Fi credentials
* Set server URL
* Upload to Pico W / ESP32

---

## Environment Variables (.env)

```
PORT=3000
FIREBASE_ENABLED=false
```

---

## Testing & Debugging

* Serial Monitor for sensor diagnostics
* Console logs for API requests
* SQLite browser for DB inspection
* Browser DevTools for dashboard debugging

---

## Future Improvements

* Cloud deployment (Azure / AWS)
* Authentication for the dashboard
* MQTT support
* Weather alerts & notifications
* Machine‑learning‑based trend prediction

---

## Academic Relevance

This project demonstrates:

* IoT pipeline design
* Embedded systems programming
* REST API development
* Database design
* Data visualization
* Systems engineering principles

---

## Author

**Parth Mangukiya**
Bachelor of Engineering – Mechanical Engineering
LAB University of Applied Sciences

---

## License

This project is for educational and portfolio purposes.
