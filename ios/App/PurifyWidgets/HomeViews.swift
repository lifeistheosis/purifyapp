import SwiftUI
import UIKit
import WidgetKit

// The home screen faces, drawn after the approved mock's iPhone small, medium
// and large widgets (Homebase/boards/purify-master/widgets/widgets.html).

/// Every Purify widget: the family and look it was placed with, at the size
/// the phone draws it.
struct PurifyWidgetView: View {
    let entry: PurifyEntry
    @Environment(\.widgetFamily) var size

    var body: some View {
        switch size {
        case .accessoryCircular, .accessoryRectangular, .accessoryInline:
            LockFace(entry: entry, size: size)
                .lockGround(size)
                .widgetURL(entry.tap)
        default:
            HomeFace(entry: entry, size: size)
                .widgetURL(entry.tap)
        }
    }
}

extension PurifyEntry {
    /// The address a tap on this widget opens (docs/WIDGETS.md, section 3).
    var tap: URL? {
        WidgetTap.url(tapTarget)
    }

    var tapTarget: String {
        switch family {
        case .verse:
            return WidgetTap.verse(moment.verse?.href)
        case .today:
            return "calendar"
        case .pray:
            return CivilDay.isEvening(moment.date) ? "pray/evening" : "pray/morning"
        case .streak:
            return "today"
        case .countdown:
            return look == "update" ? "whats-new" : "calendar"
        case .saint:
            return WidgetTap.saint(moment.patron?.slug)
        case .mosaic:
            return "today"
        }
    }
}

struct HomeFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var body: some View {
        switch entry.family {
        case .verse:
            VerseFace(entry: entry, size: size)
        case .today:
            TodayFace(entry: entry, size: size)
        case .pray:
            PrayFace(entry: entry, size: size)
        case .streak:
            StreakFace(entry: entry, size: size)
        case .countdown:
            CountdownFace(entry: entry, size: size)
        case .saint:
            SaintFace(entry: entry, size: size)
        case .mosaic:
            MosaicFace(entry: entry, size: size)
        }
    }
}

// MARK: - Verse of the Day

struct VerseFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var body: some View {
        if let verse = entry.moment.verse, let text = verse.text, !text.isEmpty {
            if entry.look == "mosaic" {
                VerseOnArt(entry: entry, size: size, text: text, ref: verse.ref ?? "", note: verse.note)
            } else {
                VerseMinimal(size: size, text: text, ref: verse.ref ?? "", note: verse.note)
            }
        } else {
            MessageFace(text: entry.moment.openToRefresh, size: size)
        }
    }
}

/// Three things only: a small cross, the verse, where it is from.
struct VerseMinimal: View {
    let size: WidgetFamily
    let text: String
    let ref: String
    /// A machine translation's label (TEMPORARY, lib/today/machineVerse.ts).
    var note: String? = nil

    var fontSize: CGFloat {
        switch size {
        case .systemSmall: return 14
        case .systemMedium: return 20
        default: return 31
        }
    }

    var lines: Int {
        switch size {
        case .systemSmall: return 4
        case .systemMedium: return 3
        default: return 7
        }
    }

    var insets: EdgeInsets {
        if size == .systemLarge {
            return EdgeInsets(top: 26, leading: 26, bottom: 26, trailing: 26)
        }
        return EdgeInsets(top: 17, leading: 18, bottom: 17, trailing: 18)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Cross(size: 12)
                .foregroundStyle(Look.paper3)
            Spacer(minLength: 6)
            Text(text)
                .font(Look.serif(fontSize, .medium))
                .lineSpacing(fontSize * 0.12)
                .foregroundStyle(Look.paper)
                .lineLimit(lines)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 6)
            RefLine(ref: ref)
            if let note = note, !note.isEmpty {
                VerseNote(note: note)
                    .padding(.top, 4)
            }
        }
        .card(insets) {
            Look.card
        }
    }
}

