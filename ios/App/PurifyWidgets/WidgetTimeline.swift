import CoreGraphics
import Foundation
import WidgetKit

/// The seven families of docs/WIDGETS.md. Each is one entry in the widget
/// gallery; its looks are chosen in Edit Widget on iOS 17 and newer, and iOS
/// 16 shows each family's first look.
enum PurifyFamily: String {
    case verse, today, pray, streak, countdown, saint, mosaic

    var kind: String { "net.purifyapp.purify.widget." + rawValue }

    /// The look a widget wears until the reader picks another, the first in
    /// the family's list, as on Android (WidgetVariants).
    var firstLook: String {
        switch self {
        case .verse: return "minimal"
        case .today: return "day"
        case .streak: return "number"
        case .countdown: return "fast"
        case .mosaic: return "season"
        case .pray, .saint: return "default"
        }
    }
}

/// One moment of one widget: what it shows from `date` until the next entry.
struct PurifyEntry: TimelineEntry {
    let date: Date
    let family: PurifyFamily
    let look: String
    /// The widget's size in points, so a picture is cut to fit it.
    let size: CGSize
    let moment: Moment
}

/// Everything the widgets know at one moment, read from the day table and
/// from what the app handed over.
struct Moment {
    let date: Date
    /// The civil day `date` falls on, here: the table's key.
    let key: String
    let words: Words
    /// The day in the reader's own reckoning, or nil when the table has none.
    let day: ChurchDay?
    let verse: DayVerse?
    /// Seven civil days from today, for the week face and the lock screen.
    let week: [WeekDay]
    let streak: HandedStreak?
    let prayed: HandedPrayed?
    let patron: HandedPatron?
    let update: HandedUpdate?

    static func at(_ date: Date) -> Moment {
        let table = DayTableFile.read()
        let handed = Handed.read()
        let old = handed.calendarStyle == "old"
        let key = CivilDay.key(date)

        var week: [WeekDay] = []
        for offset in 0..<7 {
            let when = CivilDay.adding(offset, to: date)
            let whenKey = CivilDay.key(when)
            let entry = table?.days[whenKey]
            let day = old ? entry?.oldCalendar : entry?.newCalendar
            week.append(WeekDay(id: whenKey, date: when, isFast: day?.isFast ?? false, isToday: offset == 0))
        }

        let entry = table?.days[key]
        return Moment(
            date: date,
            key: key,
            words: handed.words,
            day: old ? entry?.oldCalendar : entry?.newCalendar,
            // In the app's language when the table carries the verse in it
            // (TEMPORARY, lib/today/machineVerse.ts), else the English.
            verse: entry?.verse?.shown(in: handed.words.table["language"]),
            week: week,
            streak: handed.streak,
            prayed: handed.prayed,
            patron: handed.patron,
            update: handed.update
        )
    }
}

struct WeekDay: Identifiable {
    let id: String
    let date: Date
    let isFast: Bool
    let isToday: Bool
}

/// The streak as a widget may show it. Only the app keeps the streak, so a
/// widget repeats the app's last word and never works one out: the count it
/// wrote today, or yesterday's when yesterday was kept (it still stands until
/// tonight). Anything older is too stale to repeat.
struct ShownStreak {
    let count: Int
    let kept: Bool
    let week: [Bool]

    var keptThisWeek: Int {
        week.prefix(7).filter { $0 }.count
    }
}

extension Moment {
    var currentStreak: ShownStreak? {
        guard let streak = streak, let count = streak.count, let on = streak.on else { return nil }
        let week = streak.week ?? []
        if on == key {
            return ShownStreak(count: count, kept: streak.keptToday ?? false, week: week)
        }
        let yesterday = CivilDay.key(CivilDay.adding(-1, to: date))
        if on == yesterday && streak.keptToday == true {
            // The week moves on a day, as on Android: yesterday's seven, the
            // oldest dropped, and today not kept yet as the last dash.
            let moved = Array(week.dropFirst()) + [false]
            return ShownStreak(count: count, kept: false, week: moved)
        }
        return nil
    }

    /// The fast's badge in the reader's language, falling back to the
    /// table's English.
    var fastBadge: String {
        guard let day = day else { return "" }
        let english = day.fastLabel ?? ""
        guard let rule = day.fastRule, !rule.isEmpty else { return english }
        return words.text("fast." + rule, english)
    }

