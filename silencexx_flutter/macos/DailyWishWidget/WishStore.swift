import Foundation
import Security

enum WishStore {
    private static let service = "CloudMindDailyWish"
    private static var accessGroup: String {
        Bundle.main.object(forInfoDictionaryKey: "WidgetKeychainGroup") as? String ?? ""
    }

    private static func query(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecUseDataProtectionKeychain as String: true,
        ]
    }

    static func read(_ key: String) -> String? {
        var request = query(for: key)
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(request as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func write(_ value: String?, for key: String) -> OSStatus {
        let request = query(for: key)
        let deleted = SecItemDelete(request as CFDictionary)
        guard let value else {
            return deleted == errSecItemNotFound ? errSecSuccess : deleted
        }
        var item = request
        item[kSecValueData as String] = Data(value.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(item as CFDictionary, nil)
    }

    static func sync(token: String?, language: String, baseURL: String) -> (status: OSStatus, changed: Bool) {
        let identityChanged = read("token") != token
        let settingsChanged = read("language") != language || read("baseUrl") != baseURL
        guard identityChanged || settingsChanged else { return (errSecSuccess, false) }

        for (key, value) in [("token", token), ("language", language), ("baseUrl", baseURL)] {
            let status = write(value, for: key)
            guard status == errSecSuccess else { return (status, false) }
        }
        if identityChanged {
            _ = write(nil, for: "wish")
            _ = write(nil, for: "day")
        }
        return (errSecSuccess, true)
    }

    static func day(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
