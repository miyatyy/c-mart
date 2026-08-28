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
 *    - VCC -> 5V Eksternal (Adaptor 5V 2A/3A)
 *    - GND -> GND Bersama (ESP32 & Adaptor)
 * 
 * 2. LAYAR OLED 0.96" I2C (SSD1306 128x64):
 *    - VCC -> 3.3V / 5V
 *    - GND -> GND
 *    - SCL -> GPIO 22
 *    - SDA -> GPIO 21
 * 
 * 3. SPEAKER / BUZZER / AMPLIFIER (MAX98357A atau Buzzer Pasif):
 *    - Buzzer (+) -> GPIO 25 (PWM Tone Melodi)
 *    - Buzzer (-) -> GND
 * 
 * 4. SENSOR IR OBSTACLE / PROXIMITY (Opsional Pendeteksi Orang Datang):
 *    - OUT -> GPIO 14
 *    - VCC -> 3.3V / 5V
 *    - GND -> GND
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==========================================
// 📶 KONFIGURASI WIFI & SERVER
// ==========================================
const char* WIFI_SSID = "NAMA_WIFI_KAMU";       // Ganti dengan SSID WiFi/Tethering HP
const char* WIFI_PASS = "PASSWORD_WIFI_KAMU";   // Ganti dengan Password WiFi

// URL Server Antasari Mart (Vercel)
const char* SERVER_URL = "https://ma-project-fix.vercel.app/api/vending/dispense-status";

// ==========================================
// 📟 KONFIGURASI LAYAR OLED SSD1306
// ==========================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==========================================
// ⚙️ KONFIGURASI MOTOR STEPPER 28BYJ-48
// ==========================================
#define STEPPER_IN1 19
#define STEPPER_IN2 18
#define STEPPER_IN3 5
#define STEPPER_IN4 17

#define BUZZER_PIN 25
#define IR_SENSOR_PIN 14

// Urutan Step untuk 28BYJ-48 (8-step sequence)
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

// ==========================================
// 🔊 FUNGSI NADA / MELODI PERAYAAN (BUZZER)
// ==========================================
void playWelcomeJingle() {
  tone(BUZZER_PIN, 523, 100); delay(120); // C5
  tone(BUZZER_PIN, 659, 100); delay(120); // E5
  tone(BUZZER_PIN, 784, 150); delay(170); // G5
  tone(BUZZER_PIN, 1046, 300); delay(350); // C6
  noTone(BUZZER_PIN);
}

void playDispenseJingle() {
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 880, 80); delay(100);
    tone(BUZZER_PIN, 1174, 120); delay(140);
  }
  noTone(BUZZER_PIN);
}

// ==========================================
// 🖥️ TAMPILAN OLED STATUS
// ==========================================
void showOLEDMessage(const char* title, const char* subtitle, const char* status) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("MYAMMIY STORE VENDING");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  // Title
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.println(title);
  
  // Subtitle
  display.setTextSize(1);
  display.setCursor(0, 32);
  display.println(subtitle);

  // Status
  display.setTextSize(1);
  display.setCursor(0, 48);
  display.println(status);
  
  display.display();
}

// ==========================================
// ⚙️ PENGGERAK MOTOR STEPPER (360 DERAJAT)
// ==========================================
void rotateDispenser() {
  showOLEDMessage("PENGELUARAN BARANG", "Memutar Spiral...", "Harap Tunggu... ⚙️");
  playDispenseJingle();

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
    delayMicroseconds(1000); // Kecepatan putaran halus
  }

  // Matikan semua koil stepper agar tidak panas
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  showOLEDMessage("SUKSES TERAMBIL! 🎉", "Blind Bag Rp 35.000", "Silakan Ambil di Boks");
  playWelcomeJingle();
  delay(4000);
}

// ==========================================
// 📡 CEK PERINTAH PENGELUARAN DARI WEBSITE
// ==========================================
void checkDispenseQueue() {
  if (WiFi.status() != WL_CONNECTED) {
    showOLEDMessage("WIFI TERPUTUS ❌", "Menyambungkan ulang..", "");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error && doc["hasPendingDispense"] == true) {
      const char* orderId = doc["orderId"] | "ORD-001";
      const char* productName = doc["productName"] | "Blind Bag Keychain";
      
      showOLEDMessage("PESANAN DITERIMA! 🎁", productName, orderId);
      delay(1500);
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

  // Inisialisasi Pin Stepper
  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);

  // Inisialisasi Layar OLED
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.display();
  }

  showOLEDMessage("STARTING MESIN...", "Menghubungkan WiFi...", WIFI_SSID);
  playWelcomeJingle();

  // Koneksi ke WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    showOLEDMessage("MESIN SIAP! 🤖✨", "Kunjungi Web:", "ma-project-fix.vercel.app");
    playWelcomeJingle();
  } else {
    showOLEDMessage("MODE OFFLINE ⚡", "WiFi Gagal Konek", "Siap Demo Standalone");
  }
}

// ==========================================
// 🔄 LOOP UTAMA
// ==========================================
void loop() {
  // 1. Cek jika sensor IR mendeteksi orang di depan mesin
  if (digitalRead(IR_SENSOR_PIN) == LOW) {
    showOLEDMessage("HALO KAKAK! 🎀", "Selamat Datang di", "Myammiy Store!");
    playWelcomeJingle();
    delay(2000);
  }

  // 2. Polling server Antasari Mart setiap 3 detik
  checkDispenseQueue();
  
  // Tampilan Siap Melayani
  showOLEDMessage("MYAMMIY VENDING 🎀", "Blind Bag Rp 35.000", "Buka Web utk Beli 📲");
  delay(3000);
}