/// The verse set over the day's Mosaic art: the season's picture while a
/// season is on, else the evening mosaic, both of which shade their foot so
/// the words read.
struct VerseOnArt: View {
    let entry: PurifyEntry
    let size: WidgetFamily
    let text: String
    let ref: String
    /// A machine translation's label (TEMPORARY, lib/today/machineVerse.ts).
    var note: String? = nil

    var paint: String {
        MosaicArt.paint(forSeason: entry.moment.day?.season?.theme) ?? "dusk"
    }

    var fontSize: CGFloat {
        switch size {
        case .systemSmall: return 15
        case .systemMedium: return 19
        default: return 26
        }
    }

    var lines: Int {
        switch size {
        case .systemSmall: return 4
        case .systemMedium: return 2
        default: return 6
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Spacer(minLength: 0)
            Text(text)
                .font(Look.serif(fontSize))
                .foregroundStyle(Color.white)
                .lineLimit(lines)
                .minimumScaleFactor(0.7)
            RefLine(ref: ref, color: Color.white.opacity(0.86))
            if let note = note, !note.isEmpty {
                VerseNote(note: note, color: Color.white.opacity(0.76))
            }
        }
        .artShadow()
        .card(Look.artInsets) {
            ArtBackground(paint: paint, wide: size == .systemMedium, size: entry.size)
        }
    }
}

// MARK: - Today in the Church

struct TodayFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var body: some View {
        if let day = entry.moment.day {
            if entry.look == "rotating" {
                TodayRotating(moment: entry.moment, day: day, size: size)
            } else if entry.look == "week" && size == .systemMedium {
                TodayWeek(moment: entry.moment, day: day)
            } else if size == .systemSmall {
                TodaySmall(moment: entry.moment, day: day)
            } else {
                TodayMedium(moment: entry.moment, day: day)
            }
        } else {
            MessageFace(text: entry.moment.openToRefresh, size: size)
        }
    }
}

/// "10 SAT · OCT", the saint, the fast.
struct TodaySmall: View {
    let moment: Moment
    let day: ChurchDay

    var dateWords: String {
        moment.weekdayShort(moment.date) + " · " + moment.monthShort(moment.date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                Text(String(CivilDay.dayOfMonth(moment.date)))
                    .font(Look.serif(34))
                    .foregroundStyle(Look.paper)
                Text(dateWords)
                    .font(Look.sans(11, .bold))
                    .tracking(1.1)
                    .textCase(.uppercase)
                    .foregroundStyle(Look.paper2)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            Text(day.saint ?? "")
                .font(Look.serif(14))
                .foregroundStyle(Look.paper)
                .lineLimit(3)
                .padding(.top, 8)
            Spacer(minLength: 4)
            FastChip(text: moment.fastBadge, standsOut: day.isFast)
        }
        .card(Look.insets(.systemSmall)) {
            Look.card
        }
    }
}

/// The date on the left, the saint and the fast on the right.
struct TodayMedium: View {
    let moment: Moment
    let day: ChurchDay

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 0) {
                Text(moment.weekdayShort(moment.date))
                    .font(Look.sans(11, .bold))
                    .tracking(1.5)
                    .textCase(.uppercase)
                    .foregroundStyle(Look.eyebrow)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Text(String(CivilDay.dayOfMonth(moment.date)))
                    .font(Look.serif(46))
                    .foregroundStyle(Look.paper)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer(minLength: 0)
                Text(moment.monthLong(moment.date))
                    .font(Look.sans(11.5, .semibold))
                    .foregroundStyle(Look.paper2)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(width: 66, alignment: .leading)
            .frame(maxHeight: .infinity, alignment: .leading)

            Rectangle()
                .fill(Look.edge)
                .frame(width: 1)

            VStack(alignment: .leading, spacing: 0) {
                Eyebrow(text: moment.words.text("todayInTheChurch", "Today in the Church"), cross: true)
                Text(day.saint ?? "")
                    .font(Look.serif(16.5))
                    .foregroundStyle(Look.paper)
                    .lineLimit(3)
                    .padding(.top, 7)
                Spacer(minLength: 4)
                HStack(alignment: .center, spacing: 8) {
                    Text(day.note ?? "")
                        .font(Look.sans(12, .semibold))
                        .foregroundStyle(Look.paper3)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    FastChip(text: moment.fastBadge, standsOut: day.isFast)
                }
            }
        }
        .card(Look.insets(.systemMedium)) {
            Look.card
        }
    }
}

