#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"
#include <TFT_eSPI.h>

#define DHTPIN 7
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define LED_PIN 32

const char* ssid = "iPhone";
const char* password = "Password";

const char* SERVER_URL = "http://IP4V address 3000/api/weather";

const unsigned long SEND_INTERVAL_MS = 5000;
unsigned long lastSendMs = 0;

WiFiClient wifiClient;

static void blinkOnce(int onMs = 80, int offMs = 80) {
  digitalWrite(LED_PIN, LOW);  delay(onMs);
  digitalWrite(LED_PIN, HIGH); delay(offMs);
}

static void blinkError(int times = 2) {
  for (int i = 0; i < times; i++) blinkOnce(80, 80);
}

static void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retries++;

    if (retries % 60 == 0) Serial.println("Still connecting...");
  }
  Serial.println("\nWi-Fi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  randomSeed(analogRead(0));
}

void beepBuzzer(int duration) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(duration);
  digitalWrite(BUZZER_PIN, LOW);
}

static bool postReading(float tempC, float humPct, float windSpeed, float noiseLevel) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - cannot POST");
    return false;
  }

  HTTPClient http;

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
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }

  if (millis() - lastSendMs < SEND_INTERVAL_MS) {
    delay(10);
    return;
  }
  lastSendMs = millis();

  float temperature = 26.5;
  float humidity = 51.2;

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT read failed (NaN). Skipping send.");
    blinkError(2);
    return;
  }

  float windSpeed  = 0.0;
  float noiseLevel = 0.0;

  bool ok = postReading(temperature, humidity, windSpeed, noiseLevel);

  if (ok) {
    Serial.println("Sent successfully");
    blinkOnce(80, 80);
  } else {
    Serial.println("Wi-Fi disconnected, cannot send data.");
  }

  delay(5000); 
}
