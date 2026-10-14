import Foundation

// What every Purify widget reads (docs/WIDGETS.md is the contract): the day
// table the build bakes, and the six values the app hands over through the
// App Group. Nothing here works out anything about the Church's calendar. The
// build did that for every civil day, in both reckonings, with the app's own
// code; a widget looks up today's key and picks a side.

/// The App Group the app's WidgetBridge plugin writes and these widgets read.
let purifyAppGroup = "group.net.purifyapp.purify"

// MARK: - The day table, version 3 (docs/WIDGETS.md, section 1)

// Every field is optional on purpose. One field the Swift side does not
// expect must cost that one line on a widget, not the whole table: a table
// that fails to decode would turn every widget into its "open Purify" line.

struct DayTable: Decodable {
    let version: Int?
    let from: String?
    let days: [String: DayTableEntry]
}

struct DayTableEntry: Decodable {
    let newCalendar: ChurchDay?
    let oldCalendar: ChurchDay?
    let verse: DayVerse?

    enum CodingKeys: String, CodingKey {
        case newCalendar = "new"
        case oldCalendar = "old"
        case verse
    }
}

struct ChurchDay: Decodable {
    let saint: String?
    let note: String?
    let fastLabel: String?
    let fastKind: String?
    let fastRule: String?
    let season: DaySeason?
    let nextFast: DayCountdown?
    let nextFeast: DayCountdown?

    /// A fast day at all, for the week's dots and the chip that stands out.
    /// The same test Android makes (WidgetData.isFast).
    var isFast: Bool {
        guard let kind = fastKind, !kind.isEmpty else { return false }
        return kind != "normal" && kind != "fast-free"
    }
}

struct DaySeason: Decodable {
    let theme: String?
    let title: String?
    let line: String?
}

struct DayCountdown: Decodable {
    let name: String?
    let date: String?
    /// Counted by the build from that civil day; a widget never subtracts.
    let days: Int?
}

struct DayVerse: Decodable {
    let text: String?
    let ref: String?
    let href: String?
}

/// The table, read once per process.
///
/// The extension carries its own copy: the "Copy the day table" build phase
/// puts the file the app bundles (App/public, from `npx cap sync ios`) into
/// the extension (docs/IOS_BUILD_SETUP.md, "Home screen widgets"). If that
/// copy is missing, the one inside the app is tried, since an extension's
/// executable already loads code from its app's bundle and may read it.
enum DayTableFile {
    static let lock = NSLock()
    static var loaded = false
    static var table: DayTable?

    static func read() -> DayTable? {
        lock.lock()
        defer { lock.unlock() }
        if !loaded {
            loaded = true
            table = decode(ownCopy()) ?? decode(appCopy())
        }
        return table
    }

    static func ownCopy() -> URL? {
        Bundle.main.url(forResource: "widget-day-table", withExtension: "json")
    }

    static func appCopy() -> URL {
        // PurifyWidgets.appex sits in App.app/PlugIns.
        let app = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent()
        return app.appendingPathComponent("public/widget-day-table.json")
    }

    static func decode(_ url: URL?) -> DayTable? {
        guard let url = url, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(DayTable.self, from: data)
    }
}

// MARK: - What the app hands over (docs/WIDGETS.md, section 2)

struct HandedStreak: Decodable {
    let count: Int?
    let keptToday: Bool?
    let week: [Bool]?
    /// The civil day the app wrote this, YYYY-MM-DD.
    let on: String?
}

struct HandedPrayed: Decodable {
    let morning: String?
    let evening: String?
}

struct HandedPatron: Decodable {
    let slug: String?
    let name: String?
    let nameDay: String?
    let icon: String?
}

struct HandedUpdate: Decodable {
    let name: String?
    let version: String?
    let date: String?
}

/// The six keys, as the WidgetBridge plugin stored them. A value that cannot
/// be read is treated as absent, and every widget has a plain line for that.
struct Handed {
    let calendarStyle: String
    let words: Words
    let streak: HandedStreak?
    let prayed: HandedPrayed?
    let patron: HandedPatron?
    let update: HandedUpdate?

    static func read() -> Handed {
        let shared = UserDefaults(suiteName: purifyAppGroup)
        // The app's own default is the New Calendar until it says otherwise.
        let style = shared?.string(forKey: "calendarStyle") == "old" ? "old" : "new"
        return Handed(
            calendarStyle: style,
            words: Words(json: shared?.string(forKey: "labels")),
            streak: decode(HandedStreak.self, shared?.string(forKey: "streak")),
            prayed: decode(HandedPrayed.self, shared?.string(forKey: "prayed")),
            patron: decode(HandedPatron.self, shared?.string(forKey: "patron")),
            update: decode(HandedUpdate.self, shared?.string(forKey: "update"))
        )
    }

    static func decode<T: Decodable>(_ type: T.Type, _ raw: String?) -> T? {
        guard let raw = raw, let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}

/// The app's words, in the reader's language. Every value arrives finished;
/// a widget never builds a sentence, and fills only nameDayIn's one {n}.
struct Words {
    let table: [String: String]

    init(json: String?) {
        var found: [String: String] = [:]
        if let json = json,
           let data = json.data(using: .utf8),
           let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            for (key, value) in object {
                if let text = value as? String, !text.isEmpty {
                    found[key] = text
                }
            }
        }
        table = found
    }

