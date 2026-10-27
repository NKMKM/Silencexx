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
        completion(context.isPreview ? placeholder(in: context) : currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WishEntry>) -> Void) {
        guard let token = WishStore.read("token"),
              let baseURL = WishStore.read("baseUrl"),
              let language = WishStore.read("language") else {
            complete(text: "Открой CloudMind и войди в аккаунт", language: "ru", completion: completion, retry: true)
            return
        }

        if WishStore.read("day") == WishStore.day(), let cached = WishStore.read("wish") {
            complete(text: cached, language: language, completion: completion, retry: false)
            return
        }

        var components = URLComponents(string: baseURL + "/daily-wish")
        components?.queryItems = [
            URLQueryItem(name: "language", value: language),
            URLQueryItem(name: "offset", value: String(TimeZone.current.secondsFromGMT() / 60)),
        ]
        guard let url = components?.url else {
            complete(text: fallback(language), language: language, completion: completion, retry: true)
            return
        }

        var request = URLRequest(url: url, timeoutInterval: 25)
        request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        request.setValue("true", forHTTPHeaderField: "ngrok-skip-browser-warning")
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let wish = json["wish"] as? String, !wish.isEmpty,
                  let day = json["day"] as? String,
                  json["language"] as? String == language else {
                complete(text: fallback(language), language: language, completion: completion, retry: true)
                return
            }
            _ = WishStore.write(wish, for: "wish")
            _ = WishStore.write(day, for: "day")
            complete(text: wish, language: language, completion: completion, retry: false)
        }.resume()
    }

    private func currentEntry() -> WishEntry {
        let language = WishStore.read("language") ?? "ru"
        let wish = WishStore.read("day") == WishStore.day() ? WishStore.read("wish") : nil
        return WishEntry(date: Date(), text: wish ?? fallback(language), language: language)
    }

    private func fallback(_ language: String) -> String {
        language == "ru" ? "Открой CloudMind, чтобы получить пожелание на сегодня." : "Open CloudMind to get today's wish."
    }

    private func complete(
        text: String,
        language: String,
        completion: @escaping (Timeline<WishEntry>) -> Void,
        retry: Bool
    ) {
        let now = Date()
        let midnight = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now)!)
        let next = retry ? now.addingTimeInterval(1800) : midnight
        completion(Timeline(entries: [WishEntry(date: now, text: text, language: language)], policy: .after(next)))
    }
}

struct WishView: View {
    let entry: WishEntry
    @Environment(\.widgetFamily) private var family

    private var content: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 7) {
                Image(systemName: "sparkles")
                    .foregroundColor(Color(red: 0.77, green: 0.72, blue: 1))
                Text("CloudMind").font(.system(size: 12, weight: .semibold))
                Spacer(minLength: 4)
                Text(entry.date, style: .date)
                    .font(.system(size: 9)).foregroundColor(.white.opacity(0.55))
                    .lineLimit(1).minimumScaleFactor(0.8)
            }
            .foregroundColor(.white.opacity(0.9))
            Text(entry.text)
                .font(.system(size: family == .systemSmall ? 14 : 17, weight: .medium))
                .foregroundColor(.white).lineSpacing(2)
                .lineLimit(family == .systemSmall ? 5 : 7).minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            HStack(spacing: 6) {
                Capsule().fill(Color(red: 0.65, green: 0.55, blue: 0.95)).frame(width: 16, height: 2)
                Text(entry.language == "ru" ? "ДЛЯ ТЕБЯ СЕГОДНЯ" : "FOR YOU TODAY")
                    .font(.system(size: 9, weight: .medium)).tracking(0.7)
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding(16)
    }

    var body: some View {
        let background = LinearGradient(colors: [Color(red: 0.15, green: 0.13, blue: 0.20), Color(red: 0.067, green: 0.075, blue: 0.082)], startPoint: .topLeading, endPoint: .bottomTrailing)
        content.containerBackground(for: .widget) { background }
    }
}

@main
struct DailyWishWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CloudMindDailyWish", provider: WishProvider()) { entry in
            WishView(entry: entry)
        }
        .configurationDisplayName("CloudMind · Пожелание дня")
        .description("Личное пожелание на языке приложения.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