    func weekdayShort(_ when: Date) -> String {
        words.listItem("weekdaysShort", CivilDay.weekdayIndex(when), CivilDay.calendar.shortWeekdaySymbols)
    }

    func monthShort(_ when: Date) -> String {
        words.listItem("monthsShort", CivilDay.monthIndex(when), CivilDay.calendar.shortMonthSymbols)
    }

    func monthLong(_ when: Date) -> String {
        words.listItem("monthsLong", CivilDay.monthIndex(when), CivilDay.calendar.monthSymbols)
    }

    /// "November 15" for a YYYY-MM-DD key, or "" when there is none.
    func dateLine(_ key: String?) -> String {
        guard let when = CivilDay.date(key) else { return "" }
        return monthLong(when) + " " + String(CivilDay.dayOfMonth(when))
    }

    /// Civil days from this moment to a YYYY-MM-DD key.
    func daysUntil(_ key: String?) -> Int? {
        guard let when = CivilDay.date(key) else { return nil }
        return CivilDay.days(from: date, to: when)
    }

    /// The unit after a count. The contract carries only "days"; one day in
    /// English is said properly, and "day" is read when the app sends it.
    func unit(_ count: Int) -> String {
        let days = words.text("days", "days")
        if count != 1 { return days }
        return words.text("day", days == "days" ? "day" : days)
    }

    var openToRefresh: String {
        words.text("openToRefresh", "Open Purify to refresh")
    }
}

// MARK: - Timelines

/// When each widget turns over. Every widget gets an entry for now and one
/// for the next local midnight, so the new day's saint is there the moment
/// the day begins even if the phone asks late for the next timeline. Pray
/// now adds 17:00, when the morning rule gives way to the evening one, and
/// the rotating Today face adds a step every twenty minutes: iOS does not let
/// a widget animate on its own, so it turns as its entries change.
enum Timelines {
    static let rotationStep: TimeInterval = 20 * 60

    static func entry(_ family: PurifyFamily, look: String, at date: Date, in context: TimelineProviderContext) -> PurifyEntry {
        PurifyEntry(date: date, family: family, look: look, size: context.displaySize, moment: Moment.at(date))
    }

    static func timeline(_ family: PurifyFamily, look: String, in context: TimelineProviderContext) -> Timeline<PurifyEntry> {
        let now = Date()
        let midnight = CivilDay.nextMidnight(after: now)
        var dates: [Date] = [now]
        var policy: TimelineReloadPolicy = .atEnd

        if family == .pray, let evening = CivilDay.evening(of: now), evening > now {
            dates.append(evening)
        }

        let homeScreen = context.family == .systemSmall || context.family == .systemMedium
        if family == .today && look == "rotating" && homeScreen {
            let start = (now.timeIntervalSinceReferenceDate / rotationStep).rounded(.down) * rotationStep + rotationStep
            var next = Date(timeIntervalSinceReferenceDate: start)
            var added = 0
            while next < midnight && added < 36 {
                dates.append(next)
                next = next.addingTimeInterval(rotationStep)
                added += 1
            }
            // Twelve hours of steps at most; past them, ask for a fresh
            // timeline rather than standing still until midnight.
            if next < midnight {
                policy = .after(next)
            }
        }

        dates.append(midnight)
        let entries = dates.map { date in Timelines.entry(family, look: look, at: date, in: context) }
        return Timeline(entries: entries, policy: policy)
    }
}

/// The provider for every widget without a chosen look: the families with
/// one look on every iOS, and every family on iOS 16, where Edit Widget has
/// no looks to offer. iOS 17 and newer use LookIntents.swift.
struct LookProvider: TimelineProvider {
    let family: PurifyFamily
    let look: String

    func placeholder(in context: Context) -> PurifyEntry {
        Timelines.entry(family, look: look, at: Date(), in: context)
    }

    func getSnapshot(in context: Context, completion: @escaping (PurifyEntry) -> Void) {
        completion(Timelines.entry(family, look: look, at: Date(), in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PurifyEntry>) -> Void) {
        completion(Timelines.timeline(family, look: look, in: context))
    }
}