/// Seven days from today with a red dot on each fast day, today's saint under them.
struct TodayWeek: View {
    let moment: Moment
    let day: ChurchDay

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Eyebrow(text: moment.words.text("thisWeek", "This week"), cross: true)
            HStack(spacing: 4) {
                ForEach(moment.week) { item in
                    WeekColumn(moment: moment, day: item)
                }
            }
            .padding(.top, 8)
            Spacer(minLength: 2)
            HStack(alignment: .center, spacing: 8) {
                Text(day.saint ?? "")
                    .font(Look.sans(12, .medium))
                    .foregroundStyle(Look.paper2)
                    .lineLimit(1)
                Spacer(minLength: 0)
                FastChip(text: moment.fastBadge, standsOut: day.isFast)
            }
        }
        .card(Look.insets(.systemMedium)) {
            Look.card
        }
    }
}

struct WeekColumn: View {
    let moment: Moment
    let day: WeekDay

    var body: some View {
        VStack(spacing: 3) {
            Text(moment.weekdayShort(day.date))
                .font(Look.sans(10, .bold))
                .textCase(.uppercase)
                .foregroundStyle(Look.paper3)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            ZStack {
                Circle()
                    .fill(day.isToday ? Look.button : Color.clear)
                Text(String(CivilDay.dayOfMonth(day.date)))
                    .font(Look.serif(15))
                    .foregroundStyle(day.isToday ? Look.onButton : Look.paper)
            }
            .frame(width: 26, height: 26)
            Circle()
                .fill(day.isFast ? Look.red : Color.clear)
                .frame(width: 5, height: 5)
        }
        .frame(maxWidth: .infinity)
    }
}

/// The verse, the saint and the fast in turn. iOS does not let a widget
/// loop by itself, so the face turns with the timeline's twenty-minute
/// entries (WidgetTimeline.swift), fading where the phone animates widgets.
struct TodayRotating: View {
    let moment: Moment
    let day: ChurchDay
    let size: WidgetFamily

    var face: Int {
        (CivilDay.minutesIntoDay(moment.date) / 20) % 3
    }

    var small: Bool {
        size == .systemSmall
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 6) {
                Eyebrow(text: moment.words.text("today", "Today"), cross: true)
                Spacer(minLength: 0)
                Pips(current: face)
            }
            Group {
                if face == 0 {
                    rotatingVerse
                } else if face == 1 {
                    rotatingSaint
                } else {
                    rotatingFast
                }
            }
            .id(face)
            .transition(.opacity)
            .padding(.top, 8)
        }
        .card(Look.insets(size)) {
            Look.card
        }
    }

    var rotatingVerse: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(moment.verse?.text ?? "")
                .font(Look.serif(small ? 14 : 17, .medium))
                .foregroundStyle(Look.paper)
                .lineLimit(small ? 4 : 3)
                .minimumScaleFactor(0.75)
            Spacer(minLength: 2)
            Text(moment.verse?.ref ?? "")
                .font(Look.sans(12, .semibold))
                .foregroundStyle(Look.paper2)
                .lineLimit(1)
            if let note = moment.verse?.note, !note.isEmpty {
                VerseNote(note: note)
            }
        }
    }

    var rotatingSaint: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(day.saint ?? "")
                .font(Look.serif(small ? 14 : 17))
                .foregroundStyle(Look.paper)
                .lineLimit(3)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 2)
            HStack(alignment: .center, spacing: 8) {
                Text(day.note ?? "")
                    .font(Look.sans(12, .semibold))
                    .foregroundStyle(Look.paper3)
                    .lineLimit(1)
                Spacer(minLength: 0)
                if !small {
                    FastChip(text: moment.fastBadge, standsOut: day.isFast)
                }
            }
        }
    }

    /// The fast, and the next fast season with how far off it is, as Android
    /// says it ("Nativity Fast begins · 33 days").
    var comingLine: String {
        guard let next = day.nextFast, let name = next.name, let days = next.days else { return "" }
        let when = days == 0 ? moment.words.text("today0", "Today") : "\(days) \(moment.unit(days))"
        return "\(name) · \(when)"
    }

    var rotatingFast: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(moment.fastBadge)
                .font(Look.serif(small ? 16 : 19))
                .foregroundStyle(Look.paper)
                .lineLimit(2)
            Text(comingLine)
                .font(Look.sans(12, .medium))
                .foregroundStyle(Look.paper2)
                .lineLimit(2)
            Spacer(minLength: 0)
        }
    }
}

