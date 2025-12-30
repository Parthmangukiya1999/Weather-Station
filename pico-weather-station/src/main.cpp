#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

// ------------------- Sensor Pins -------------------
#define DHTPIN 7
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// RB-P-XPLR onboard LED (your pin)
#define LED_PIN 32

// ------------------- WiFi + Server -------------------
const char* ssid = "iPhone";
const char* password = "123412341235";

// Your PC IPv4 (confirmed) + backend endpoint
const char* SERVER_URL = "http://172.20.10.5:3000/api/weather";

// ------------------- Timing -------------------
const unsigned long SEND_INTERVAL_MS = 5000;
unsigned long lastSendMs = 0;

WiFiClient wifiClient;

// ------------------- Helpers -------------------
static void blinkOnce(int onMs = 80, int offMs = 80) {
  digitalWrite(LED_PIN, LOW);  delay(onMs);
  digitalWrite(LED_PIN, HIGH); delay(offMs);
}

static void blinkError(int times = 2) {
  for (int i = 0; i < times; i++) blinkOnce(80, 80);
}

static void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");

    if (millis() - start > 20000) { // 20s timeout
      Serial.println("\nWiFi connect timeout. Retrying...");
      WiFi.disconnect();
      delay(1000);
      WiFi.begin(ssid, password);
      start = millis();
    }
  }

  Serial.println("\nWiFi connected");
  Serial.print("Pico IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Gateway: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("RSSI: ");
  Serial.println(WiFi.RSSI());
}

static bool postReading(float tempC, float humPct, float windSpeed, float noiseLevel) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - cannot POST");
    return false;
  }

  HTTPClient http;

  // Build JSON payload
  String body = "{";
  body += "\"temperature\":" + String(tempC, 2) + ",";
  body += "\"humidity\":" + String(humPct, 2) + ",";
  body += "\"windSpeed\":" + String(windSpeed, 2) + ",";
  body += "\"noiseLevel\":" + String(noiseLevel, 2);
  body += "}";

  Serial.print("Posting to: ");
  Serial.println(SERVER_URL);
  Serial.print("POST payload: ");
  Serial.println(body);

  http.setTimeout(8000);

  // IMPORTANT: begin with WiFiClient
  if (!http.begin(wifiClient, SERVER_URL)) {
    Serial.println("HTTP begin failed");
    http.end();
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
  String resp = http.getString();

  Serial.print("POST code: ");
  Serial.println(code);
  Serial.print("Response: ");
  Serial.println(resp);

  http.end();

  // Success when 2xx
  return (code >= 200 && code < 300);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  dht.begin();
  connectWiFi();

  Serial.println("Setup complete. Starting loop...");
}

void loop() {
  // Keep WiFi alive
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }

  // Rate limit
  if (millis() - lastSendMs < SEND_INTERVAL_MS) {
    delay(10);
    return;
  }
  lastSendMs = millis();

  // Read DHT
  // float temperature = dht.readTemperature();
  // float humidity    = dht.readHumidity();
  float temperature = 26.5;
  float humidity = 51.2;

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT read failed (NaN). Skipping send.");
    // Error blink pattern
    blinkError(2);
    return;
  }

  // TODO: Replace with your real sensors later
  float windSpeed  = 0.0;
  float noiseLevel = 0.0;

  // Send
  bool ok = postReading(temperature, humidity, windSpeed, noiseLevel);

  if (ok) {
    Serial.println("Sent successfully");
    blinkOnce(80, 80);
  } else {
    Serial.println(" Send failed");
    blinkError(3);
  }
}
