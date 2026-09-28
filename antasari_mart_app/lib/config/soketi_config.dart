/// Konfigurasi Endpoint Soketi / WebSocket Real-Time untuk Klien HP Flutter
class SoketiConfig {
  /// IP Laptop Lokal yang aktif di jaringan Wi-Fi
  static const String host = '192.168.18.12';

  /// Port Soketi Bridge / Pusher server
  static const int port = 6001;

  /// App Key Soketi Antasari Mart
  static const String appKey = 'campusmartkey';

  /// Cluster default
  static const String cluster = 'mt1';

  /// TLS / SSL (false untuk local websocket ws://)
  static const bool useTLS = false;

  /// URL WebSocket lengkap
  static String get wsUrl => 'ws://$host:$port/app/$appKey';

  /// URL Endpoint Broadcast HTTP Event
  static String get httpEventsUrl => 'http://$host:$port/apps/campusmart/events';
}
