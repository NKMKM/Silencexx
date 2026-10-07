import SwiftUI
import WidgetKit

struct WishEntry: TimelineEntry {
    let date: Date
    let text: String
    let language: String
}

struct WishProvider: TimelineProvider {
    func placeholder(in context: Context) -> WishEntry {
        WishEntry(date: Date(), text: "Пусть сегодня найдётся время для маленьких радостей и заботы о себе.", language: "ru")
    }
    func getSnapshot(in context: Context, completion: @escaping (WishEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : current())
    }
    private func current() -> WishEntry {
        let d = WishStore.defaults
        let ru = d.string(forKey: "language") != "en"
        let fallback = WishStore.token() == nil
            ? (ru ? "Открой CloudMind и войди в аккаунт" : "Open CloudMind and sign in")
            : (ru ? "Готовим новое пожелание. Открой приложение, если оно не появляется." : "Preparing a new wish. Open the app if it does not appear.")
        let text = d.string(forKey: "day") == WishStore.day() ? d.string(forKey: "wish") ?? fallback : fallback
        return WishEntry(date: Date(), text: text, language: ru ? "ru" : "en")
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WishEntry>) -> Void) {
        let d = WishStore.defaults
        let generation = d.string(forKey: "generation")
        let language = d.string(forKey: "language") ?? "ru"
        func finish(success: Bool) {
            let now = Date()
            let nextDay = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now)!)
            let next = success ? nextDay : now.addingTimeInterval(1800)
            // At midnight hide yesterday's message even if the OS delays the network reload.
            let pending = WishEntry(date: nextDay, text: language == "ru" ? "Готовим пожелание на новый день…" : "Preparing a wish for a new day…", language: language)
            completion(Timeline(entries: [current(), pending], policy: .after(next)))
        }
        guard let token = WishStore.token(), let base = d.string(forKey: "baseUrl") else {
            finish(success: false); return
        }
        if d.string(forKey: "day") == WishStore.day() && d.string(forKey: "wish") != nil {
            finish(success: true); return
        }
        var components = URLComponents(string: base + "/daily-wish")
        components?.queryItems = [URLQueryItem(name: "language", value: language), URLQueryItem(name: "offset", value: String(TimeZone.current.secondsFromGMT() / 60))]
        guard let url = components?.url else { finish(success: false); return }
        var request = URLRequest(url: url, timeoutInterval: 25)
        request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        request.setValue("true", forHTTPHeaderField: "ngrok-skip-browser-warning")
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard d.string(forKey: "generation") == generation else { finish(success: false); return }
            if (response as? HTTPURLResponse)?.statusCode == 401 {
                _ = WishStore.setToken(nil)
                d.removeObject(forKey: "wish")
                d.removeObject(forKey: "day")
            }
            guard (response as? HTTPURLResponse)?.statusCode == 200, let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let wish = json["wish"] as? String, !wish.isEmpty,
                  let day = json["day"] as? String, json["language"] as? String == language else {
                finish(success: false); return
            }
            d.set(wish, forKey: "wish")
            d.set(day, forKey: "day")
            finish(success: day == WishStore.day())
        }.resume()
    }
}

struct WishView: View {
    let entry: WishEntry
    @Environment(\.widgetFamily) var family
    private var content: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(entry.language == "ru" ? "Пожелание на день" : "A wish for today", systemImage: "sun.max")
                .font(.caption.weight(.semibold)).foregroundColor(Color(red: 0.85, green: 0.79, blue: 1))
            Text(entry.text).font(family == .systemSmall ? .footnote : .body)
                .foregroundColor(.white).minimumScaleFactor(0.8).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            Text("CloudMind").font(.system(size: 10)).foregroundColor(.white.opacity(0.6))
        }
        .padding(16)
    }
    var body: some View {
        let background = LinearGradient(colors: [Color(red: 0.18, green: 0.12, blue: 0.28), Color(red: 0.09, green: 0.05, blue: 0.18)], startPoint: .topLeading, endPoint: .bottomTrailing)
        if #available(iOSApplicationExtension 17.0, *) {
            content.containerBackground(for: .widget) { background }
        } else {
            content.background(background)
        }
    }
}

@main
struct DailyWishWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DailyWishWidget", provider: WishProvider()) { WishView(entry: $0) }
            .configurationDisplayName("CloudMind · Пожелание / Daily wish")
            .description("Личное пожелание на языке приложения. / A personal wish in your app language.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
    }
}