/// Which of the rotating faces is showing.
struct Pips: View {
    let current: Int

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Capsule()
                    .fill(index == current ? Look.paper : Look.dot)
                    .frame(width: 14, height: 3)
            }
        }
    }
}

// MARK: - Pray now

/// Morning prayers until 17:00, Evening prayers after. The picture is the
/// hour: rising light in the morning, a moon over deep blue in the evening.
/// Once the rule is prayed the card goes quiet and says when the next is.
struct PrayFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var words: Words {
        entry.moment.words
    }

    var evening: Bool {
        CivilDay.isEvening(entry.moment.date)
    }

    var prayed: Bool {
        let marks = entry.moment.prayed
        let mark = evening ? marks?.evening : marks?.morning
        return mark != nil && mark == entry.moment.key
    }

    var tag: String {
        evening ? words.text("evening", "Evening") : words.text("morning", "Morning")
    }

    var title: String {
        if prayed { return words.text("prayedToday", "Prayed today") }
        return evening ? words.text("eveningPrayers", "Evening prayers") : words.text("morningPrayers", "Morning prayers")
    }

    /// "8 min", only from the app: the rule's length is the app's to say.
    var minutes: String {
        evening ? words.text("eveningMinutes", "") : words.text("morningMinutes", "")
    }

    var next: String {
        evening
            ? words.text("afterEvening", "Morning prayers tomorrow")
            : words.text("afterMorning", "Evening prayers at 5 pm")
    }

    var body: some View {
        Group {
            if size == .systemSmall {
                smallFace
            } else {
                mediumFace
            }
        }
        .artShadow()
        .card(Look.artInsets) {
            ArtBackground(paint: evening ? "dusk" : "dawn", wide: size != .systemSmall, size: entry.size, quiet: prayed)
        }
    }

    var smallFace: some View {
        VStack(alignment: .leading, spacing: 2) {
            Spacer(minLength: 0)
            ArtTag(text: tag)
            Text(title)
                .font(Look.serif(18))
                .foregroundStyle(Color.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            HStack(alignment: .center, spacing: 8) {
                Text(prayed ? next : minutes)
                    .font(Look.sans(11.5, .medium))
                    .foregroundStyle(Color.white.opacity(0.86))
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                PlayButton(done: prayed, big: false)
            }
            .padding(.top, 4)
        }
    }

    var mediumTag: String {
        if prayed || minutes.isEmpty { return tag }
        return tag + " · " + minutes
    }

    var mediumFace: some View {
        VStack(alignment: .leading, spacing: 2) {
            Spacer(minLength: 0)
            ArtTag(text: mediumTag)
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Look.serif(25))
                        .foregroundStyle(Color.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    if prayed {
                        Text(next)
                            .font(Look.sans(12, .medium))
                            .foregroundStyle(Color.white.opacity(0.86))
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
                PlayButton(done: prayed, big: true)
            }
        }
    }
}

