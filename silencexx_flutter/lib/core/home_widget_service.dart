import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Synchronizes the native widgets without blocking sign-in or sign-out.
class HomeWidgetService {
  static const _channel = MethodChannel('com.silencexx/daily_wish');
  static Future<void> sync({
    required String? token,
    required String language,
    required String baseUrl,
  }) async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.iOS &&
            defaultTargetPlatform != TargetPlatform.android)) {
      return;
    }
    try {
      await _channel.invokeMethod<void>('sync', {
        'token': token,
        'language': language,
        'baseUrl': baseUrl,
      });
    } on PlatformException catch (e) {
      debugPrint('Widget sync failed: ${e.code}');
    } on MissingPluginException {
      debugPrint('Widget bridge requires a full native rebuild.');
    }
  }
}
