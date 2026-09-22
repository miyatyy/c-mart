/*
  =============================================================
  🧪 PROGRAM TES KHUSUS MOTOR STEPPER 28BYJ-48 (ESP32-S3)
  =============================================================
  📌 WIRING PINOUT ESP32-S3 KE MODUL ULN2003:
  1. IN1 👉 Pin GPIO 4 (IO4)
  2. IN2 👉 Pin GPIO 5 (IO5)
  3. IN3 👉 Pin GPIO 6 (IO6)
  4. IN4 👉 Pin GPIO 7 (IO7)
  5. (+) 👉 Pin 5V / VIN / VBUS pada ESP32-S3
  6. (-) 👉 Pin GND pada ESP32-S3
  7. [JUMPER HITAM] 👉 WAJIB MENUTUP 2 PIN DI SEBELAH TULISAN 5-12V
  =============================================================
*/

#define STEPPER_IN1 4  // GPIO 4
#define STEPPER_IN2 5  // GPIO 5
#define STEPPER_IN3 6  // GPIO 6
#define STEPPER_IN4 7  // GPIO 7

// 8-Step Half-Drive Sequence (Halus & Torsi Tinggi)
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
bool autoRotateMode = true;

// 💡 1. FUNGSI TES LAMPU LED ULN2003
void testLedsOnly() {
  Serial.println("\n💡 [TES LAMPU LED ULN2003]");
  
  Serial.println("🔴 LED A (IN1 - GPIO 4) MENYALA...");
  digitalWrite(STEPPER_IN1, HIGH); delay(1000); digitalWrite(STEPPER_IN1, LOW);

  Serial.println("🟡 LED B (IN2 - GPIO 5) MENYALA...");
  digitalWrite(STEPPER_IN2, HIGH); delay(1000); digitalWrite(STEPPER_IN2, LOW);

  Serial.println("🟢 LED C (IN3 - GPIO 6) MENYALA...");
  digitalWrite(STEPPER_IN3, HIGH); delay(1000); digitalWrite(STEPPER_IN3, LOW);

  Serial.println("🔵 LED D (IN4 - GPIO 7) MENYALA...");
  digitalWrite(STEPPER_IN4, HIGH); delay(1000); digitalWrite(STEPPER_IN4, LOW);

  Serial.println("✨ SEMUA LED A, B, C, D MENYALA BERSAMAAN (3 Detik)...");
  digitalWrite(STEPPER_IN1, HIGH);
  digitalWrite(STEPPER_IN2, HIGH);
  digitalWrite(STEPPER_IN3, HIGH);
  digitalWrite(STEPPER_IN4, HIGH);
  delay(3000);

  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);
  Serial.println("✅ Tes LED Selesai! Jika menyala semua, kabel 5V, GND, dan GPIO 100% OK!\n");
}

// ⚙️ 2. FUNGSI MEMUTAR MOTOR STEPPER
void rotateStepper(bool clockwise, int revolutions = 1) {
  Serial.printf("⚙️ Motor Sedang Berputar %s (%d Putaran 360°)...\n", 
                clockwise ? "SEARAH JARUM JAM ↻" : "BERLAWANAN JARUM JAM ↺", 
                revolutions);

  for (int r = 0; r < revolutions; r++) {
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

      if (clockwise) {
        currentStepIndex = (currentStepIndex + 1) % 8;
      } else {
        currentStepIndex = (currentStepIndex - 1 + 8) % 8;
      }

      // Delay per step (1800-2200 us ideal untuk 28BYJ-48 5V)
      delayMicroseconds(2000);
    }
  }

  // Matikan koil agar motor tidak panas saat diam
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  Serial.println("✅ Putaran Selesai!");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("🚀 PROGRAM STANDALONE TES MOTOR STEPPER 28BYJ-48 (ESP32-S3)");
  Serial.println("=======================================================");
  Serial.println("📌 Pin Sinyal: IN1=IO4, IN2=IO5, IN3=IO6, IN4=IO7");
  Serial.println("📌 Pin Daya: (+) = 5V / VIN, (-) = GND");
  Serial.println("📌 Pastikan Jumper Hitam menancap penuh di modul ULN2003!");
  Serial.println("-------------------------------------------------------");
  Serial.println("💡 PERINTAH SERIAL MONITOR (Ketik & Enter):");
  Serial.println("  [1] -> Putar 1x 360° Maju (Clockwise)");
  Serial.println("  [2] -> Putar 1x 360° Mundur (Counter-Clockwise)");
  Serial.println("  [3] -> Putar 3x Putaran Cepat");
  Serial.println("  [led] -> Tes Lampu LED A, B, C, D satu per satu");
  Serial.println("  [auto] -> Aktifkan/Matikan Mode Putar Otomatis tiap 4 detik");
  Serial.println("=======================================================\n");

  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);

  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);

  // Uji LED di awal booting
  testLedsOnly();

  // Uji 1 putaran awal
  delay(500);
  rotateStepper(true, 1);
}

void loop() {
  // 1. Cek jika ada input dari Serial Monitor
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.length() > 0) {
      Serial.printf("📥 Input Diterima: '%s'\n", cmd.c_str());

      if (cmd == "1") {
        rotateStepper(true, 1);
      } 
      else if (cmd == "2") {
        rotateStepper(false, 1);
      } 
      else if (cmd == "3") {
        rotateStepper(true, 3);
      } 
      else if (cmd.equalsIgnoreCase("led")) {
        testLedsOnly();
      } 
      else if (cmd.equalsIgnoreCase("auto")) {
        autoRotateMode = !autoRotateMode;
        Serial.printf("🔄 Mode Putar Otomatis sekarang: %s\n", autoRotateMode ? "AKTIF" : "NONAKTIF");
      } 
      else {
        Serial.println("❓ Ketik '1', '2', '3', 'led', atau 'auto'");
      }
    }
  }

  // 2. Jika mode auto aktif, putar berkala
  if (autoRotateMode) {
    static unsigned long lastAutoTime = 0;
    if (millis() - lastAutoTime >= 4000) {
      lastAutoTime = millis();
      Serial.println("\n⏰ [Auto-Rotate] Memutar Motor...");
      rotateStepper(true, 1);
      Serial.println("⏳ Menunggu 4 detik untuk putaran berikutnya...");
    }
  }

  delay(20);
}
