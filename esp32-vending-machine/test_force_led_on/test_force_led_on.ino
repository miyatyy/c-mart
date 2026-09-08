/*
  =============================================================
  🧪 SUPER SCANNER ESP32-S3 - MENYALAKAN SEMUA PIN BERSAMAAN!
  =============================================================
  Program ini memaksa SEMUA pin GPIO ESP32-S3 menjadi HIGH (Nyala)
  dan LOW (Mati) bergantian setiap 1 detik.
  
  Tujuannya:
  Di mana pun kabel IN1-IN4 dicolok, lampu LED di driver ULN2003
  PASTI AKAN BERKEDIP asalkan kabel Listrik (+) dan (-) terhubung!
  =============================================================
*/

// Daftar seluruh pin GPIO yang ada di ESP32-S3
const int allPins[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 35, 36, 37, 38, 39, 40, 41, 42, 45, 46, 47, 48};
const int totalPins = sizeof(allPins) / sizeof(allPins[0]);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("🔥 SUPER SCANNER ESP32-S3 AKTIF!");
  Serial.println("⚡ Menyalakan SEMUA pin GPIO menjadi HIGH...");
  Serial.println("==================================================");

  for (int i = 0; i < totalPins; i++) {
    pinMode(allPins[i], OUTPUT);
  }
}

void loop() {
  Serial.println("🔴 NYALA SEMUA (HIGH) -> Lampu LED Driver Harus Menyala!");
  for (int i = 0; i < totalPins; i++) {
    digitalWrite(allPins[i], HIGH);
  }
  delay(1000);

  Serial.println("⚫ MATI SEMUA (LOW)...");
  for (int i = 0; i < totalPins; i++) {
    digitalWrite(allPins[i], LOW);
  }
  delay(1000);
}
