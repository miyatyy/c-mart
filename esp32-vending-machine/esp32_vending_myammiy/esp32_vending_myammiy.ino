/*
  =============================================================================
  🤖 SMART VENDING IOT - ANTASARI MART (TOUCH SCREEN & EDISI KARTUN LUCU)
  =============================================================================
  Fitur Lengkap:
  1. 👆 Layar Sentuh Aktif (XPT2046 Touchscreen): Sentuh Langsung Slot A, B, C, D
  2. 🐱 Karakter Kartun Lucu (Kucing, Kelinci, Beruang, Bintang Mahkota) Berkedip
  3. 🔲 Desain Bingkai Bersih, Rapi & Tulisan Statis Elegan
  4. ⚙️ Motor Stepper 28BYJ-48 Berputar Fisik 360 Derajat per Jumlah Barang
  5. 🌐 Terhubung Otomatis ke WiFi Hokiku_repeat & Website antasari-mart.web.app
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
const char* WIFI_SSID = "huehehe";
const char* WIFI_PASS = "banjarmasinpride2";
const char* SERVER_URL = "https://ma-project-fix.vercel.app/api/vending/dispense-status?claim=true";

WebServer server(80);

// ==========================================
// 📺 2. PINOUT LAYAR TFT SPI & TOUCHSCREEN (ESP32-S3)
// ==========================================
// A. Pin Layar Display (ILI9341)
#define TFT_RST   8   // Reset
#define TFT_DC    9   // Data / Command
#define TFT_CS    10  // Chip Select Display
#define TFT_MOSI  11  // SDI (MOSI Display)
#define TFT_SCK   12  // SCK (Clock Display)

// B. Pin Layar Sentuh Khusus 1-to-1 (XPT2046) - Tanpa Perlu Cabang Pin!
#define TOUCH_CLK  16  // T_CLK (Clock Touch)
#define TOUCH_DIN  17  // T_DIN (Data In Touch / MOSI)
#define TOUCH_DO   14  // T_DO  (Data Out Touch / MISO)
#define TOUCH_CS   21  // T_CS  (Chip Select Touch)

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

// ==========================================
// 👆 2. DRIVER SENTUH NATIVE BIT-BANG XPT2046 (100% AKURAT & ANTI-CONFLICT)
// ==========================================
#define TOUCH_CLK  16  // T_CLK (Clock)
#define TOUCH_DIN  17  // T_DIN (Data In / MOSI)
#define TOUCH_DO   14  // T_DO  (Data Out / MISO)
#define TOUCH_CS   21  // T_CS  (Chip Select)

uint16_t xpt2046_transfer(uint8_t cmd) {
  digitalWrite(TOUCH_CS, LOW);
  delayMicroseconds(2);

  // Kirim 8-bit Command ke XPT2046
  for (int i = 7; i >= 0; i--) {
    digitalWrite(TOUCH_DIN, (cmd >> i) & 1);
    digitalWrite(TOUCH_CLK, HIGH);
    delayMicroseconds(2);
    digitalWrite(TOUCH_CLK, LOW);
    delayMicroseconds(2);
  }

  // Baca 12-bit Response dari XPT2046
  uint16_t result = 0;
  for (int i = 11; i >= 0; i--) {
    digitalWrite(TOUCH_CLK, HIGH);
    delayMicroseconds(2);
    if (digitalRead(TOUCH_DO)) {
      result |= (1 << i);
    }
    digitalWrite(TOUCH_CLK, LOW);
    delayMicroseconds(2);
  }

  digitalWrite(TOUCH_CS, HIGH);
  delayMicroseconds(2);
  return result;
}

bool getTouchCoordinates(int &screenX, int &screenY) {
  // Baca koordinat X dan Y langsung dari XPT2046
  uint16_t rawX = xpt2046_transfer(0xD0);
  uint16_t rawY = xpt2046_transfer(0x90);
  uint16_t z1   = xpt2046_transfer(0xB0);

  // Jika nilai di luar rentang pembacaan fisik
  if (rawX < 120 || rawX > 3980 || rawY < 120 || rawY > 3980) {
    return false;
  }

  // Mapping ke resolusi 320x240 Landscape
  screenX = map(rawX, 3800, 300, 0, 320);
  screenY = map(rawY, 300, 3800, 0, 240);

  if (screenX < 0) screenX = 0;
  if (screenX > 320) screenX = 320;
  if (screenY < 0) screenY = 0;
  if (screenY > 240) screenY = 240;

  Serial.printf("🎯 TOUCH AKTIF TERDETEKSI: RawX=%d, RawY=%d, Z=%d -> Layar (X=%d, Y=%d)\n", rawX, rawY, z1, screenX, screenY);
  return true;
}



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

// ==========================================
// ⚙️ 3. PINOUT MOTOR STEPPER 28BYJ-48 (ULN2003)
// ==========================================
#define STEPPER_IN1 4  // Pin GPIO 4
#define STEPPER_IN2 5  // Pin GPIO 5
#define STEPPER_IN3 6  // Pin GPIO 6
#define STEPPER_IN4 7  // Pin GPIO 7

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

// Variabel Waktu & Animasi Karakter Lucu
unsigned long lastBlinkTime = 0;
unsigned long lastBunnyWalkTime = 0;
unsigned long lastCloudPollTime = 0;
unsigned long lastWifiRetryTime = 0;
unsigned long lastTouchDebounce = 0;
bool eyesOpen = true;

// ==========================================
// ==========================================
// 🐰 3 KELINCI WARNA-WARNI DI PANGGUNG HEADER (0% HALANGI KOTAK PRODUK)
// ==========================================
struct HeaderBunny {
  int x;
  int frame;
  uint16_t bodyCol;
  uint16_t earCol;
  uint16_t blushCol;
  uint16_t feetCol;
};

// Inisialisasi 3 Kelinci Berparade Beriringan: Pink Strawberry, Minty Blue, & Sunny Gold
HeaderBunny bunnies[3] = {
  { 260, 0, COLOR_WHITE, COLOR_PINK, COLOR_PINK_DARK, COLOR_PINK },
  { 220, 2, 0xEFFE, COLOR_BLUE, COLOR_PINK, COLOR_BLUE },
  { 180, 1, 0xFFF5, COLOR_GOLD, COLOR_PINK_DARK, COLOR_GOLD }
};

// Fungsi Gambar Kelinci Mini Warna-Warni dengan Animasi Meloncat (Khusus Header Bar)
void drawColorfulHoppingBunny(int bx, int by, int frame, uint16_t bodyCol, uint16_t earCol, uint16_t blushCol, uint16_t feetCol) {
  // frame 0: stand, frame 1: jump up, frame 2: peak air, frame 3: landing
  int hopY = 0;
  if (frame == 1) hopY = -2;
  else if (frame == 2) hopY = -4;
  else if (frame == 3) hopY = -1;

  int y = by + hopY;

  // 1. Ekor Bulat Fluffy
  tft.fillCircle(bx - 5, y + 2, 2, (bodyCol == COLOR_WHITE) ? 0xDEFB : COLOR_WHITE);

  // 2. Badan Kelinci (Body)
  tft.fillRoundRect(bx - 4, y - 2, 9, 7, 3, bodyCol);

  // 3. Kepala Kelinci (Head)
  tft.fillCircle(bx + 3, y - 3, 4, bodyCol);

  // 4. Telinga Panjang Kelinci (Bergerak lentur dinamis saat meloncat)
  if (frame == 1 || frame == 2) {
    tft.fillRoundRect(bx - 1, y - 10, 2, 6, 1, bodyCol);
    tft.fillRect(bx - 1, y - 8, 1, 3, earCol);
    tft.fillRoundRect(bx + 2, y - 11, 2, 7, 1, bodyCol);
    tft.fillRect(bx + 2, y - 9, 1, 4, earCol);
  } else {
    tft.fillRoundRect(bx + 1, y - 10, 2, 6, 1, bodyCol);
    tft.fillRect(bx + 1, y - 8, 1, 4, earCol);
    tft.fillRoundRect(bx + 3, y - 10, 2, 6, 1, bodyCol);
    tft.fillRect(bx + 3, y - 8, 1, 4, earCol);
  }

  // 5. Mata Hitam Imut Berbinar
  tft.fillCircle(bx + 5, y - 4, 1, COLOR_DARK);

  // 6. Pipi Merona (Blush)
  tft.fillCircle(bx + 3, y - 2, 1, blushCol);

  // 7. Kaki / Telapak Kaki
  if (frame == 1 || frame == 2) {
    tft.fillCircle(bx - 1, y + 5, 2, feetCol);
    tft.fillCircle(bx + 3, y + 5, 2, feetCol);
  } else {
    tft.fillRoundRect(bx - 2, y + 4, 3, 2, 1, feetCol);
    tft.fillRoundRect(bx + 2, y + 4, 3, 2, 1, feetCol);
  }

  // 8. Efek Bintang Kilau ✨ saat di Puncak Lompatan
  if (frame == 2) {
    tft.drawPixel(bx - 7, by + 1, COLOR_YELLOW);
    tft.drawPixel(bx - 8, by - 1, COLOR_GOLD);
  }
}

// ==========================================
// 🎨 4. FUNGSI MENGGAMBAR KARAKTER KARTUN LUCU
// ==========================================

// --- Karakter 1: Kucing Lucu (Cat Kawaii) di Slot A ---
void drawCartoonCat(int cx, int cy, bool open) {
  tft.fillTriangle(cx - 16, cy - 10, cx - 8, cy - 26, cx - 2, cy - 12, COLOR_PRIMARY);
  tft.fillTriangle(cx + 16, cy - 10, cx + 8, cy - 26, cx + 2, cy - 12, COLOR_PRIMARY);
  tft.fillTriangle(cx - 14, cy - 11, cx - 8, cy - 22, cx - 4, cy - 13, COLOR_PINK);
  tft.fillTriangle(cx + 14, cy - 11, cx + 8, cy - 22, cx + 4, cy - 13, COLOR_PINK);

  tft.fillCircle(cx, cy, 18, COLOR_CARD_BG);
  tft.drawCircle(cx, cy, 18, COLOR_PRIMARY);

  tft.fillCircle(cx - 10, cy + 5, 3, COLOR_PINK);
  tft.fillCircle(cx + 10, cy + 5, 3, COLOR_PINK);

  tft.fillTriangle(cx - 2, cy + 2, cx + 2, cy + 2, cx, cy + 4, COLOR_PINK_DARK);
  tft.drawLine(cx - 3, cy + 7, cx, cy + 5, COLOR_DARK);
  tft.drawLine(cx + 3, cy + 7, cx, cy + 5, COLOR_DARK);

  // Area Mata (Blink)
  tft.fillCircle(cx - 6, cy - 2, 4, COLOR_CARD_BG);
  tft.fillCircle(cx + 6, cy - 2, 4, COLOR_CARD_BG);

  if (open) {
    tft.fillCircle(cx - 6, cy - 2, 3, COLOR_DARK);
    tft.fillCircle(cx + 6, cy - 2, 3, COLOR_DARK);
    tft.fillCircle(cx - 5, cy - 3, 1, COLOR_WHITE);
    tft.fillCircle(cx + 7, cy - 3, 1, COLOR_WHITE);
  } else {
    tft.drawLine(cx - 8, cy - 1, cx - 6, cy - 4, COLOR_DARK);
    tft.drawLine(cx - 6, cy - 4, cx - 4, cy - 1, COLOR_DARK);
    tft.drawLine(cx + 4, cy - 1, cx + 6, cy - 4, COLOR_DARK);
    tft.drawLine(cx + 6, cy - 4, cx + 8, cy - 1, COLOR_DARK);
  }

  tft.drawLine(cx - 14, cy + 2, cx - 19, cy + 1, COLOR_DARK);
  tft.drawLine(cx - 14, cy + 5, cx - 19, cy + 6, COLOR_DARK);
  tft.drawLine(cx + 14, cy + 2, cx + 19, cy + 1, COLOR_DARK);
  tft.drawLine(cx + 14, cy + 5, cx + 19, cy + 6, COLOR_DARK);
}

// --- Karakter 2: Kelinci Lucu (Bunny Kawaii) di Slot B ---
void drawCartoonBunny(int cx, int cy, bool open) {
  tft.fillRoundRect(cx - 12, cy - 30, 8, 22, 4, COLOR_CARD_BG);
  tft.drawRoundRect(cx - 12, cy - 30, 8, 22, 4, COLOR_PINK);
  tft.fillRoundRect(cx - 10, cy - 27, 4, 16, 2, COLOR_PINK);

  tft.fillRoundRect(cx + 4, cy - 30, 8, 22, 4, COLOR_CARD_BG);
  tft.drawRoundRect(cx + 4, cy - 30, 8, 22, 4, COLOR_PINK);
  tft.fillRoundRect(cx + 6, cy - 27, 4, 16, 2, COLOR_PINK);

  tft.fillCircle(cx, cy + 2, 17, COLOR_CARD_BG);
  tft.drawCircle(cx, cy + 2, 17, COLOR_PINK);

  tft.fillCircle(cx - 9, cy + 7, 3, COLOR_PINK);
  tft.fillCircle(cx + 9, cy + 7, 3, COLOR_PINK);

  tft.fillCircle(cx, cy + 4, 2, COLOR_PINK_DARK);
  tft.drawLine(cx - 3, cy + 8, cx, cy + 6, COLOR_DARK);
  tft.drawLine(cx + 3, cy + 8, cx, cy + 6, COLOR_DARK);

  // Area Mata (Blink)
  tft.fillCircle(cx - 6, cy, 4, COLOR_CARD_BG);
  tft.fillCircle(cx + 6, cy, 4, COLOR_CARD_BG);

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
  tft.fillCircle(cx - 14, cy - 12, 7, COLOR_BLUE);
  tft.fillCircle(cx + 14, cy - 12, 7, COLOR_BLUE);
  tft.fillCircle(cx - 14, cy - 12, 4, COLOR_CARD_BG);
  tft.fillCircle(cx + 14, cy - 12, 4, COLOR_CARD_BG);

  tft.fillCircle(cx, cy, 18, COLOR_CARD_BG);
  tft.drawCircle(cx, cy, 18, COLOR_BLUE);

  tft.fillRoundRect(cx - 8, cy + 2, 16, 11, 4, COLOR_BG);
  tft.fillCircle(cx, cy + 4, 2, COLOR_DARK);
  tft.drawLine(cx - 2, cy + 9, cx + 2, cy + 9, COLOR_DARK);

  tft.fillCircle(cx - 11, cy + 5, 2, COLOR_PINK);
  tft.fillCircle(cx + 11, cy + 5, 2, COLOR_PINK);

  // Area Mata (Blink)
  tft.fillCircle(cx - 6, cy - 2, 4, COLOR_CARD_BG);
  tft.fillCircle(cx + 6, cy - 2, 4, COLOR_CARD_BG);

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
  tft.fillTriangle(cx - 10, cy - 16, cx - 12, cy - 25, cx - 4, cy - 18, COLOR_GOLD);
  tft.fillTriangle(cx - 4, cy - 18, cx, cy - 28, cx + 4, cy - 18, COLOR_GOLD);
  tft.fillTriangle(cx + 4, cy - 18, cx + 12, cy - 25, cx + 10, cy - 16, COLOR_GOLD);
  tft.fillRect(cx - 10, cy - 17, 20, 4, COLOR_GOLD);

  tft.fillCircle(cx, cy, 18, COLOR_CARD_BG);
  tft.drawCircle(cx, cy, 18, COLOR_PURPLE);

  tft.fillCircle(cx - 10, cy + 5, 3, COLOR_PINK);
  tft.fillCircle(cx + 10, cy + 5, 3, COLOR_PINK);

  tft.drawLine(cx - 3, cy + 6, cx, cy + 8, COLOR_DARK);
  tft.drawLine(cx, cy + 8, cx + 3, cy + 6, COLOR_DARK);

  // Area Mata (Blink)
  tft.fillCircle(cx - 6, cy - 2, 4, COLOR_CARD_BG);
  tft.fillCircle(cx + 6, cy - 2, 4, COLOR_CARD_BG);

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
// 🎨 5. TAMPILAN UTAMA PRODUK & TOUCH SCREEN
// ==========================================
void drawProductCatalog() {
  tft.fillScreen(COLOR_BG);

  // Bingkai Luar Tipis Elegan
  tft.drawRoundRect(4, 4, 312, 232, 10, COLOR_PRIMARY);

  // Header Bar Bersih
  tft.fillRoundRect(8, 8, 304, 28, 6, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(14, 14);
  tft.print("MYammiy craft");

  // Inisialisasi 3 Kelinci Lucu Warna-Warni Berjalan & Loncat di Panggung Header (0% Menghalangi Produk)
  for (int i = 0; i < 3; i++) {
    drawColorfulHoppingBunny(bunnies[i].x, 25, bunnies[i].frame, bunnies[i].bodyCol, bunnies[i].earCol, bunnies[i].blushCol, bunnies[i].feetCol);
  }

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

  // Footer Statis Bersih di Bawah
  tft.fillRoundRect(8, 216, 304, 18, 4, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(14, 221);
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(COLOR_GREEN_OK);
    tft.printf("IP: http://%s/ | MYammiy craft 🟢", WiFi.localIP().toString().c_str());
  } else {
    tft.print("🐰 MYammiy Craft ✨ Sentuh Layar / Web IoT");
  }
}

// ==========================================
// 🐰 6. ANIMASI KELINCI BERJALAN/LONCAT & KEDIP
// ==========================================
void updateCuteAnimations() {
  if (isDispensing) return;

  unsigned long currentMillis = millis();

  // 1. Animasi 3 Kelinci Warna-Warni Berjalan & Melompat di Panggung Header (Setiap 80ms)
  // 100% AMAN & BERSIH: Menghapus HANYA area panggung Header (Y: 9..35), TIDAK PERNAH menutupi teks produk!
  if (currentMillis - lastBunnyWalkTime >= 80) {
    lastBunnyWalkTime = currentMillis;

    // Bersihkan HANYA area panggung Header (kanan tulisan "MYammiy craft") dengan warna hijau
    tft.fillRect(174, 9, 132, 26, COLOR_PRIMARY);

    for (int i = 0; i < 3; i++) {
      bunnies[i].x += 3;
      bunnies[i].frame = (bunnies[i].frame + 1) % 4;
      if (bunnies[i].x > 298) {
        bunnies[i].x = 175;
      }
      drawColorfulHoppingBunny(bunnies[i].x, 25, bunnies[i].frame, bunnies[i].bodyCol, bunnies[i].earCol, bunnies[i].blushCol, bunnies[i].feetCol);
    }
  }

  // 2. Animasi Kedip Karakter Kartun di Kotak Produk (Setiap 2.6 Detik)
  if (currentMillis - lastBlinkTime >= (eyesOpen ? 2600 : 250)) {
    lastBlinkTime = currentMillis;
    eyesOpen = !eyesOpen;

    drawCartoonCat(38, 84, eyesOpen);
    drawCartoonBunny(192, 84, eyesOpen);
    drawCartoonBear(38, 172, eyesOpen);
    drawCartoonStar(192, 172, eyesOpen);
  }
}

// ==========================================
// 🎁 7. ANIMASI PENGELUARAN BARANG & MOTOR
// ==========================================
void drawDispensingScreen(const char* productName, int slotNumber, int currentItem, int totalItems) {
  tft.fillScreen(COLOR_BG);

  tft.fillRoundRect(8, 8, 304, 36, 6, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 18);
  tft.print("MYAMMIY CRAFT 🎁");

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
  tft.print("SISTEM VENDING MYAMMIY CRAFT 🐰✨");
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
  snprintf(doneMsg, sizeof(doneMsg), "%d Pcs Blind Bag Berhasil Dikeluarkan!", totalItems);
  tft.print(doneMsg);

  tft.setCursor(35, 110);
  tft.print("Silakan ambil di boks pengambilan.");

  tft.fillRoundRect(35, 135, 250, 30, 8, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(40, 145);
  tft.print("TERIMA KASIH DARI MYAMMIY CRAFT 🐰✨");

  tft.setTextColor(COLOR_DARK);
  tft.setCursor(35, 180);
  tft.print("myammiy-craft.web.app");
}

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

  drawProductCatalog();
  isDispensing = false;
  Serial.println("✅ Selesai & Kembali ke Menu!");
}

// ==========================================
// 👆 8. LOGIKA DETEKSI SENTUHAN LAYAR (TOUCH)
// ==========================================
void handleTouchScreen() {
  if (isDispensing) return;

  int screenX = 0, screenY = 0;
  if (!getTouchCoordinates(screenX, screenY)) return;

  unsigned long now = millis();
  if (now - lastTouchDebounce < 700) return; // Debounce 700ms
  lastTouchDebounce = now;

  Serial.print("👆 SENTUHAN ASLI DITERIMA! Layar X=");
  Serial.print(screenX);
  Serial.print(", Y=");
  Serial.println(screenY);

  // --- KOTAK SLOT A (Kiri Atas - Kucing Cute) ---
  if (screenX >= 5 && screenX <= 158 && screenY >= 38 && screenY <= 126) {
    Serial.println("🎯 Sentuhan Sukses: SLOT A - Seri 1 Cute!");
    tft.drawRoundRect(10, 42, 146, 82, 8, COLOR_YELLOW);
    executeDispense(1, 1, "Blind Bag Seri 1 Cute");
  }
  // --- KOTAK SLOT B (Kanan Atas - Kelinci Pastel) ---
  else if (screenX >= 160 && screenX <= 315 && screenY >= 38 && screenY <= 126) {
    Serial.println("🎯 Sentuhan Sukses: SLOT B - Seri 2 Pastel!");
    tft.drawRoundRect(164, 42, 146, 82, 8, COLOR_YELLOW);
    executeDispense(2, 1, "Blind Bag Seri 2 Pastel");
  }
  // --- KOTAK SLOT C (Kiri Bawah - Beruang Glow) ---
  else if (screenX >= 5 && screenX <= 158 && screenY >= 128 && screenY <= 216) {
    Serial.println("🎯 Sentuhan Sukses: SLOT C - Seri 3 Glow!");
    tft.drawRoundRect(10, 130, 146, 82, 8, COLOR_YELLOW);
    executeDispense(3, 1, "Blind Bag Seri 3 Glow");
  }
  // --- KOTAK SLOT D (Kanan Bawah - Bintang Mahkota Rare) ---
  else if (screenX >= 160 && screenX <= 315 && screenY >= 128 && screenY <= 216) {
    Serial.println("🎯 Sentuhan Sukses: SLOT D - Secret Rare!");
    tft.drawRoundRect(164, 130, 146, 82, 8, COLOR_YELLOW);
    executeDispense(4, 1, "Blind Bag Secret Rare");
  }
}

// ==========================================
// 🌐 9. WEB SERVER LOKAL
// ==========================================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>MYammiy Craft Vending Controller</title>";
  html += "<style>body{font-family:sans-serif;background:#FAFDFB;color:#243329;text-align:center;padding:25px 15px;}";
  html += ".card{background:white;padding:25px;border-radius:20px;box-shadow:0 8px 25px rgba(0,0,0,0.08);max-width:400px;margin:0 auto;}";
  html += ".btn{background:linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%);color:white;border:none;padding:14px;font-size:15px;font-weight:bold;border-radius:12px;cursor:pointer;width:100%;margin:6px 0;box-shadow:0 4px 15px rgba(95,168,116,0.3);}";
  html += ".qty-box{display:flex;align-items:center;justify-content:center;gap:10px;margin:15px 0;}";
  html += ".qty-input{width:60px;height:38px;text-align:center;font-size:18px;font-weight:bold;border-radius:8px;border:1.5px solid #5FA874;}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<h2>🐰 MYammiy Craft Vending</h2>";
  html += "<p style='color:#64748B;font-size:13px;'>Status: <b>Terhubung ke WiFi</b> 🟢</p>";
  html += "<form action='/dispense' method='GET'>";
  html += "<label style='font-size:13px;font-weight:bold;'>Pilih Jumlah (Putaran):</label>";
  html += "<div class='qty-box'><input type='number' name='qty' class='qty-input' value='1' min='1' max='10'></div>";
  html += "<button type='submit' name='slot' value='1' class='btn'>🅰️ Beli Slot A: Seri 1 Cute (Rp 35K)</button>";
  html += "<button type='submit' name='slot' value='2' class='btn'>🅱️ Beli Slot B: Seri 2 Pastel (Rp 45K)</button>";
  html += "<button type='submit' name='slot' value='3' class='btn'>🅲 Beli Slot C: Seri 3 Glow (Rp 50K)</button>";
  html += "<button type='submit' name='slot' value='4' class='btn'>🅳 Beli Slot D: Secret Rare (Rp 60K)</button>";
  html += "</form>";
  html += "<p style='font-size:11px;color:#94A3B8;margin-top:15px;'>Sistem IoT Vending MYammiy Craft</p>";
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
// 📡 10. CLOUD POLLING & SINKRONISASI 1.5 DETIK
// ==========================================
void checkDispenseQueue() {
  if (WiFi.status() != WL_CONNECTED || isDispensing) return;

  unsigned long now = millis();
  if (now - lastCloudPollTime < 1500) return;
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
        Serial.printf("\n📥 MENERIMA PESANAN DARI WEBSITE: Slot %d | Jumlah: %d Pcs | %s\n", slotNumber, quantity, productName);
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
      
      tft.fillRoundRect(8, 216, 304, 18, 4, COLOR_DARK);
      tft.setTextColor(COLOR_GREEN_OK);
      tft.setTextSize(1);
      tft.setCursor(14, 221);
      tft.printf("IP: http://%s/ | Sentuh / Web 🟢", ipStr.c_str());
      
      Serial.printf("\n🎉 TERKONEKSI KE %s! IP: http://%s/\n", WIFI_SSID, ipStr.c_str());
      server.on("/", HTTP_GET, handleRoot);
      server.on("/dispense", HTTP_GET, handleDispenseWeb);
      server.begin();
    }
  } else {
    unsigned long now = millis();
    if (now - lastWifiRetryTime > 15000) {
      lastWifiRetryTime = now;
      Serial.println("🔄 Memeriksa status WiFi / Menghubungkan ulang...");
      WiFi.disconnect();
      delay(100);
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
  Serial.println("\n🚀 MEMULAI SISTEM TOUCHSCREEN MYAMMIY CRAFT VENDING...");

  // Inisialisasi Pin Stepper ULN2003
  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);

  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  // 1. Inisialisasi SPI Display pada Pin ESP32-S3
  SPI.begin(TFT_SCK, -1, TFT_MOSI, TFT_CS);
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(COLOR_PRIMARY); // Uji layar warna hijau
  delay(100);

  // Inisialisasi Pin Layar Sentuh Bit-Bang Native
  pinMode(TOUCH_CS, OUTPUT);
  pinMode(TOUCH_CLK, OUTPUT);
  pinMode(TOUCH_DIN, OUTPUT);
  pinMode(TOUCH_DO, INPUT);

  digitalWrite(TOUCH_CS, HIGH);
  digitalWrite(TOUCH_CLK, LOW);
  digitalWrite(TOUCH_DIN, LOW);
  Serial.println("👆 Native Bit-Bang Touch Aktif di Pin CLK:16, DIN:17, DO:14, CS:21!");
  Serial.println("👆 Touchscreen XPT2046 Aktif!");

  // Tampilkan Katalog Produk Karakter Kartun
  drawProductCatalog();

  // Mulai WiFi di Latar Belakang
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

// ==========================================
// 🔄 12. LOOP UTAMA
// ==========================================
void loop() {
  // 1. Deteksi Sentuhan Layar Langsung (Touchscreen)
  handleTouchScreen();

  // 2. Animasi Kelinci Berjalan/Loncat & Karakter Lucu
  updateCuteAnimations();

  // 3. Status WiFi & Server Lokal
  checkWiFiStatus();

  if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
  }

  // 4. Cek Antrean Pembelian Cloud Website
  checkDispenseQueue();

  delay(10);
}
