/**
 * ==============================================================================
 * 🤖 SMART VENDING MACHINE MYAMMIY STORE - ESP32 & STEPPER 28BYJ-48
 * Proyek IoT & AI Voice Kiosk Antasari Mart (UIN Antasari Banjarmasin)
 * ==============================================================================
 * 
 * 📌 WIRING PINOUT ESP32:
 * ------------------------------------------------------------------------------
 * 1. DRIVER STEPPER ULN2003 (Motor 28BYJ-48):
 *    - IN1 -> GPIO 19
 *    - IN2 -> GPIO 18
 *    - IN3 -> GPIO 5
 *    - IN4 -> GPIO 17
 *    - VCC / + -> VIN / 5V pada ESP32 (atau Adaptor 5V eksternal)
 *    - GND / - -> GND pada ESP32
 * ==============================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==========================================
// 📶 KONFIGURASI WIFI & SERVER
// ==========================================
const char* WIFI_SSID = "huehehe";       // SSID WiFi/Tethering HP Kakak
const char* WIFI_PASS = "banjarmasinpride2";   // Password WiFi

// URL Server Antasari Mart (Vercel API)
const char* SERVER_URL = "https://ma-project-fix.vercel.app/api/vending/dispense-status?claim=true";

// ==========================================
// ⚙️ KONFIGURASI MOTOR STEPPER 28BYJ-48
// ==========================================
#define STEPPER_IN1 19
#define STEPPER_IN2 18
#define STEPPER_IN3 5
#define STEPPER_IN4 17

#define LED_BUILTIN_PIN 2  // Lampu LED bawaan ESP32 untuk indikator

// Server Web Lokal ESP32 untuk Tombol Uji Coba Langsung di HP/Laptop
WebServer server(80);

// Urutan Step untuk 28BYJ-48 (8-step sequence halus)
const int stepSequence[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1}
};

// 1 Putaran Penuh (360 Derajat) Motor 28BYJ-48 ~ 4096 Steps
const int STEPS_PER_DISPENSE = 4096; 
int currentStepIndex = 0;
bool isMotorRunning = false;

// ==========================================
// 🖥️ TAMPILAN STATUS (SERIAL MONITOR)
// ==========================================
void showStatusMessage(const char* title, const char* subtitle, const char* status) {
  Serial.println("\n----------------------------------------");
  Serial.printf("📌 [%s]\n", title);
  if (strlen(subtitle) > 0) Serial.printf("💬 %s\n", subtitle);
  if (strlen(status) > 0) Serial.printf("⚡ %s\n", status);
  Serial.println("----------------------------------------");
}

// ==========================================
// ⚙️ PENGGERAK MOTOR STEPPER (PUTARAN 360 DERAJAT)
// ==========================================
void rotateDispenser() {
  if (isMotorRunning) return;
  isMotorRunning = true;

  showStatusMessage("PENGELUARAN BARANG", "Memutar Spiral Blind Bag...", "Harap Tunggu... ⚙️");
  digitalWrite(LED_BUILTIN_PIN, HIGH);

  for (int step = 0; step < STEPS_PER_DISPENSE; step++) {
    for (int pin = 0; pin < 4; pin++) {
      int pinVal = stepSequence[currentStepIndex][pin];
      switch(pin) {
        case 0: digitalWrite(STEPPER_IN1, pinVal); break;
        case 1: digitalWrite(STEPPER_IN2, pinVal); break;
        case 2: digitalWrite(STEPPER_IN3, pinVal); break;
        case 3: digitalWrite(STEPPER_IN4, pinVal); break;
      }
    }
    currentStepIndex = (currentStepIndex + 1) % 8;
    delayMicroseconds(1000); // Kecepatan putaran halus & bertenaga
  }

  // Matikan semua koil stepper agar motor tidak panas
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);
  digitalWrite(LED_BUILTIN_PIN, LOW);

  showStatusMessage("SUKSES TERAMBIL! 🎉", "Blind Bag Rp 35.000 Jatuh", "Silakan Ambil di Boks Pengambilan");
  isMotorRunning = false;
}

// ==========================================
// 🌐 WEB SERVER LOKAL ESP32 (UNTUK TES INSTAN)
// ==========================================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>Smart Vending ESP32 Controller</title>";
  html += "<style>body{font-family:sans-serif;background:#FAFDFB;color:#243329;text-align:center;padding:40px 20px;}";
  html += ".card{background:white;padding:30px;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,0.08);max-width:400px;margin:0 auto;}";
  html += "button{background:linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%);color:white;border:none;padding:16px 32px;font-size:16px;font-weight:bold;border-radius:16px;cursor:pointer;width:100%;box-shadow:0 6px 20px rgba(95,168,116,0.3);}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>🤖 Smart Vending ESP32</h2>";
  html += "<p style='color:#64748B;'>Status: <b>Terhubung ke WiFi Hokiku 5g</b> 🟢</p>";
  html += "<form action='/dispense' method='GET'><button type='submit'>🚀 TES PUTAR MOTOR STEPPER SEKARANG ⚙️</button></form>";
  html += "<p style='font-size:12px;color:#94A3B8;margin-top:20px;'>Antasari Mart IoT Kiosk</p>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleDispenseWeb() {
  server.send(200, "text/html", "<script>alert('Perintah Diterima! Motor Stepper Berputar!'); window.location.href='/';</script>");
  rotateDispenser();
}

// ==========================================
// 📡 CEK PERINTAH PENGELUARAN DARI WEBSITE CLOUD
// ==========================================
unsigned long lastPollTime = 0;

void checkDispenseQueue() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  // Polling setiap 2.5 detik
  if (millis() - lastPollTime < 2500) {
    return;
  }
  lastPollTime = millis();

  HTTPClient http;
  http.begin(SERVER_URL);
  http.setTimeout(3000);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error && doc["hasPendingDispense"] == true) {
      const char* orderId = doc["orderId"] | "ORD-001";
      const char* productName = doc["productName"] | "Blind Bag Mystery Ganci";
      
      showStatusMessage("PESANAN DITERIMA DARI CLOUD! 🎁", productName, orderId);
      rotateDispenser();
    }
  }
  http.end();
}

// ==========================================
// 🚀 SETUP UTAMA ESP32
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);
  pinMode(LED_BUILTIN_PIN, OUTPUT);

  // Matikan semua pin motor di awal
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  showStatusMessage("STARTING MESIN...", "Menghubungkan ke WiFi...", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN_PIN, !digitalRead(LED_BUILTIN_PIN));
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_BUILTIN_PIN, HIGH);
    showStatusMessage("MESIN SIAP! 🤖✨", "Kunjungi Web Antasari Mart:", "https://ma-project-fix.vercel.app");
    Serial.println("\n=======================================================");
    Serial.printf("📡 IP ADDRESS ESP32: http://%s/\n", WiFi.localIP().toString().c_str());
    Serial.println("💡 Buka link IP di atas pada browser HP/Laptop untuk Tes Putar Langsung!");
    Serial.println("=======================================================\n");

    // Start Web Server
    server.on("/", handleRoot);
    server.on("/dispense", handleDispenseWeb);
    server.begin();
  } else {
    showStatusMessage("MODE OFFLINE ⚡", "WiFi Belum Terhubung", "Cek Nama & Password Hotspot");
  }
}

// ==========================================
// 🔄 LOOP UTAMA
// ==========================================
void loop() {
  server.handleClient();
  checkDispenseQueue();
}
