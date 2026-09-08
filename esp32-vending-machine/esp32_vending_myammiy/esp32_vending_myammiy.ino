/*
  =============================================================================
  🤖 SMART VENDING IOT ULTIMATE - ANTASARI MART (ESP32-S3 + TFT + STEPPER)
  =============================================================================
  Fitur Terpadu:
  1. 📺 Layar TFT SPI 240x320: Menampilkan Katalog Menu, IP, & Animasi Realtime
  2. ⚙️ Motor Stepper 28BYJ-48: Berputar Fisik 360 Derajat per Jumlah Barang
  3. 🌐 Web Server & IP Controller: Beli Langsung dari Browser HP/Laptop
  4. ☁️ Cloud Polling: Sinkron dengan Website https://antasari-mart.web.app
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

// ==========================================
// 📡 1. KONFIGURASI WIFI & CLOUD
// ==========================================
const char* WIFI_SSID = "Hokiku_repeat";
const char* WIFI_PASS = "Banjarmasin89";
const char* SERVER_URL = "https://ma-project-fix.vercel.app/api/vending/dispense-status?claim=true";

WebServer server(80);

// ==========================================
// 📺 2. PINOUT LAYAR TFT SPI (ESP32-S3)
// ==========================================
#define TFT_RST   8   // Reset
#define TFT_DC    9   // Data / Command
#define TFT_CS    10  // Chip Select
#define TFT_MOSI  11  // Data In (SDI / MOSI)
#define TFT_SCK   12  // Clock (SCK / SCL)
#define TFT_MISO  -1

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

// Palet Warna 16-Bit RGB565 Estetik Antasari Mart
#define COLOR_BG        0xF7BE // Soft Beige Ivory
#define COLOR_DARK      0x2185 // Deep Forest Green (#243329)
#define COLOR_PRIMARY   0x5D4E // Soft Olive Green (#5FA874)
#define COLOR_PINK      0xF578 // Soft Pastel Pink (#F4AEC2)
#define COLOR_BLUE      0x7E3F // Sky Blue
#define COLOR_PURPLE    0xA31E // Violet Purple
#define COLOR_CARD_BG   0xFFFF // Putih Bersih
#define COLOR_WHITE     0xFFFF
#define COLOR_YELLOW    0xFEC0
#define COLOR_GREEN_OK  0x2E6B

// ==========================================
// ⚙️ 3. PINOUT MOTOR STEPPER 28BYJ-48 (ESP32-S3)
// ==========================================
#define STEPPER_IN1 4  // Baris 10 Breadboard
#define STEPPER_IN2 5  // Baris 11 Breadboard
#define STEPPER_IN3 6  // Baris 12 Breadboard
#define STEPPER_IN4 7  // Baris 13 Breadboard

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

const int STEPS_PER_REV = 4096; // 1 Putaran Penuh (360 Derajat)
int currentStepIndex = 0;
bool isDispensing = false;
bool isApMode = false;

// ==========================================
// 🎨 4. FUNGSI GRAFIS LAYAR TFT
// ==========================================

void drawIdleMenu() {
  tft.fillScreen(COLOR_BG);

  // Header Bar Atas
  tft.fillRect(0, 0, 320, 38, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(16, 11);
  tft.print("ANTASARI MART VENDING");

  // Subheader
  tft.fillRect(0, 38, 320, 20, COLOR_DARK);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 44);
  tft.print("BELI DI HP: antasari-mart.web.app");

  // --- KOTAK SLOT A ---
  tft.fillRoundRect(8, 64, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(8, 64, 148, 70, 8, COLOR_PRIMARY);
  tft.fillRect(8, 64, 148, 20, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 70);
  tft.print("[A] SERI 1 CUTE");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(14, 90);
  tft.print("Animal Mystery");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(14, 108);
  tft.print("35.000");

  // --- KOTAK SLOT B ---
  tft.fillRoundRect(164, 64, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(164, 64, 148, 70, 8, COLOR_PINK);
  tft.fillRect(164, 64, 148, 20, COLOR_PINK);
  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(170, 70);
  tft.print("[B] SERI 2 PASTEL");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(170, 90);
  tft.print("Dream Series");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(170, 108);
  tft.print("45.000");

  // --- KOTAK SLOT C ---
  tft.fillRoundRect(8, 140, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(8, 140, 148, 70, 8, COLOR_BLUE);
  tft.fillRect(8, 140, 148, 20, COLOR_BLUE);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 146);
  tft.print("[C] SERI 3 GLOW");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(14, 166);
  tft.print("Dark Edition");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(14, 184);
  tft.print("50.000");

  // --- KOTAK SLOT D ---
  tft.fillRoundRect(164, 140, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(164, 140, 148, 70, 8, COLOR_PURPLE);
  tft.fillRect(164, 140, 148, 20, COLOR_PURPLE);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(170, 146);
  tft.print("[D] SECRET RARE");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(170, 166);
  tft.print("Special Edition");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(170, 184);
  tft.print("60.000");

  // Footer Status & IP Address Otomatis di Layar
  tft.fillRect(0, 218, 320, 22, COLOR_DARK);
  tft.setTextSize(1);
  
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(COLOR_GREEN_OK);
    tft.setCursor(10, 224);
    char footerBuffer[64];
    snprintf(footerBuffer, sizeof(footerBuffer), "IP: http://%s/ | ONLINE 🟢", WiFi.localIP().toString().c_str());
    tft.print(footerBuffer);
  } else if (isApMode) {
    tft.setTextColor(COLOR_YELLOW);
    tft.setCursor(8, 224);
    tft.print("WIFI: Antasari-Vending | IP: 192.168.4.1");
  } else {
    tft.setTextColor(COLOR_YELLOW);
    tft.setCursor(10, 224);
    tft.print("WIFI: Menghubungkan... | STANDBY 🟡");
  }
}

void drawDispensingScreen(const char* productName, int slotNumber, int currentItem, int totalItems) {
  tft.fillScreen(COLOR_BG);

  tft.fillRect(0, 0, 320, 45, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 14);
  tft.print("MENGELUARKAN BARANG 🎁");

  tft.fillRoundRect(16, 58, 288, 150, 12, COLOR_CARD_BG);
  tft.drawRoundRect(16, 58, 288, 150, 12, COLOR_PRIMARY);

  char slotTitle[40];
  snprintf(slotTitle, sizeof(slotTitle), "SLOT #%d: %s", slotNumber, productName);
  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(28, 75);
  tft.print(slotTitle);

  char progressStr[50];
  snprintf(progressStr, sizeof(progressStr), "Putaran: %d dari %d Pcs", currentItem, totalItems);
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(28, 100);
  tft.print(progressStr);

  tft.setTextColor(COLOR_PINK);
  tft.setTextSize(1);
  tft.setCursor(28, 132);
  tft.print("Spiral Motor Stepper Sedang Berputar 360...");

  tft.fillRect(0, 218, 320, 22, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(18, 224);
  tft.print("HARAP TUNGGU SAMPAI BARANG JATUH... ⚙️");
}

void drawSuccessScreen(int totalItems) {
  tft.fillScreen(COLOR_PRIMARY);
  tft.fillRoundRect(20, 25, 280, 190, 16, COLOR_CARD_BG);

  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(45, 50);
  tft.print("SUKSES TERAMBIL! 🎉");

  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(35, 90);
  char doneMsg[70];
  snprintf(doneMsg, sizeof(doneMsg), "%d Blind Bag Selesai Dikeluarkan!", totalItems);
  tft.print(doneMsg);

  tft.setCursor(35, 115);
  tft.print("Silakan ambil di boks pengambilan.");

  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(1);
  tft.setCursor(35, 155);
  tft.print("Terima kasih berbelanja di Antasari Mart ✨");
}

// ==========================================
// ⚙️ 5. PENGGERAK MOTOR STEPPER & LAYAR SERENTAK
// ==========================================
void executeDispense(int slotNumber, int quantity, const char* productName) {
  if (isDispensing) return;
  if (quantity < 1) quantity = 1;
  if (quantity > 10) quantity = 10;

  isDispensing = true;
  Serial.printf("\n🚀 MEMULAI PENGELUARAN: Slot %d | Jumlah: %d Pcs | %s\n", slotNumber, quantity, productName);

  for (int item = 1; item <= quantity; item++) {
    // 1. Tampilkan Animasi di Layar TFT
    drawDispensingScreen(productName, slotNumber, item, quantity);

    // 2. Putar Motor Stepper 360 Derajat Penuh
    Serial.printf("⚙️ Memutar Motor Stepper (Item %d/%d)...\n", item, quantity);
    for (int step = 0; step < STEPS_PER_REV; step++) {
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
      delayMicroseconds(2500); // Torsi maksimal & putaran bertenaga // Kecepatan putaran halus & bertenaga
    }

    // Matikan koil motor
    digitalWrite(STEPPER_IN1, LOW);
    digitalWrite(STEPPER_IN2, LOW);
    digitalWrite(STEPPER_IN3, LOW);
    digitalWrite(STEPPER_IN4, LOW);

    // Jeda antar barang jika beli lebih dari 1
    if (item < quantity) {
      Serial.println("⏳ Jeda antar barang 800ms...");
      delay(800);
    }
  }

  // 3. Tampilkan Layar Sukses selama 3.5 detik
  drawSuccessScreen(quantity);
  delay(3500);

  // 4. Kembali ke Menu Standby
  drawIdleMenu();
  isDispensing = false;
  Serial.println("✅ Pengeluaran Selesai & Sistem Kembali Siap!");
}

// ==========================================
// 🌐 6. WEB SERVER LOKAL & IP CONTROLLER
// ==========================================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>Antasari Mart Vending Controller</title>";
  html += "<style>body{font-family:sans-serif;background:#FAFDFB;color:#243329;text-align:center;padding:25px 15px;}";
  html += ".card{background:white;padding:25px;border-radius:20px;box-shadow:0 8px 25px rgba(0,0,0,0.08);max-width:400px;margin:0 auto;}";
  html += ".btn{background:linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%);color:white;border:none;padding:14px;font-size:15px;font-weight:bold;border-radius:12px;cursor:pointer;width:100%;margin:6px 0;box-shadow:0 4px 15px rgba(95,168,116,0.3);}";
  html += ".qty-box{display:flex;align-items:center;justify-content:center;gap:10px;margin:15px 0;}";
  html += ".qty-input{width:60px;height:38px;text-align:center;font-size:18px;font-weight:bold;border-radius:8px;border:1.5px solid #5FA874;}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>🤖 Antasari Mart Vending</h2>";
  html += "<p style='color:#64748B;font-size:13px;'>Status: <b>Layar TFT & Stepper Terhubung</b> 🟢</p>";
  html += "<form action='/dispense' method='GET'>";
  html += "<label style='font-size:13px;font-weight:bold;'>Pilih Jumlah (Putaran):</label>";
  html += "<div class='qty-box'><input type='number' name='qty' class='qty-input' value='1' min='1' max='10'></div>";
  html += "<button type='submit' name='slot' value='1' class='btn'>🅰️ Beli Slot A: Seri 1 Cute (Rp 35K)</button>";
  html += "<button type='submit' name='slot' value='2' class='btn'>🅱️ Beli Slot B: Seri 2 Pastel (Rp 45K)</button>";
  html += "<button type='submit' name='slot' value='3' class='btn'>🅲 Beli Slot C: Seri 3 Glow (Rp 50K)</button>";
  html += "<button type='submit' name='slot' value='4' class='btn'>🅳 Beli Slot D: Secret Rare (Rp 60K)</button>";
  html += "</form>";
  html += "<p style='font-size:11px;color:#94A3B8;margin-top:15px;'>Sistem IoT Vending Antasari Mart</p>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleDispenseWeb() {
  int slot = 1;
  int qty = 1;
  if (server.hasArg("slot")) slot = server.arg("slot").toInt();
  if (server.hasArg("qty")) qty = server.arg("qty").toInt();

  const char* prodName = "Blind Bag Seri 1 Cute";
  if (slot == 2) prodName = "Blind Bag Seri 2 Pastel";
  if (slot == 3) prodName = "Blind Bag Seri 3 Glow";
  if (slot == 4) prodName = "Blind Bag Secret Rare";

  server.send(200, "text/html", "<script>alert('Perintah Diterima! Motor Stepper & Layar TFT Berjalan!'); window.location.href='/';</script>");
  executeDispense(slot, qty, prodName);
}

// ==========================================
// 📡 7. CLOUD POLLING DARI WEBSITE UTAMA
// ==========================================
unsigned long lastPollTime = 0;

void checkDispenseQueue() {
  if (WiFi.status() != WL_CONNECTED || isDispensing || isApMode) return;
  if (millis() - lastPollTime < 2500) return;
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
      const char* productName = doc["productName"] | "Blind Bag Mystery Ganci";
      int slotNumber = doc["slotNumber"] | 1;
      int quantity = doc["quantity"] | doc["qty"] | 1;
      
      executeDispense(slotNumber, quantity, productName);
    }
  }
  http.end();
}

// ==========================================
// 🚀 SETUP UTAMA ESP32-S3
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n🚀 SISTEM ESP32-S3 TFT & STEPPER DIMULAI!");

  // Inisialisasi Pin Motor Stepper (Pin 4, 5, 6, 7)
  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);

  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  // Inisialisasi Layar TFT SPI (Pin 8, 9, 10, 11, 12)
  SPI.begin(TFT_SCK, TFT_MISO, TFT_MOSI, TFT_CS);
  tft.begin();
  tft.setRotation(1); // Landscape (320x240)
  
  drawIdleMenu();

  // Koneksi WiFi
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(200);

  Serial.printf("📡 Menghubungkan ke WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  WiFi.setAutoReconnect(true);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 25) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    isApMode = false;
    Serial.printf("\n✅ WIFI TERHUBUNG! IP ADDRESS: http://%s/\n", WiFi.localIP().toString().c_str());

    server.on("/", HTTP_GET, handleRoot);
    server.on("/dispense", HTTP_GET, handleDispenseWeb);
    server.begin();
    Serial.println("🌐 Web Server Vending Aktif di Port 80!");
    
    drawIdleMenu();
  } else {
    // Mode Hotspot Darurat Otomatis jika WiFi offline
    Serial.println("\n⚠️ WiFi Gagal! Mengaktifkan Hotspot ESP32 'Antasari-Vending'...");
    isApMode = true;
    WiFi.mode(WIFI_AP);
    WiFi.softAP("Antasari-Vending", "12345678");

    IPAddress apIP = WiFi.softAPIP();
    Serial.printf("📡 HOTSPOT ESP32: 'Antasari-Vending' (PW: 12345678)\n");
    Serial.printf("🌐 Buka Browser di HP: http://%s/\n", apIP.toString().c_str());

    server.on("/", HTTP_GET, handleRoot);
    server.on("/dispense", HTTP_GET, handleDispenseWeb);
    server.begin();

    drawIdleMenu();
  }
}

// ==========================================
// 🔄 LOOP UTAMA ESP32-S3
// ==========================================
void loop() {
  server.handleClient();
  checkDispenseQueue();
  delay(10);
}
