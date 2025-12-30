require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json()); 

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// FIREBASE (OPTIONAL)
let fbDb = null;

try {
  const admin = require("firebase-admin"); // only loaded if installed
  const serviceAccount = require(path.join(__dirname, "serviceAccount.json"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      "https://weatherstation-wazed-default-rtdb.europe-west1.firebasedatabase.app",
  });

  fbDb = admin.database();
  console.log("Firebase enabled");
} catch (err) {
  console.log(
    "Firebase disabled (serviceAccount.json missing or firebase-admin not installed). Using SQLite only."
  );
}

const sqlitePath = path.join(__dirname, "weather.db");
const db = new sqlite3.Database(sqlitePath, (err) => {
  if (err) console.error("SQLite error:", err.message);
  else console.log("SQLite connected:", sqlitePath);
});

db.run(
  `CREATE TABLE IF NOT EXISTS weather_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temperature REAL,
    humidity REAL,
    windSpeed REAL,
    noiseLevel REAL,
    timestamp TEXT
  )`,
  (err) => {
    if (err) console.error("Table error:", err.message);
    else console.log("SQLite table 'weather_readings' ready");
  }
);

function saveToSQLite(payload) {
  const stmt = db.prepare(
    `INSERT INTO weather_readings (temperature, humidity, windSpeed, noiseLevel, timestamp)
     VALUES (?, ?, ?, ?, ?)`
  );

  stmt.run(
    payload.temperature,
    payload.humidity,
    payload.windSpeed,
    payload.noiseLevel,
    payload.timestamp,
    (err) => {
      if (err) console.error("SQLite insert:", err.message);
      else console.log("Saved to SQLite");
    }
  );

  stmt.finalize();
}

function buildAlerts(payload) {
  const alerts = [];
  const t = Number(payload.temperature);
  const h = Number(payload.humidity);
  const w = Number(payload.windSpeed);
  const n = Number(payload.noiseLevel);

  if (t >= 45) alerts.push("EXTREME DANGER! Risk of heat stroke.");
  else if (t >= 38) alerts.push("VERY HOT — Stay hydrated.");
  else if (t >= 30) alerts.push("Warm — Monitor comfort.");
  else if (t < 10) alerts.push("Very cold — Keep warm.");

  if (h < 30) alerts.push("Air too dry — use a humidifier.");
  if (h > 80) alerts.push("High humidity — mold risk.");

  if (w > 80) alerts.push("Extreme wind danger.");
  else if (w > 50) alerts.push("High wind detected.");

  if (n > 100) alerts.push("Dangerous noise level.");
  else if (n > 80) alerts.push("Loud noise — unsafe long exposure.");

  return alerts;
}

function shouldSendAlert(payload) {
  const base = Number(process.env.ALERT_TEMP) || 40;
  return (
    payload.temperature >= base ||
    payload.humidity < 30 ||
    payload.humidity > 80 ||
    payload.windSpeed > 50 ||
    payload.noiseLevel > 80
  );
}

async function sendWhatsAppAlert(payload) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!phone || !apiKey) return;

  const alerts = buildAlerts(payload);
  if (alerts.length === 0) return;

  const msg = `Weather Station Alert

Temp: ${payload.temperature.toFixed(1)}°C
Humidity: ${payload.humidity}%
Wind: ${payload.windSpeed} km/h
Noise: ${payload.noiseLevel} dB

Alerts:
${alerts.map((a) => "- " + a).join("\n")}

Time: ${new Date(payload.timestamp).toLocaleString()}
`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(
    msg
  )}&apikey=${apiKey}`;

  try {
    await axios.get(url);
    console.log("WhatsApp alert sent");
  } catch (err) {
    console.error("WhatsApp error:", err.message);
  }
}


app.post("/api/weather", async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const payload = {
      temperature: Number(req.body.temperature),
      humidity: Number(req.body.humidity),
      windSpeed: Number(req.body.windSpeed),
      noiseLevel: Number(req.body.noiseLevel),
      timestamp,
    };

    console.log("Received from Pico:", payload);

    saveToSQLite(payload);

    if (fbDb) {
      await fbDb.ref("weather").push(payload);
      console.log("Saved to Firebase");
    }

    if (shouldSendAlert(payload)) {
      sendWhatsAppAlert(payload);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("/api/weather:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/readings/latest", (req, res) => {
  db.get(
    "SELECT * FROM weather_readings ORDER BY id DESC LIMIT 1",
    (err, row) => {
      if (err) {
        console.error("SQLite error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(row || {});
    }
  );
});

app.get("/api/readings", (req, res) => {
  const range = req.query.range || "24h";

  let limit = 1440;
  if (range === "1h") limit = 60;
  else if (range === "6h") limit = 360;
  else if (range === "12h") limit = 720;
  else if (range === "7d") limit = 10080;

  db.all(
    "SELECT * FROM weather_readings ORDER BY id DESC LIMIT ?",
    [limit],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json((rows || []).reverse());
    }
  );
});


app.get("/api/debug/count", (req, res) => {
  db.get("SELECT COUNT(*) AS count FROM weather_readings", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// API — Global Weather (OpenWeather)
app.get("/api/openweather", async (req, res) => {
  try {
    const { city, country } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!city || !country) return res.status(400).send("city and country required");
    if (!apiKey) return res.status(400).send("OPENWEATHER_API_KEY missing in .env");

    const q = encodeURIComponent(`${city},${country}`);

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${q}&units=metric&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${q}&units=metric&appid=${apiKey}`;

    const [c, f] = await Promise.all([axios.get(currentUrl), axios.get(forecastUrl)]);
    res.json({ current: c.data, forecast: f.data });
  } catch (err) {
    res.status(500).send("OpenWeather error: " + err.message);
  }
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Serving dashboard from:", publicDir);
});