/// The small capitals on Mosaic art: "MORNING", "EVENING · 8 MIN".
struct ArtTag: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Look.sans(11, .bold))
            .tracking(1.3)
            .textCase(.uppercase)
            .foregroundStyle(Color.white.opacity(0.8))
            .lineLimit(1)
    }
}

/// One round button instead of a Begin pill; a quiet check once prayed.
struct PlayButton: View {
    let done: Bool
    let big: Bool

    var side: CGFloat {
        big ? 46 : 34
    }

    var body: some View {
        ZStack {
            if done {
                Circle()
                    .fill(Color.white.opacity(0.18))
                Circle()
                    .strokeBorder(Color.white.opacity(0.35), lineWidth: 1)
                Image(systemName: "checkmark")
                    .font(.system(size: big ? 17 : 13, weight: .bold))
                    .foregroundStyle(Color.white)
            } else {
                Circle()
                    .fill(Color.white)
                Image(systemName: "arrow.right")
                    .font(.system(size: big ? 17 : 13, weight: .bold))
                    .foregroundStyle(Look.onButton)
            }
        }
        .frame(width: side, height: side)
    }
}

// MARK: - Streak

struct StreakFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var body: some View {
        if let streak = entry.moment.currentStreak {
            if entry.look == "ring" {
                StreakRing(moment: entry.moment, streak: streak)
            } else {
                StreakNumber(moment: entry.moment, streak: streak)
            }
        } else {
            MessageFace(text: entry.moment.words.text("openForStreak", "Open Purify to see your streak"), size: size)
        }
    }
}

/// The red streak and the week.
struct StreakNumber: View {
    let moment: Moment
    let streak: ShownStreak

    var line: String {
        streak.kept
            ? moment.words.text("keptToday", "Kept today.")
            : moment.words.text("keepIt", "Pray or read today to keep it.")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 8) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(Look.red)
                Text(String(streak.count))
                    .font(Look.serif(40))
                    .foregroundStyle(Look.paper)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }
            Text(moment.words.text("dayStreak", "day streak"))
                .font(Look.sans(11.5, .semibold))
                .foregroundStyle(Look.paper2)
                .lineLimit(1)
                .padding(.top, 4)
            Text(line)
                .font(Look.sans(11.5))
                .foregroundStyle(Look.paper3)
                .lineLimit(2)
                .padding(.top, 6)
            Spacer(minLength: 4)
            WeekBars(week: streak.week)
        }
        .card(Look.insets(.systemSmall)) {
            Look.card
        }
    }
}

/// The streak as a ring that fills through the week.
struct StreakRing: View {
    let moment: Moment
    let streak: ShownStreak

    var progress: CGFloat {
        CGFloat(streak.keptThisWeek) / 7
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(Look.dot, lineWidth: 7)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Look.streak, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 0) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(Look.red)
                    Text(String(streak.count))
                        .font(Look.serif(28))
                        .foregroundStyle(Look.paper)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                }
            }
            .frame(width: 86, height: 86)
            Text(moment.words.text("dayStreak", "day streak"))
                .font(Look.sans(11.5, .semibold))
                .foregroundStyle(Look.paper2)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .card(Look.insets(.systemSmall)) {
            Look.card
        }
    }
}

/// Seven bars, red into ember on each day kept, in the order the app sends.
struct WeekBars: View {
    let week: [Bool]

    func kept(_ index: Int) -> Bool {
        index < week.count && week[index]
    }

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<7, id: \.self) { index in
                Capsule()
                    .fill(kept(index) ? AnyShapeStyle(Look.streak) : AnyShapeStyle(Look.dot))
                    .frame(height: 5)
            }
        }
    }
}

// MARK: - What is coming

