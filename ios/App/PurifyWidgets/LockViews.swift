import SwiftUI
import WidgetKit

// The lock screen widgets of the mock's section 6 (iOS 16 and newer): the
// streak as a ring that fills through the week, the verse, the days to the
// next fast, and the day's saint over the week's fast days. White on the
// system's glass. The lock screen draws every widget in one tint, so the
// shapes do the work, not colour.

struct LockFace: View {
    let entry: PurifyEntry
    let size: WidgetFamily

    var body: some View {
        switch size {
        case .accessoryCircular:
            if entry.family == .streak {
                LockStreak(moment: entry.moment)
            } else {
                LockCountdown(entry: entry)
            }
        case .accessoryRectangular:
            if entry.family == .verse {
                LockVerse(moment: entry.moment)
            } else {
                LockSaint(moment: entry.moment)
            }
        default:
            LockLine(moment: entry.moment)
        }
    }
}

/// The mock's gauge: three quarters of a ring, open at the foot, filled from
/// its left end as far as `progress` (0 to 1), with the number inside.
struct LockRing<Center: View>: View {
    let progress: CGFloat
    let center: Center

    var filled: CGFloat {
        0.75 * min(1, max(0, progress))
    }

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0, to: 0.75)
                .stroke(Color.white.opacity(0.28), style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(135))
            Circle()
                .trim(from: 0, to: filled)
                .stroke(Color.white, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(135))
            center
        }
        .padding(5)
    }
}

/// The streak: the ring fills with the days kept this week.
struct LockStreak: View {
    let moment: Moment

    var streak: ShownStreak? {
        moment.currentStreak
    }

    var progress: CGFloat {
        guard let streak = streak else { return 0 }
        return CGFloat(streak.keptThisWeek) / 7
    }

    var spoken: String {
        guard let streak = streak else { return moment.words.text("openForStreak", "Open Purify to see your streak") }
        return String(streak.count) + " " + moment.words.text("dayStreak", "day streak")
    }

    var body: some View {
        LockRing(progress: progress, center: VStack(spacing: 0) {
            Image(systemName: streak == nil ? "flame" : "flame.fill")
                .font(.system(size: 11, weight: .semibold))
            if let streak = streak {
                Text(String(streak.count))
                    .font(.system(size: 20, weight: .bold).monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
        })
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(spoken))
    }
}

/// Days to the next fast, by default; the next feast or the next Purify
/// update when the reader picks those in Edit Widget.
struct LockCountdown: View {
    let entry: PurifyEntry

    var days: Int? {
        if entry.look == "update" {
            return entry.moment.daysUntil(entry.moment.update?.date)
        }
        let next = entry.look == "feast" ? entry.moment.day?.nextFeast : entry.moment.day?.nextFast
        return next?.days
    }

    /// The ring fills over the last sixty days.
    var progress: CGFloat {
        guard let days = days else { return 0 }
        return 1 - CGFloat(min(max(days, 0), 60)) / 60
    }

    var number: String {
        guard let days = days else { return "" }
        return String(max(days, 0))
    }

    var unit: String {
        guard let days = days else { return "" }
        return entry.moment.unit(max(days, 0))
    }

    var body: some View {
        LockRing(progress: progress, center: VStack(spacing: 1) {
            if days == nil {
                Cross(size: 16, weight: 2.4)
            } else {
                Text(number)
                    .font(.system(size: 20, weight: .bold).monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(unit)
                    .font(.system(size: 8.5, weight: .bold))
                    .textCase(.uppercase)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .opacity(0.85)
            }
        })
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(number + " " + unit))
    }
}

/// The verse under its reference.
struct LockVerse: View {
    let moment: Moment

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Cross(size: 10, weight: 2.6)
                Text(moment.verse?.ref ?? "")
                    .font(.system(size: 11, weight: .bold))
                    .textCase(.uppercase)
                    .lineLimit(1)
            }
            .opacity(0.85)
            Text(moment.verse?.text ?? moment.openToRefresh)
                .font(.system(size: 13, weight: .medium))
                .lineLimit(3)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }
}

/// Today in the Church: the saint, and the week with its fast days filled in
/// and today ringed.
struct LockSaint: View {
    let moment: Moment

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(moment.words.text("todayInTheChurch", "Today in the Church"))
                .font(.system(size: 10.5, weight: .bold))
                .textCase(.uppercase)
                .lineLimit(1)
                .opacity(0.8)
            Text(moment.day?.saint ?? moment.openToRefresh)
                .font(.system(size: 13.5, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
            HStack(spacing: 5) {
                ForEach(moment.week) { day in
                    LockDot(day: day)
                }
            }
            .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }
}

struct LockDot: View {
    let day: WeekDay

    var body: some View {
        Capsule()
            .fill(day.isFast ? Color.white : Color.white.opacity(0.3))
            .frame(width: 14, height: 4)
            .overlay {
                if day.isToday {
                    Capsule()
                        .stroke(Color.white, lineWidth: 1.5)
                        .padding(-2.5)
                }
            }
    }
}

/// The line beside the date over the clock: the day's fast.
struct LockLine: View {
    let moment: Moment

    var body: some View {
        Text(moment.day == nil ? moment.openToRefresh : moment.fastBadge)
    }
}
