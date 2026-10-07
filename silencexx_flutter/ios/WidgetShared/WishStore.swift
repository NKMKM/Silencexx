import Foundation
import Security

// Shared credentials live in Keychain; the App Group stores only display data.
enum WishStore {
    static let group = "group.com.silencexx.silencexx"
    static let defaults = UserDefaults(suiteName: group)!
    static var keyQuery: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "CloudMindDailyWish",
         kSecAttrAccount as String: "session",
         kSecAttrAccessGroup as String: Bundle.main.object(forInfoDictionaryKey: "WidgetKeychainGroup") as! String]
    }
    static func token() -> String? {
        var query = keyQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var value: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess,
              let data = value as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func setToken(_ token: String?) -> OSStatus {
        SecItemDelete(keyQuery as CFDictionary)
        guard let token = token else { return errSecSuccess }
        var query = keyQuery
        query[kSecValueData as String] = Data(token.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(query as CFDictionary, nil)
    }
    static func day(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