struct CountdownFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var countdown: DayCountdown? {
        entry.look == "feast" ? entry.moment.day?.nextFeast : entry.moment.day?.nextFast
    }

    var body: some View {
        if entry.look == "update" {
            UpdateFace(entry: entry, size: size)
        } else if let countdown = countdown, let days = countdown.days {
            ChurchCountdown(moment: entry.moment, size: size, name: countdown.name ?? "", date: countdown.date, days: days)
        } else {
            MessageFace(text: entry.moment.openToRefresh, size: size)
        }
    }
}

/// The next fast or great feast, and how far off it is, counted by the build.
struct ChurchCountdown: View {
    let moment: Moment
    let size: WidgetFamily
    let name: String
    let date: String?
    let days: Int

    var number: String {
        days <= 0 ? moment.words.text("today0", "Today") : String(days)
    }

    var unit: String {
        days <= 0 ? "" : moment.unit(days)
    }

    var eyebrow: String {
        moment.words.text("coming", "Coming")
    }

    var body: some View {
        if size == .systemSmall {
            VStack(alignment: .leading, spacing: 0) {
                Eyebrow(text: eyebrow)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(number)
                        .font(Look.serif(days <= 0 ? 28 : 38))
                        .foregroundStyle(Look.paper)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    Text(unit)
                        .font(Look.sans(11.5, .semibold))
                        .foregroundStyle(Look.paper2)
                        .lineLimit(1)
                }
                .padding(.top, 6)
                Text(name)
                    .font(Look.serif(14.5))
                    .foregroundStyle(Look.paper)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .padding(.top, 6)
                Spacer(minLength: 2)
                Text(moment.dateLine(date))
                    .font(Look.sans(12, .semibold))
                    .foregroundStyle(Look.paper3)
                    .lineLimit(1)
            }
            .card(Look.insets(.systemSmall)) {
                Look.card
            }
        } else {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(number)
                        .font(Look.serif(days <= 0 ? 30 : 52))
                        .foregroundStyle(Look.paper)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                    Text(unit)
                        .font(Look.sans(11.5, .semibold))
                        .foregroundStyle(Look.paper2)
                        .lineLimit(1)
                }
                .frame(width: 92, alignment: .leading)
                VStack(alignment: .leading, spacing: 0) {
                    Eyebrow(text: eyebrow)
                    Text(name)
                        .font(Look.serif(17))
                        .foregroundStyle(Look.paper)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .padding(.top, 6)
                    Spacer(minLength: 2)
                    Text(moment.dateLine(date))
                        .font(Look.sans(12, .semibold))
                        .foregroundStyle(Look.paper3)
                        .lineLimit(1)
                }
            }
            .card(Look.insets(.systemMedium)) {
                Look.card
            }
        }
    }
}

