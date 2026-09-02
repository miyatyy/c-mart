#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ==========================================
// 📡 KONFIGURASI WIFI & SERVER CLOUD
// ==========================================
const char* WIFI_SSID = "huehehe";
const char* WIFI_PASS = "banjarmasinpride2";

// URL Server Antasari Mart (Vercel API)
const char* SERVER_URL = "https://ma-project-fix.vercel.app/api/vending/dispense-status?claim=true";

// ==========================================
// ⚙️ KONFIGURASI MOTOR STEPPER 28BYJ-48
// ==========================================
#define STEPPER_IN1 19
#define STEPPER_IN2 18
#define STEPPER_IN3 5
#define STEPPER_IN4 17

#define LED_BUILTIN_PIN 2 // Lampu LED bawaan ESP32 untuk indikator

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
// ⚙️ PENGGERAK MOTOR STEPPER (DENGAN DUKUNGAN KELIPATAN JUMLAH/QTY)
// ==========================================
void rotateDispenser(int quantity = 1) {
  if (isMotorRunning) return;
  if (quantity < 1) quantity = 1;
  if (quantity > 10) quantity = 10; // Batas proteksi keamanan maksimum 10 putaran
  
  isMotorRunning = true;

  for (int item = 1; item <= quantity; item++) {
    char statusBuffer[64];
    snprintf(statusBuffer, sizeof(statusBuffer), "Mengeluarkan Barang ke-%d dari %d...", item, quantity);
    showStatusMessage("PENGELUARAN BLIND BAG 🎁", statusBuffer, "Memutar Spiral 360 Derajat... ⚙️");
    
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

    // Matikan koil stepper agar motor tidak panas
    digitalWrite(STEPPER_IN1, LOW);
    digitalWrite(STEPPER_IN2, LOW);
    digitalWrite(STEPPER_IN3, LOW);
    digitalWrite(STEPPER_IN4, LOW);
    digitalWrite(LED_BUILTIN_PIN, LOW);

    // Jika masih ada barang berikutnya yang harus dikeluarkan, beri jeda 800ms
    if (item < quantity) {
      Serial.printf("⏳ Jeda antar barang... Menyiapkan barang ke-%d\n", item + 1);
      delay(800);
    }
  }

  char finishBuffer[64];
  snprintf(finishBuffer, sizeof(finishBuffer), "%d Blind Bag Berhasil Dikeluarkan!", quantity);
  showStatusMessage("SUKSES TERAMBIL! 🎉", finishBuffer, "Silakan Ambil di Boks Pengambilan");
  isMotorRunning = false;
}

// ==========================================
// 🌐 WEB SERVER LOKAL ESP32 (UNTUK TES INSTAN & KELIPATAN QTY)
// ==========================================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>Smart Vending ESP32 Controller</title>";
  html += "<style>body{font-family:sans-serif;background:#FAFDFB;color:#243329;text-align:center;padding:40px 20px;}";
  html += ".card{background:white;padding:30px;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,0.08);max-width:420px;margin:0 auto;}";
  html += "button{background:linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%);color:white;border:none;padding:16px 24px;font-size:16px;font-weight:bold;border-radius:16px;cursor:pointer;width:100%;box-shadow:0 6px 20px rgba(95,168,116,0.3);}";
  html += ".qty-box{display:flex;align-items:center;justify-content:center;gap:12px;margin:20px 0;}";
  html += ".qty-input{width:70px;height:42px;text-align:center;font-size:20px;font-weight:bold;border-radius:10px;border:1.5px solid #5FA874;}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>🤖 Smart Vending ESP32</h2>";
  html += "<p style='color:#64748B;'>Status: <b>Terhubung ke WiFi Hotspot</b> 🟢</p>";
  html += "<form action='/dispense' method='GET'>";
  html += "<label style='font-size:14px;font-weight:bold;color:#475569;'>Pilih Jumlah Barang (Putaran):</label>";
  html += "<div class='qty-box'>";
  html += "<input type='number' name='qty' class='qty-input' value='2' min='1' max='10'>";
  html += "</div>";
  html += "<button type='submit'>🚀 PUTAR MOTOR STEPPER ⚙️</button>";
  html += "</form>";
  html += "<p style='font-size:12px;color:#94A3B8;margin-top:20px;'>Antasari Mart IoT System</p>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleDispenseWeb() {
  int qty = 1;
  if (server.hasArg("qty")) {
    qty = server.arg("qty").toInt();
  } else if (server.hasArg("count")) {
    qty = server.arg("count").toInt();
  }
  if (qty < 1) qty = 1;
  if (qty > 10) qty = 10;

  char alertMsg[90];
  snprintf(alertMsg, sizeof(alertMsg), "Perintah Diterima! Motor Stepper Berputar %d Kali!", qty);
  
  String responseHtml = "<script>alert('";
  responseHtml += alertMsg;
  responseHtml += "'); window.location.href='/';</script>";
  
  server.send(200, "text/html", responseHtml);
  rotateDispenser(qty);
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
      int quantity = doc["quantity"] | doc["qty"] | 1;
      if (quantity < 1) quantity = 1;
      
      char logMsg[80];
      snprintf(logMsg, sizeof(logMsg), "%s (Jumlah: %d Pcs)", productName, quantity);
      showStatusMessage("PESANAN DITERIMA DARI CLOUD! 🎁", logMsg, orderId);
      
      rotateDispenser(quantity);
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

  // Pastikan koil motor mati saat startup
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
    showStatusMessage("MESIN SIAP! 🤖✨", "Kunjungi Web Antasari Mart:", "https://antasari-mart.web.app");
    Serial.println("\n=======================================================");
    Serial.printf("📡 IP ADDRESS ESP32: http://%s/\n", WiFi.localIP().toString().c_str());
    Serial.println("💡 Buka link IP di atas pada browser HP/Laptop untuk Tes Putar Langsung!");
    Serial.println("=======================================================\n");

    // Jalankan Web Server Lokal ESP32
    server.on("/", HTTP_GET, handleRoot);
    server.on("/dispense", HTTP_GET, handleDispenseWeb);
    server.begin();
    Serial.println("🌐 Web Server ESP32 Aktif di Port 80!");
  } else {
    showStatusMessage("MODE OFFLINE ⚡", "WiFi Belum Terhubung", "Cek Nama & Password Hotspot");
  }
}

// ==========================================
// 🔄 LOOP UTAMA ESP32
// ==========================================
void loop() {
  server.handleClient();
  checkDispenseQueue();
  delay(10);
}
