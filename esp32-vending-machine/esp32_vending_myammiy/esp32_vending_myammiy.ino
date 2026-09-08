/*
  =============================================================================
  🤖 SMART VENDING IOT - ANTASARI MART (EDISI KARAKTER KARTUN ESTETIK)
  =============================================================================
  Fitur Utama:
  1. 🐱 Layar TFT 240x320: Karakter Kartun Lucu (Kucing, Kelinci, Beruang, Bintang Mahkota)
  2. 🔲 Tampilan Bersih, Rapi & Tidak Full Selayar (Ada Bingkai Estetik & Elegan)
  3. 🛑 Tulisan Statis / Diam (Tidak Bergerak-gerak, Sangat Mudah Dibaca)
  4. 😉 Karakter Kartun Berkedip Lucu Secara Alami
  5. ⚙️ Motor Stepper 28BYJ-48 Berputar 360 Derajat per Jumlah Barang
  6. 🌐 Terhubung Otomatis ke WiFi Hokiku_repeat & Cloud antasari-mart.web.app
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
#define TFT_MOSI  11  // Data In (MOSI)
#define TFT_SCK   12  // Clock (SCK)
#define TFT_MISO  -1

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

// Palet Warna 16-Bit RGB565 Estetik Antasari Mart
#define COLOR_BG        0xF7BE // Soft Ivory Beige (#FAFDFB)
#define COLOR_DARK      0x2185 // Deep Forest Green (#243329)
#define COLOR_PRIMARY   0x5D4E // Soft Olive Green (#5FA874)
#define COLOR_PINK      0xF578 // Soft Pastel Pink (#F4AEC2)
#define COLOR_PINK_DARK 0xEB50 // Pink Pipi / Telinga
#define COLOR_BLUE      0x7E3F // Sky Blue Pastel
#define COLOR_PURPLE    0xA31E // Violet Pastel
#define COLOR_CARD_BG   0xFFFF // Putih Bersih
#define COLOR_WHITE     0xFFFF
#define COLOR_YELLOW    0xFEC0
#define COLOR_GREEN_OK  0x2E6B
#define COLOR_GOLD      0xFD20
#define COLOR_BROWN     0x9B44 // Cokelat Beruang
#define COLOR_CREAM     0xFF7A // Muzzle Beruang

// ==========================================
// ⚙️ 3. PINOUT MOTOR STEPPER 28BYJ-48
// ==========================================
#define STEPPER_IN1 4  // Baris 10 Breadboard / Pin 4
#define STEPPER_IN2 5  // Baris 11 Breadboard / Pin 5
#define STEPPER_IN3 6  // Baris 12 Breadboard / Pin 6
#define STEPPER_IN4 7  // Baris 13 Breadboard / Pin 7

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

const int STEPS_PER_REV = 4096; // 360 Derajat
int currentStepIndex = 0;
bool isDispensing = false;

// Variabel Waktu & Animasi Kedip Mata Karakter
unsigned long lastBlinkTime = 0;
unsigned long lastCloudPollTime = 0;
unsigned long lastWifiRetryTime = 0;
bool eyesOpen = true;

// ==========================================
// 🎨 4. FUNGSI MENGGAMBAR KARAKTER KARTUN LUCU
// ==========================================

// --- Karakter 1: Kucing Lucu (Cat Kawaii) di Slot A ---
void drawCartoonCat(int cx, int cy, bool open) {
  // Telinga Kucing (Kiri & Kanan)
  tft.fillTriangle(cx - 16, cy - 10, cx - 8, cy - 26, cx - 2, cy - 12, COLOR_PRIMARY);
  tft.fillTriangle(cx + 16, cy - 10, cx + 8, cy - 26, cx + 2, cy - 12, COLOR_PRIMARY);
  tft.fillTriangle(cx - 14, cy - 11, cx - 8, cy - 22, cx - 4, cy - 13, COLOR_PINK);
  tft.fillTriangle(cx + 14, cy - 11, cx + 8, cy - 22, cx + 4, cy - 13, COLOR_PINK);

  // Kepala Kucing
  tft.fillCircle(cx, cy, 18, COLOR_CARD_BG);
  tft.drawCircle(cx, cy, 18, COLOR_PRIMARY);

  // Pipi Merona (Blushing Cheeks)
  tft.fillCircle(cx - 10, cy + 5, 3, COLOR_PINK);
  tft.fillCircle(cx + 10, cy + 5, 3, COLOR_PINK);

  // Hidung & Mulut Kucing
  tft.fillTriangle(cx - 2, cy + 2, cx + 2, cy + 2, cx, cy + 4, COLOR_PINK_DARK);
  tft.drawLine(cx - 3, cy + 7, cx, cy + 5, COLOR_DARK);
  tft.drawLine(cx + 3, cy + 7, cx, cy + 5, COLOR_DARK);

  // Mata Kucing (Terbuka / Berkedip)
  if (open) {
    tft.fillCircle(cx - 6, cy - 2, 3, COLOR_DARK);
    tft.fillCircle(cx + 6, cy - 2, 3, COLOR_DARK);
    tft.fillCircle(cx - 5, cy - 3, 1, COLOR_WHITE); // Kilau mata
    tft.fillCircle(cx + 7, cy - 3, 1, COLOR_WHITE);
  } else {
    // Mata Senyum ^ ^
    tft.drawLine(cx - 8, cy - 1, cx - 6, cy - 4, COLOR_DARK);
    tft.drawLine(cx - 6, cy - 4, cx - 4, cy - 1, COLOR_DARK);
    tft.drawLine(cx + 4, cy - 1, cx + 6, cy - 4, COLOR_DARK);
    tft.drawLine(cx + 6, cy - 4, cx + 8, cy - 1, COLOR_DARK);
  }

  // Kumis Kucing
  tft.drawLine(cx - 14, cy + 2, cx - 19, cy + 1, COLOR_DARK);
  tft.drawLine(cx - 14, cy + 5, cx - 19, cy + 6, COLOR_DARK);
  tft.drawLine(cx + 14, cy + 2, cx + 19, cy + 1, COLOR_DARK);
  tft.drawLine(cx + 14, cy + 5, cx + 19, cy + 6, COLOR_DARK);
}

// --- Karakter 2: Kelinci Lucu (Bunny Kawaii) di Slot B ---
void drawCartoonBunny(int cx, int cy, bool open) {
  // Telinga Panjang Kelinci
  tft.fillRoundRect(cx - 12, cy - 30, 8, 22, 4, COLOR_CARD_BG);
  tft.drawRoundRect(cx - 12, cy - 30, 8, 22, 4, COLOR_PINK);
  tft.fillRoundRect(cx - 10, cy - 27, 4, 16, 2, COLOR_PINK);

  tft.fillRoundRect(cx + 4, cy - 30, 8, 22, 4, COLOR_CARD_BG);
  tft.drawRoundRect(cx + 4, cy - 30, 8, 22, 4, COLOR_PINK);
  tft.fillRoundRect(cx + 6, cy - 27, 4, 16, 2, COLOR_PINK);

  // Kepala Kelinci
  tft.fillCircle(cx, cy + 2, 17, COLOR_CARD_BG);
  tft.drawCircle(cx, cy + 2, 17, COLOR_PINK);

  // Pipi Merona
  tft.fillCircle(cx - 9, cy + 7, 3, COLOR_PINK);
  tft.fillCircle(cx + 9, cy + 7, 3, COLOR_PINK);

  // Hidung & Mulut Kelinci
  tft.fillCircle(cx, cy + 4, 2, COLOR_PINK_DARK);
  tft.drawLine(cx - 3, cy + 8, cx, cy + 6, COLOR_DARK);
  tft.drawLine(cx + 3, cy + 8, cx, cy + 6, COLOR_DARK);

  // Mata Kelinci
  if (open) {
    tft.fillCircle(cx - 6, cy, 3, COLOR_DARK);
    tft.fillCircle(cx + 6, cy, 3, COLOR_DARK);
    tft.fillCircle(cx - 5, cy - 1, 1, COLOR_WHITE);
    tft.fillCircle(cx + 7, cy - 1, 1, COLOR_WHITE);
  } else {
    tft.drawLine(cx - 8, cy + 1, cx - 4, cy + 1, COLOR_DARK);
    tft.drawLine(cx + 4, cy + 1, cx + 8, cy + 1, COLOR_DARK);
  }
}

// --- Karakter 3: Beruang Lucu (Bear Kawaii) di Slot C ---
void drawCartoonBear(int cx, int cy, bool open) {
  // Telinga Beruang Bundar
  tft.fillCircle(cx - 14, cy - 12, 7, COLOR_BLUE);
  tft.fillCircle(cx + 14, cy - 12, 7, COLOR_BLUE);
  tft.fillCircle(cx - 14, cy - 12, 4, COLOR_CARD_BG);
  tft.fillCircle(cx + 14, cy - 12, 4, COLOR_CARD_BG);

  // Kepala Beruang
  tft.fillCircle(cx, cy, 18, COLOR_CARD_BG);
  tft.drawCircle(cx, cy, 18, COLOR_BLUE);

  // Muzzle Beruang
  tft.fillRoundRect(cx - 8, cy + 2, 16, 11, 4, COLOR_BG);
  tft.fillCircle(cx, cy + 4, 2, COLOR_DARK);
  tft.drawLine(cx - 2, cy + 9, cx + 2, cy + 9, COLOR_DARK);

  // Pipi Merona
  tft.fillCircle(cx - 11, cy + 5, 2, COLOR_PINK);
  tft.fillCircle(cx + 11, cy + 5, 2, COLOR_PINK);

  // Mata Beruang
  if (open) {
    tft.fillCircle(cx - 6, cy - 2, 3, COLOR_DARK);
    tft.fillCircle(cx + 6, cy - 2, 3, COLOR_DARK);
    tft.fillCircle(cx - 5, cy - 3, 1, COLOR_WHITE);
    tft.fillCircle(cx + 7, cy - 3, 1, COLOR_WHITE);
  } else {
    tft.drawLine(cx - 8, cy - 1, cx - 6, cy - 3, COLOR_DARK);
    tft.drawLine(cx - 6, cy - 3, cx - 4, cy - 1, COLOR_DARK);
    tft.drawLine(cx + 4, cy - 1, cx + 6, cy - 3, COLOR_DARK);
    tft.drawLine(cx + 6, cy - 3, cx + 8, cy - 1, COLOR_DARK);
  }
}

// --- Karakter 4: Bintang Mahkota Lucu (Crown Star Rare) di Slot D ---
void drawCartoonStar(int cx, int cy, bool open) {
  // Mahkota Emas Cantik
  tft.fillTriangle(cx - 10, cy - 16, cx - 12, cy - 25, cx - 4, cy - 18, COLOR_GOLD);
  tft.fillTriangle(cx - 4, cy - 18, cx, cy - 28, cx + 4, cy - 18, COLOR_GOLD);
  tft.fillTriangle(cx + 4, cy - 18, cx + 12, cy - 25, cx + 10, cy - 16, COLOR_GOLD);
  tft.fillRect(cx - 10, cy - 17, 20, 4, COLOR_GOLD);

  // Kepala Bintang / Chibi
  tft.fillCircle(cx, cy, 18, COLOR_CARD_BG);
  tft.drawCircle(cx, cy, 18, COLOR_PURPLE);

  // Pipi Merona
  tft.fillCircle(cx - 10, cy + 5, 3, COLOR_PINK);
  tft.fillCircle(cx + 10, cy + 5, 3, COLOR_PINK);

  // Mulut Senyum
  tft.drawLine(cx - 3, cy + 6, cx, cy + 8, COLOR_DARK);
  tft.drawLine(cx, cy + 8, cx + 3, cy + 6, COLOR_DARK);

  // Mata Bintang Sparkling
  if (open) {
    tft.fillCircle(cx - 6, cy - 2, 3, COLOR_PURPLE);
    tft.fillCircle(cx + 6, cy - 2, 3, COLOR_PURPLE);
    tft.fillCircle(cx - 5, cy - 3, 1, COLOR_WHITE);
    tft.fillCircle(cx + 7, cy - 3, 1, COLOR_WHITE);
  } else {
    tft.drawLine(cx - 8, cy - 1, cx - 4, cy - 1, COLOR_DARK);
    tft.drawLine(cx + 4, cy - 1, cx + 8, cy - 1, COLOR_DARK);
  }
}

// ==========================================
// 🎨 5. TAMPILAN UTAMA PRODUK (STATIS & BERSIH)
// ==========================================
void drawProductCatalog() {
  tft.fillScreen(COLOR_BG);

  // Bingkai Luar Tipis Elegan (Tidak Penuh Sesak)
  tft.drawRoundRect(4, 4, 312, 232, 10, COLOR_PRIMARY);

  // 1. Header Bar Bersih
  tft.fillRoundRect(8, 8, 304, 28, 6, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(18, 14);
  tft.print("ANTASARI MART");

  tft.fillRoundRect(210, 12, 96, 20, 4, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(216, 18);
  tft.print("4-SLOT IOT");

  // --- KARTU PRODUK SLOT A (Kucing Cute) ---
  tft.fillRoundRect(10, 42, 146, 82, 8, COLOR_CARD_BG);
  tft.drawRoundRect(10, 42, 146, 82, 8, COLOR_PRIMARY);
  tft.fillRoundRect(10, 42, 146, 18, 6, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(16, 47);
  tft.print("[A] CUTE CAT");

  drawCartoonCat(38, 84, true);

  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(68, 70);
  tft.print("Seri 1 Cute");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(68, 88);
  tft.print("35K");

  // --- KARTU PRODUK SLOT B (Kelinci Pastel) ---
  tft.fillRoundRect(164, 42, 146, 82, 8, COLOR_CARD_BG);
  tft.drawRoundRect(164, 42, 146, 82, 8, COLOR_PINK);
  tft.fillRoundRect(164, 42, 146, 18, 6, COLOR_PINK);
  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(170, 47);
  tft.print("[B] PASTEL BUNNY");

  drawCartoonBunny(192, 84, true);

  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(222, 70);
  tft.print("Dream Pastel");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(222, 88);
  tft.print("45K");

  // --- KARTU PRODUK SLOT C (Beruang Glow) ---
  tft.fillRoundRect(10, 130, 146, 82, 8, COLOR_CARD_BG);
  tft.drawRoundRect(10, 130, 146, 82, 8, COLOR_BLUE);
  tft.fillRoundRect(10, 130, 146, 18, 6, COLOR_BLUE);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(16, 135);
  tft.print("[C] GLOW BEAR");

  drawCartoonBear(38, 172, true);

  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(68, 158);
  tft.print("Dark Edition");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(68, 176);
  tft.print("50K");

  // --- KARTU PRODUK SLOT D (Bintang Mahkota Rare) ---
  tft.fillRoundRect(164, 130, 146, 82, 8, COLOR_CARD_BG);
  tft.drawRoundRect(164, 130, 146, 82, 8, COLOR_PURPLE);
  tft.fillRoundRect(164, 130, 146, 18, 6, COLOR_PURPLE);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(170, 135);
  tft.print("[D] SECRET RARE");

  drawCartoonStar(192, 172, true);

  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(222, 158);
  tft.print("Special Gold");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(222, 176);
  tft.print("60K");

  // Footer Statis Bersih di Bawah (Tidak Bergerak)
  tft.fillRoundRect(8, 216, 304, 18, 4, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(14, 221);
  tft.print("Beli di HP: antasari-mart.web.app");
}

// ==========================================
// 😉 6. ANIMASI KEDIP MATA KARAKTER (HALUS)
// ==========================================
void updateBlinkingCharacters() {
  if (isDispensing) return;

  unsigned long currentMillis = millis();

  // Setiap 2.8 detik, karakter berkedip sebentar lalu membuka mata
  if (currentMillis - lastBlinkTime >= (eyesOpen ? 2800 : 200)) {
    lastBlinkTime = currentMillis;
    eyesOpen = !eyesOpen;

    // Gambar ulang hanya area karakter kartun (Sangat cepat & tanpa flicker pada teks)
    drawCartoonCat(38, 84, eyesOpen);
    drawCartoonBunny(192, 84, eyesOpen);
    drawCartoonBear(38, 172, eyesOpen);
    drawCartoonStar(192, 172, eyesOpen);
  }
}

// ==========================================
// 🎁 7. ANIMASI PENGELUARAN BARANG
// ==========================================
void drawDispensingScreen(const char* productName, int slotNumber, int currentItem, int totalItems) {
  tft.fillScreen(COLOR_BG);

  tft.fillRoundRect(8, 8, 304, 36, 6, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 18);
  tft.print("MENGELUARKAN BARANG 🎁");

  tft.fillRoundRect(12, 50, 296, 158, 10, COLOR_CARD_BG);
  tft.drawRoundRect(12, 50, 296, 158, 10, COLOR_PRIMARY);

  // Gambar Karakter Kartun Sesuai Slot
  if (slotNumber == 1) drawCartoonCat(45, 105, true);
  else if (slotNumber == 2) drawCartoonBunny(45, 105, true);
  else if (slotNumber == 3) drawCartoonBear(45, 105, true);
  else drawCartoonStar(45, 105, true);

  char slotTitle[45];
  snprintf(slotTitle, sizeof(slotTitle), "SLOT #%d: %s", slotNumber, productName);
  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(85, 75);
  tft.print(slotTitle);

  char progressStr[45];
  snprintf(progressStr, sizeof(progressStr), "Item %d dari %d Pcs", currentItem, totalItems);
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(85, 98);
  tft.print(progressStr);

  tft.fillRoundRect(85, 128, 205, 20, 4, COLOR_DARK);
  int fillW = (int)((float)currentItem / (float)totalItems * 201);
  if (fillW < 10) fillW = 20;
  tft.fillRoundRect(87, 130, fillW, 16, 2, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(95, 134);
  tft.print("MOTOR STEPPER 360...");

  tft.setTextColor(COLOR_PINK);
  tft.setTextSize(1);
  tft.setCursor(85, 165);
  tft.print("Harap tunggu barang jatuh... ✨");

  tft.fillRoundRect(8, 214, 304, 18, 4, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(20, 219);
  tft.print("SISTEM VENDING ANTASARI MART ⚙️");
}

void drawSuccessScreen(int totalItems) {
  tft.fillScreen(COLOR_PRIMARY);
  tft.fillRoundRect(16, 20, 288, 200, 16, COLOR_CARD_BG);

  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(45, 45);
  tft.print("SUKSES KELUAR! 🎉");

  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(35, 85);
  char doneMsg[70];
  snprintf(doneMsg, sizeof(doneMsg), "%d Pcs Blind Bag Selesai Dikeluarkan!", totalItems);
  tft.print(doneMsg);

  tft.setCursor(35, 110);
  tft.print("Silakan ambil di boks pengambilan.");

  tft.fillRoundRect(35, 135, 250, 30, 8, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(48, 145);
  tft.print("TERIMA KASIH TELAH BERBELANJA ✨");

  tft.setTextColor(COLOR_DARK);
  tft.setCursor(35, 180);
  tft.print("antasari-mart.web.app");
}

// ==========================================
// ⚙️ 8. PENGGERAK MOTOR STEPPER
// ==========================================
void executeDispense(int slotNumber, int quantity, const char* productName) {
  if (isDispensing) return;
  if (quantity < 1) quantity = 1;
  if (quantity > 10) quantity = 10;

  isDispensing = true;
  Serial.printf("\n🚀 MEMULAI PENGELUARAN: Slot %d | Jumlah: %d Pcs | %s\n", slotNumber, quantity, productName);

  for (int item = 1; item <= quantity; item++) {
    drawDispensingScreen(productName, slotNumber, item, quantity);

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
      delayMicroseconds(2500);
    }

    digitalWrite(STEPPER_IN1, LOW);
    digitalWrite(STEPPER_IN2, LOW);
    digitalWrite(STEPPER_IN3, LOW);
    digitalWrite(STEPPER_IN4, LOW);

    if (item < quantity) {
      delay(800);
    }
  }

  drawSuccessScreen(quantity);
  delay(3500);

  // Kembali ke Menu Bersih
  drawProductCatalog();
  isDispensing = false;
  Serial.println("✅ Selesai & Kembali ke Menu!");
}

// ==========================================
// 🌐 9. WEB SERVER LOKAL
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
  html += "<p style='color:#64748B;font-size:13px;'>Status: <b>Terhubung ke Hokiku_repeat</b> 🟢</p>";
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
// 📡 10. CLOUD POLLING & WIFI STATUS
// ==========================================
void checkDispenseQueue() {
  if (WiFi.status() != WL_CONNECTED || isDispensing) return;

  unsigned long now = millis();
  if (now - lastCloudPollTime < 1500) return; // Cek setiap 1.5 detik
  lastCloudPollTime = now;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.setTimeout(2500);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<768> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      bool shouldDispense = false;
      if (doc["hasPendingDispense"] == true || doc["shouldDispense"] == true) {
        shouldDispense = true;
      }

      if (shouldDispense) {
        const char* productName = doc["productName"] | "Blind Bag Mystery Ganci";
        int slotNumber = doc["slotNumber"] | doc["slot"] | 1;
        int quantity = doc["quantity"] | doc["qty"] | 1;
        Serial.printf("
📥 MENERIMA PESANAN CLOUD: Slot %d | Jumlah: %d Pcs | %s
", slotNumber, quantity, productName);
        executeDispense(slotNumber, quantity, productName);
      }
    }
  }
  http.end();
}

void checkWiFiStatus() {
  if (WiFi.status() == WL_CONNECTED) {
    static bool printed = false;
    if (!printed) {
      printed = true;
      String ipStr = WiFi.localIP().toString();
      
      // Perbarui Footer dengan IP Bersih
      tft.fillRoundRect(8, 216, 304, 18, 4, COLOR_DARK);
      tft.setTextColor(COLOR_GREEN_OK);
      tft.setTextSize(1);
      tft.setCursor(14, 221);
      tft.print("IP: http://" + ipStr + "/ | ONLINE 🟢");
      
      Serial.printf("\n🎉 TERKONEKSI KE HOKIKU_REPEAT! IP: http://%s/\n", ipStr.c_str());
      server.on("/", HTTP_GET, handleRoot);
      server.on("/dispense", HTTP_GET, handleDispenseWeb);
      server.begin();
    }
  } else {
    unsigned long now = millis();
    if (now - lastWifiRetryTime > 12000) {
      lastWifiRetryTime = now;
      WiFi.begin(WIFI_SSID, WIFI_PASS);
    }
  }
}

// ==========================================
// 🚀 11. SETUP UTAMA ESP32-S3
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n🚀 MEMULAI SISTEM ANTASARI MART VENDING...");

  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);

  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  SPI.begin(TFT_SCK, TFT_MISO, TFT_MOSI, TFT_CS);
  tft.begin();
  tft.setRotation(1); // Landscape (320x240)

  // 📺 TAMPILKAN KATALOG PRODUK DENGAN KARAKTER KARTUN STATIS & BERSIH
  drawProductCatalog();

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

// ==========================================
// 🔄 12. LOOP UTAMA
// ==========================================
void loop() {
  // Animasi Halus Kedip Mata Karakter (Hanya berkedip alami tiap 3 detik)
  updateBlinkingCharacters();

  // Status WiFi & Web
  checkWiFiStatus();

  if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
  }

  // Cek Pesanan Cloud
  checkDispenseQueue();

  delay(10);
}