/// Days until the next Purify update. It warms as the day nears: paper far
/// off, red in the last days, a full red card on the day. The date comes
/// from the app (and from the content packs), so a moved date follows.
struct UpdateFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var update: HandedUpdate? {
        entry.moment.update
    }

    var days: Int? {
        entry.moment.daysUntil(update?.date)
    }

    /// Out on the day, and after it until the app says otherwise.
    var out: Bool {
        if let days = days { return days <= 0 }
        return false
    }

    var heat: Double {
        guard let days = days else { return 0 }
        return min(1, max(0, 1 - Double(days) / 30))
    }

    var ink: Color {
        out ? Color.white : Look.heat(heat)
    }

    var number: String {
        guard let days = days else { return entry.moment.words.text("soon", "Soon") }
        return days <= 0 ? entry.moment.words.text("today0", "Today") : String(days)
    }

    var unit: String {
        guard let days = days, days > 0 else { return "" }
        return entry.moment.unit(days)
    }

    var big: Bool {
        if let days = days { return days > 0 }
        return false
    }

    var body: some View {
        if update == nil {
            MessageFace(text: entry.moment.openToRefresh, size: size)
        } else if size == .systemSmall {
            VStack(alignment: .leading, spacing: 0) {
                Eyebrow(text: entry.moment.words.text("nextUpdate", "Next update"), color: ink)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(number)
                        .font(Look.serif(big ? 35 : 26))
                        .foregroundStyle(ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    Text(unit)
                        .font(Look.sans(11.5, .semibold))
                        .foregroundStyle(out ? Color.white.opacity(0.85) : Look.paper2)
                        .lineLimit(1)
                }
                .padding(.top, 8)
                Text(update?.name ?? "")
                    .font(Look.serif(14.5))
                    .foregroundStyle(out ? Color.white : Look.paper)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .padding(.top, 4)
                Text(update?.version ?? "")
                    .font(Look.sans(11.5))
                    .foregroundStyle(out ? Color.white.opacity(0.85) : Look.paper3)
                    .lineLimit(1)
                Spacer(minLength: 4)
                HeatBar(amount: heat, color: ink, track: out ? Color.white.opacity(0.3) : Look.dot)
            }
            .card(Look.insets(.systemSmall)) {
                if out {
                    Look.outCard
                } else {
                    Look.card
                }
            }
        } else {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(number)
                        .font(Look.serif(big ? 52 : 30))
                        .foregroundStyle(ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                    Text(unit)
                        .font(Look.sans(11.5, .semibold))
                        .foregroundStyle(out ? Color.white.opacity(0.85) : Look.paper2)
                        .lineLimit(1)
                }
                .frame(width: 92, alignment: .leading)
                VStack(alignment: .leading, spacing: 0) {
                    Eyebrow(text: entry.moment.words.text("nextUpdate", "Next update"), color: ink)
                    Text(update?.name ?? "")
                        .font(Look.serif(17))
                        .foregroundStyle(out ? Color.white : Look.paper)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .padding(.top, 6)
                    Text(update?.version ?? "")
                        .font(Look.sans(11.5))
                        .foregroundStyle(out ? Color.white.opacity(0.85) : Look.paper3)
                        .lineLimit(1)
                        .padding(.top, 2)
                    Spacer(minLength: 4)
                    HeatBar(amount: heat, color: ink, track: out ? Color.white.opacity(0.3) : Look.dot)
                }
            }
            .card(Look.insets(.systemMedium)) {
                if out {
                    Look.outCard
                } else {
                    Look.card
                }
            }
        }
    }
}

/// How near the update is, as a filling bar.
struct HeatBar: View {
    let amount: Double
    let color: Color
    let track: Color

    var body: some View {
        GeometryReader { space in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(track)
                Capsule()
                    .fill(color)
                    .frame(width: max(6, space.size.width * CGFloat(amount)))
            }
        }
        .frame(height: 6)
    }
}

// MARK: - My saint

struct SaintFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var body: some View {
        if let patron = entry.moment.patron, let name = patron.name, !name.isEmpty {
            if size == .systemSmall {
                SaintSmall(entry: entry, patron: patron, name: name)
            } else {
                SaintMedium(entry: entry, patron: patron, name: name)
            }
        } else {
            MessageFace(text: entry.moment.words.text("chooseSaint", "Choose your saint in Purify"), size: size)
        }
    }
}

extension Moment {
    /// Days to the patron's name day, from the date the app handed over.
    func nameDayDays(_ patron: HandedPatron) -> Int? {
        daysUntil(patron.nameDay)
    }

    /// "Name day in 57 days", "Name day today", or "" when the date has
    /// passed and the app has not yet handed over the next one.
    func nameDayLine(_ patron: HandedPatron) -> String {
        guard let days = nameDayDays(patron), days >= 0 else { return "" }
        if days == 0 { return words.text("nameDayToday", "Name day today") }
        let line = words.text("nameDayIn", "Name day in {n} days")
        return line.replacingOccurrences(of: "{n}", with: String(days))
    }
}

/// The icon over the name, or the name alone while the icon is not cleared.
struct SaintSmall: View {
    let entry: PurifyEntry
    let patron: HandedPatron
    let name: String
    @Environment(\.displayScale) var displayScale

