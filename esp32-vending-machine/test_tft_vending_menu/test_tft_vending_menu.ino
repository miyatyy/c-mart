/*
  =============================================================
  🧪 PROGRAM TES LAYAR TFT SPI 240x320 - KHUSUS ESP32-S3
  =============================================================
  Modul: 2.4" / 2.8" TFT SPI 240x320 (ILI9341 / ST7789)
  Microcontroller: ESP32-S3 (DevKitC-1 / NodeMCU S3)
  
  📌 SKEMA KABEL JUMPER BERURUTAN (SANGAT MUDAH DIINGAT):
  - VCC        👉 5V (VIN) / 3V3
  - GND        👉 GND
  - RESET/RST  👉 Pin 8
  - DC / RS    👉 Pin 9
  - CS         👉 Pin 10
  - SDI / MOSI 👉 Pin 11 (Hardware SPI MOSI)
  - SCK / CLK  👉 Pin 12 (Hardware SPI SCLK)
  - LED / BLK  👉 3V3 (Lampu Backlight Layar)
  - SDO / MISO 👉 (Biarkan Kosong)
  =============================================================
*/

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

// 📌 Definisi Pin ESP32-S3
#define TFT_RST   8   // Reset
#define TFT_DC    9   // Data / Command
#define TFT_CS    10  // Chip Select
#define TFT_MOSI  11  // Data In (SDI / MOSI)
#define TFT_SCK   12  // Clock (SCK / SCL)
#define TFT_MISO  -1  // Tidak Digunakan

// Inisialisasi Objek Hardware SPI untuk ESP32-S3
Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

// Palet Warna 16-Bit RGB565 Estetik Antasari Mart
#define COLOR_BG        0xF7BE // Soft Beige Ivory
#define COLOR_DARK      0x2185 // Deep Forest Green (#243329)
#define COLOR_PRIMARY   0x5D4E // Soft Olive Green (#5FA874)
#define COLOR_PINK      0xF578 // Soft Pastel Pink (#F4AEC2)
#define COLOR_BLUE      0x7E3F // Sky Blue
#define COLOR_PURPLE    0xA31E // Violet Purple
#define COLOR_CARD_BG   0xFFFF // Putih
#define COLOR_WHITE     0xFFFF
#define COLOR_YELLOW    0xFEC0

void drawVendingMenu() {
  // 1. Background Layar
  tft.fillScreen(COLOR_BG);

  // 2. Header Bar
  tft.fillRect(0, 0, 320, 38, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(16, 11);
  tft.print("ANTASARI MART VENDING");

  // 3. Subheader
  tft.fillRect(0, 38, 320, 20, COLOR_DARK);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 44);
  tft.print("PILIH PRODUK BLIND BAG MYAMMIY:");

  // ==========================================
  // 🔲 KOTAK PRODUK 4 SLOT
  // ==========================================

  // --- KOTAK SLOT A ---
  tft.fillRoundRect(8, 66, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(8, 66, 148, 70, 8, COLOR_PRIMARY);
  tft.fillRect(8, 66, 148, 20, COLOR_PRIMARY);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 72);
  tft.print("[A] SERI 1 CUTE");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(14, 92);
  tft.print("Animal Mystery");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(14, 110);
  tft.print("35.000");

  // --- KOTAK SLOT B ---
  tft.fillRoundRect(164, 66, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(164, 66, 148, 70, 8, COLOR_PINK);
  tft.fillRect(164, 66, 148, 20, COLOR_PINK);
  tft.setTextColor(COLOR_DARK);
  tft.setTextSize(1);
  tft.setCursor(170, 72);
  tft.print("[B] SERI 2 PASTEL");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(170, 92);
  tft.print("Dream Series");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(170, 110);
  tft.print("45.000");

  // --- KOTAK SLOT C ---
  tft.fillRoundRect(8, 144, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(8, 144, 148, 70, 8, COLOR_BLUE);
  tft.fillRect(8, 144, 148, 20, COLOR_BLUE);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 150);
  tft.print("[C] SERI 3 GLOW");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(14, 170);
  tft.print("Dark Edition");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(14, 188);
  tft.print("50.000");

  // --- KOTAK SLOT D ---
  tft.fillRoundRect(164, 144, 148, 70, 8, COLOR_CARD_BG);
  tft.drawRoundRect(164, 144, 148, 70, 8, COLOR_PURPLE);
  tft.fillRect(164, 144, 148, 20, COLOR_PURPLE);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(170, 150);
  tft.print("[D] SECRET RARE");
  tft.setTextColor(COLOR_DARK);
  tft.setCursor(170, 170);
  tft.print("Special Edition");
  tft.setTextColor(COLOR_PRIMARY);
  tft.setTextSize(2);
  tft.setCursor(170, 188);
  tft.print("60.000");

  // ==========================================
  // 底部 FOOTER STATUS
  // ==========================================
  tft.fillRect(0, 222, 320, 18, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(14, 226);
  tft.print("STATUS: SIAP DIPILIH (PILIH SLOT A / B / C / D)");
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n==================================================");
  Serial.println("📺 MEMULAI TES LAYAR TFT SPI 240x320 (ESP32-S3)...");
  Serial.println("==================================================");

  // Inisialisasi SPI Hardware Khusus ESP32-S3
  SPI.begin(TFT_SCK, TFT_MISO, TFT_MOSI, TFT_CS); // SCK=12, MISO=-1, MOSI=11, CS=10

  tft.begin();
  tft.setRotation(1); // Mode Landscape (320x240)
  
  drawVendingMenu();
  Serial.println("✅ Menu Layar TFT Berhasil Ditampilkan di Layar ESP32-S3!");
}

void loop() {
  // Demo animasi kedip status pada footer
  delay(1000);
  tft.fillRect(0, 222, 320, 18, COLOR_DARK);
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(14, 226);
  tft.print("STATUS: MESIN VENDING AKTIF & TERHUBUNG 🟢");

  delay(1000);
  tft.fillRect(0, 222, 320, 18, COLOR_DARK);
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 226);
  tft.print("STATUS: SILAKAN PILIH SLOT A / B / C / D ✨");
}
