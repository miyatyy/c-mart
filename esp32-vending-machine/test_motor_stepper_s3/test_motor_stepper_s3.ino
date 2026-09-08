/*
  =============================================================
  🧪 PROGRAM TES PUTAR MOTOR STEPPER 28BYJ-48 (KHUSUS ESP32-S3)
  =============================================================
  📌 PINOUT BERURUTAN (PASTI ADA DI SEMUA ESP32-S3):
  - IN1 👉 Pin 4 (GPIO 4)  -> Baris 10 Breadboard
  - IN2 👉 Pin 5 (GPIO 5)  -> Baris 11 Breadboard
  - IN3 👉 Pin 6 (GPIO 6)  -> Baris 12 Breadboard
  - IN4 👉 Pin 7 (GPIO 7)  -> Baris 13 Breadboard
  - (+) 👉 5V / VIN       -> Baris 1 Breadboard
  - (-) 👉 GND            -> Baris 2 Breadboard
  =============================================================
*/

#define STEPPER_IN1 4  // Pin 4
#define STEPPER_IN2 5  // Pin 5
#define STEPPER_IN3 6  // Pin 6
#define STEPPER_IN4 7  // Pin 7

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

void rotateOneRevolution() {
  Serial.println("⚙️ Motor Sedang Berputar 360 Derajat Penuh...");
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
    delayMicroseconds(2500); // Torsi maksimal & putaran bertenaga // Putaran halus & bertenaga
  }

  // Matikan koil agar motor tidak panas
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);
  Serial.println("✅ Putaran Selesai! Istirahat 3 Detik...");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n🚀 TES MOTOR STEPPER ESP32-S3 (PIN 4, 5, 6, 7) DIMULAI!");

  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);

  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);
}

void loop() {
  rotateOneRevolution();
  delay(3000); // Berputar setiap 3 detik
}
