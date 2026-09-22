import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set Status Bar & Navigation Bar Style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const AntasariMartApp());
}

class AntasariMartApp extends StatelessWidget {
  const AntasariMartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Campus Mart',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5FA874),
          primary: const Color(0xFF5FA874),
          secondary: const Color(0xFFF4AEC2),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const AntasariMartHomeScreen(),
    );
  }
}

class AntasariMartHomeScreen extends StatefulWidget {
  const AntasariMartHomeScreen({super.key});

  @override
  State<AntasariMartHomeScreen> createState() => _AntasariMartHomeScreenState();
}

class _AntasariMartHomeScreenState extends State<AntasariMartHomeScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  int _loadingProgress = 0;

  final String _initialUrl = 'https://antasari-mart.web.app/';

  @override
  void initState() {
    super.initState();
    _initWebView();
    _requestPermissionsNonBlocking();
  }

  void _requestPermissionsNonBlocking() {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await [
          Permission.locationWhenInUse,
          Permission.camera,
          Permission.photos,
        ].request();
      } catch (e) {
        debugPrint('Non-blocking permission request error: $e');
      }
    });
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFAFDFB))
      ..clearCache()
      ..clearLocalStorage()
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (mounted) {
              setState(() {
                _loadingProgress = progress;
              });
            }
          },
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
            }
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = false;
                _hasError = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            if (error.isForMainFrame == true) {
              debugPrint('WebResourceError (MainFrame): code=${error.errorCode}, desc=${error.description}');
              if (error.errorCode == -2 || // ERROR_HOST_LOOKUP
                  error.errorCode == -6 || // ERROR_CONNECT
                  error.errorCode == -8 || // ERROR_TIMEOUT
                  error.errorCode == -14 || // ERROR_FILE_NOT_FOUND
                  error.errorType == WebResourceErrorType.hostLookup ||
                  error.errorType == WebResourceErrorType.connect ||
                  error.errorType == WebResourceErrorType.timeout) {
                if (mounted) {
                  setState(() {
                    _hasError = true;
                    _isLoading = false;
                  });
                }
              }
            }
          },
          onNavigationRequest: (NavigationRequest request) async {
            final uri = Uri.parse(request.url);

            // Buka link WhatsApp, Google Maps, TikTok, Tokopedia, tel, mailto di aplikasi eksternal HP
            if (request.url.startsWith('https://wa.me') ||
                request.url.startsWith('whatsapp://') ||
                request.url.startsWith('https://www.google.com/maps') ||
                request.url.startsWith('https://maps.google.com') ||
                request.url.startsWith('geo:') ||
                request.url.contains('tokopedia.com') ||
                request.url.contains('tiktok.com') ||
                request.url.startsWith('tel:') ||
                request.url.startsWith('mailto:')) {
              try {
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                  return NavigationDecision.prevent;
                }
              } catch (_) {}
            }

            return NavigationDecision.navigate;
          },
        ),
      );

    if (_controller.platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(true);
      final androidController = _controller.platform as AndroidWebViewController;
      androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async {
          return const GeolocationPermissionsResponse(
            allow: true,
            retain: true,
          );
        },
      );
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setOnPlatformPermissionRequest((request) => request.grant());
    }

    _controller.loadRequest(
      Uri.parse(_initialUrl),
    );
  }

  Future<void> _handlePop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    } else {
      SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        await _handlePop();
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        backgroundColor: const Color(0xFFFAFDFB),
        body: SafeArea(
          child: Stack(
            children: [
              // 🌐 Webview Utama Campus Mart dengan EagerGestureRecognizer agar sentuhan & klik 100% responsif
              WebViewWidget(
                controller: _controller,
                gestureRecognizers: const <Factory<OneSequenceGestureRecognizer>>{
                  Factory<EagerGestureRecognizer>(EagerGestureRecognizer.new),
                },
              ),

              // 📊 Progress Bar saat memuat halaman
              if (_isLoading && _loadingProgress < 100)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: _loadingProgress / 100.0,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFFF4AEC2),
                    ),
                    minHeight: 3,
                  ),
                ),

              // ⚠️ Layar Jika Terjadi Kesalahan Koneksi / Offline
              if (_hasError)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('📡', style: TextStyle(fontSize: 50)),
                        const SizedBox(height: 16),
                        const Text(
                          'Gagal Memuat Halaman',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF243329),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Pastikan perangkat Anda terhubung ke internet dan coba kembali.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF687D70),
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: () {
                            if (mounted) {
                              setState(() {
                                _hasError = false;
                                _isLoading = true;
                              });
                            }
                            _controller.loadRequest(Uri.parse(_initialUrl));
                          },
                          icon: const Icon(Icons.refresh, color: Colors.white),
                          label: const Text(
                            'Coba Lagi',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF5FA874),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 12,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