    var icon: UIImage? {
        let box = CGSize(width: max(0, entry.size.width - 24), height: 84)
        return SaintIcon.picture(patron.icon, box: box, scale: displayScale)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let icon = icon {
                Image(uiImage: icon)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 84)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                Text(name)
                    .font(Look.serif(13.5))
                    .foregroundStyle(Look.paper)
                    .lineLimit(1)
                    .padding(.top, 7)
            } else {
                Eyebrow(text: entry.moment.words.text("mySaint", "My saint"), cross: true)
                Text(name)
                    .font(Look.serif(15))
                    .foregroundStyle(Look.paper)
                    .lineLimit(4)
                    .minimumScaleFactor(0.85)
                    .padding(.top, 8)
                Spacer(minLength: 2)
            }
            Text(entry.moment.nameDayLine(patron))
                .font(Look.sans(11.5))
                .foregroundStyle(Look.paper2)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .padding(.top, 1)
        }
        .card(EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12)) {
            Look.card
        }
    }
}

/// The icon on the left, the full name, the date and the days to it.
struct SaintMedium: View {
    let entry: PurifyEntry
    let patron: HandedPatron
    let name: String
    @Environment(\.displayScale) var displayScale

    var icon: UIImage? {
        let box = CGSize(width: 96, height: max(0, entry.size.height - 24))
        return SaintIcon.picture(patron.icon, box: box, scale: displayScale)
    }

    var chip: String {
        guard let days = entry.moment.nameDayDays(patron), days >= 0 else { return "" }
        if days == 0 { return entry.moment.words.text("nameDayToday", "Name day today") }
        return String(days) + " " + entry.moment.unit(days)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            if let icon = icon {
                Image(uiImage: icon)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 96)
                    .frame(maxHeight: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            VStack(alignment: .leading, spacing: 0) {
                Eyebrow(text: entry.moment.words.text("mySaint", "My saint"), cross: true)
                Text(name)
                    .font(Look.serif(16))
                    .foregroundStyle(Look.paper)
                    .lineLimit(3)
                    .minimumScaleFactor(0.85)
                    .padding(.top, 6)
                Spacer(minLength: 2)
                HStack(alignment: .center, spacing: 8) {
                    Text(entry.moment.dateLine(patron.nameDay))
                        .font(Look.sans(12, .semibold))
                        .foregroundStyle(Look.paper2)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    if !chip.isEmpty {
                        FastChip(text: chip, standsOut: false)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .card(EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 16)) {
            Look.card
        }
    }
}

// MARK: - Mosaic

/// The Mosaic pack, there to look good: the season's mosaic while a season
/// is on (and the cross on other days), the cross, or the lampada. Only the
/// season carries words, set on the picture's shaded foot.
struct MosaicFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var season: DaySeason? {
        guard entry.look == "season", let season = entry.moment.day?.season,
              MosaicArt.paint(forSeason: season.theme) != nil
        else { return nil }
        return season
    }

    var paint: String {
        switch entry.look {
        case "lampada": return "lampada"
        case "cross": return "night"
        default: return MosaicArt.paint(forSeason: season?.theme) ?? "night"
        }
    }

    var title: String {
        guard let season = season, let theme = season.theme else { return "" }
        return entry.moment.words.text("season." + theme + ".title", season.title ?? "")
    }

    var line: String {
        guard let season = season, let theme = season.theme else { return "" }
        return entry.moment.words.text("season." + theme + ".line", season.line ?? "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Spacer(minLength: 0)
            if season != nil {
                Text(title)
                    .font(Look.serif(size == .systemSmall ? 17 : 24))
                    .foregroundStyle(Color.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.75)
                Text(line)
                    .font(Look.sans(11.5, .medium))
                    .foregroundStyle(Color.white.opacity(0.86))
                    .lineLimit(1)
            }
        }
        .artShadow()
        .card(Look.artInsets) {
            ArtBackground(paint: paint, wide: size != .systemSmall, size: entry.size)
        }
    }
}