    /// The app's word for `key`, or the English given.
    func text(_ key: String, _ english: String) -> String {
        table[key] ?? english
    }

    /// One name from a "|"-joined list (weekdaysShort, monthsShort,
    /// monthsLong: Sunday and January first), or the phone's own name.
    func listItem(_ key: String, _ index: Int, _ fallback: [String]) -> String {
        let names = (table[key] ?? "").components(separatedBy: "|")
        if index >= 0, index < names.count, !names[index].isEmpty {
            return names[index]
        }
        return index >= 0 && index < fallback.count ? fallback[index] : ""
    }
}

// MARK: - Civil days on the phone

/// Today as the phone sees it. The table's keys are Gregorian dates, so this
/// is always the Gregorian calendar in the phone's own time zone, whatever
/// calendar the phone displays. Stepping a civil date forward (the week's
/// seven days) and counting the days to a date the app handed over are plain
/// calendar counting, not the Church's reckoning, which the table holds.
enum CivilDay {
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone.current
        calendar.locale = Locale.current
        return calendar
    }

    /// YYYY-MM-DD for the day `date` falls on, here.
    static func key(_ date: Date) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        let year = pad(parts.year ?? 0, 4)
        let month = pad(parts.month ?? 0, 2)
        let day = pad(parts.day ?? 0, 2)
        return "\(year)-\(month)-\(day)"
    }

    static func pad(_ value: Int, _ width: Int) -> String {
        let digits = String(value)
        if digits.count >= width { return digits }
        return String(repeating: "0", count: width - digits.count) + digits
    }

    static func adding(_ days: Int, to date: Date) -> Date {
        calendar.date(byAdding: .day, value: days, to: date) ?? date.addingTimeInterval(Double(days) * 86_400)
    }

    static func nextMidnight(after date: Date) -> Date {
        let start = calendar.startOfDay(for: date)
        return calendar.date(byAdding: .day, value: 1, to: start) ?? start.addingTimeInterval(86_400)
    }

    /// The hour the evening rule begins, the same boundary the Today card
    /// and Android's WidgetClock use.
    static let eveningHour = 17

    static func evening(of date: Date) -> Date? {
        calendar.date(bySettingHour: eveningHour, minute: 0, second: 0, of: date)
    }

    static func isEvening(_ date: Date) -> Bool {
        calendar.component(.hour, from: date) >= eveningHour
    }

    /// The day a YYYY-MM-DD key names, at noon here.
    static func date(_ key: String?) -> Date? {
        guard let key = key else { return nil }
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var components = DateComponents()
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        components.hour = 12
        return calendar.date(from: components)
    }

    /// Whole days from one civil day to another.
    static func days(from start: Date, to end: Date) -> Int? {
        let from = calendar.startOfDay(for: start)
        let to = calendar.startOfDay(for: end)
        return calendar.dateComponents([.day], from: from, to: to).day
    }

    /// 0 for Sunday.
    static func weekdayIndex(_ date: Date) -> Int {
        calendar.component(.weekday, from: date) - 1
    }

    /// 0 for January.
    static func monthIndex(_ date: Date) -> Int {
        calendar.component(.month, from: date) - 1
    }

    static func dayOfMonth(_ date: Date) -> Int {
        calendar.component(.day, from: date)
    }

    static func minutesIntoDay(_ date: Date) -> Int {
        calendar.component(.hour, from: date) * 60 + calendar.component(.minute, from: date)
    }
}

// MARK: - Taps (docs/WIDGETS.md, section 3)

/// What a tap opens: an address the app's own code turns into a screen
/// (lib/widget/open.ts), never a route. WidgetKit hands it to the app, and
/// AppDelegate passes it to Capacitor exactly as it passes an icon shortcut.
enum WidgetTap {
    static let prefix = "net.purifyapp.purify://widget/"

    static func url(_ target: String) -> URL? {
        URL(string: prefix + target)
    }

    /// "/bible/luke/8#v25" as "verse/luke/8/25", or "today" for anything else.
    static func verse(_ href: String?) -> String {
        guard let href = href,
              let pattern = try? NSRegularExpression(pattern: "^/bible/([a-z0-9-]+)/([0-9]{1,3})(?:#v([0-9]{1,3}))?$"),
              let match = pattern.firstMatch(in: href, options: [], range: NSRange(href.startIndex..., in: href))
        else { return "today" }
        guard let book = group(match, 1, in: href), let chapter = group(match, 2, in: href) else { return "today" }
        let verse = group(match, 3, in: href) ?? "1"
        return "verse/\(book)/\(chapter)/\(verse)"
    }

    /// "saint/<slug>" for a slug shaped like one, else "today". The app checks
    /// the slug against the saints it knows.
    static func saint(_ slug: String?) -> String {
        guard let slug = slug,
              let pattern = try? NSRegularExpression(pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"),
              pattern.firstMatch(in: slug, options: [], range: NSRange(slug.startIndex..., in: slug)) != nil
        else { return "today" }
        return "saint/" + slug
    }

    static func group(_ match: NSTextCheckingResult, _ index: Int, in text: String) -> String? {
        let range = match.range(at: index)
        guard range.location != NSNotFound, let found = Range(range, in: text) else { return nil }
        return String(text[found])
    }
}
