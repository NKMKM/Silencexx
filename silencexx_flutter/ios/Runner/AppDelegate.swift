import Flutter
import UIKit
import WidgetKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    GeneratedPluginRegistrant.register(with: self)
    if let controller = window?.rootViewController as? FlutterViewController {
      FlutterMethodChannel(name: "com.silencexx/daily_wish", binaryMessenger: controller.binaryMessenger)
        .setMethodCallHandler { call, result in
          guard call.method == "sync", let args = call.arguments as? [String: Any] else {
            result(FlutterMethodNotImplemented); return
          }
          let token = args["token"] as? String
          let language = args["language"] as? String ?? "ru"
          let base = args["baseUrl"] as? String ?? ""
          let d = WishStore.defaults
          if WishStore.token() != token || d.string(forKey: "language") != language || d.string(forKey: "baseUrl") != base {
            let status = WishStore.setToken(token)
            guard status == errSecSuccess else {
              result(FlutterError(code: "keychain", message: "Widget credentials unavailable", details: nil)); return
            }
            d.set(UUID().uuidString, forKey: "generation")
            d.removeObject(forKey: "wish")
            d.removeObject(forKey: "day")
            d.set(language, forKey: "language")
            d.set(base, forKey: "baseUrl")
            WidgetCenter.shared.reloadTimelines(ofKind: "DailyWishWidget")
          } else if token != nil && d.string(forKey: "day") != WishStore.day() {
            WidgetCenter.shared.reloadTimelines(ofKind: "DailyWishWidget")
          }
          result(nil)
        }
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
