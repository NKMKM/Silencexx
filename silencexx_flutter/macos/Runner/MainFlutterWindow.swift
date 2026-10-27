import Cocoa
import FlutterMacOS
import Security
import WidgetKit

class MainFlutterWindow: NSWindow {
  override func awakeFromNib() {
    let flutterViewController = FlutterViewController()
    let windowFrame = self.frame
    self.contentViewController = flutterViewController
    self.setFrame(windowFrame, display: true)

    RegisterGeneratedPlugins(registry: flutterViewController)
    FlutterMethodChannel(
      name: "com.silencexx/daily_wish",
      binaryMessenger: flutterViewController.engine.binaryMessenger
    ).setMethodCallHandler { call, result in
      guard call.method == "sync", let args = call.arguments as? [String: Any] else {
        result(FlutterMethodNotImplemented)
        return
      }
      let sync = WishStore.sync(
        token: args["token"] as? String,
        language: args["language"] as? String ?? "ru",
        baseURL: args["baseUrl"] as? String ?? ""
      )
      guard sync.status == errSecSuccess else {
        result(FlutterError(code: "keychain", message: "Widget credentials unavailable", details: sync.status))
        return
      }
      if sync.changed {
        WidgetCenter.shared.reloadTimelines(ofKind: "CloudMindDailyWish")
      }
      result(nil)
    }

    super.awakeFromNib()
  }
}
