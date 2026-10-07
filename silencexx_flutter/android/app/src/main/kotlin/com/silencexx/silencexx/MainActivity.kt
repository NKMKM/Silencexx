package com.silencexx.silencexx

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.silencexx/daily_wish")
            .setMethodCallHandler { call, result ->
                if (call.method == "sync") {
                    DailyWishWidget.sync(this, call.argument<String>("token"), call.argument<String>("language") ?: "ru", call.argument<String>("baseUrl") ?: "")
                    result.success(null)
                } else result.notImplemented()
            }
    }
}
