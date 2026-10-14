import SwiftUI
import WidgetKit

/// Purify's home screen and lock screen widgets: the seven families of
/// docs/WIDGETS.md, each one entry in the widget gallery, in the Night look of
/// the approved mock. The lock screen widgets (iOS 16 and newer) belong to
/// the families they show: the streak ring to Streak, the verse to Verse, the
/// days to the next fast to What is coming, the saint and the fast to Today.
@main
struct PurifyWidgetBundle: WidgetBundle {
    var body: some Widget {
        VerseWidget()
        TodayWidget()
        PrayNowWidget()
        StreakWidget()
        CountdownWidget()
        MySaintWidget()
        MosaicWidget()
    }
}

// A family's looks are picked in Edit Widget on iOS 17 and newer, through an
// App Intent configuration (LookIntents.swift). iOS 16 has nothing of the
// kind for these widgets, so there each wears its first look. Returning a
// different configuration under `if #available` is Swift's own provision for
// exactly this case (SE-0360), and both carry the same kind, so a widget
// placed on iOS 16 keeps its place after the phone moves to iOS 17.
//
// contentMarginsDisabled: from iOS 17 the system pads every widget by itself.
// The mock's own padding is applied instead (WidgetLook.swift, card), so a
// widget looks the same on every iOS.

struct VerseWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: PurifyFamily.verse.kind,
                intent: VerseLookIntent.self,
                provider: VerseLookProvider()
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("Verse of the Day")
            .description("The day's verse, the same one the Today screen shows.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.verse.kind,
            provider: LookProvider(family: .verse, look: PurifyFamily.verse.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("Verse of the Day")
        .description("The day's verse, the same one the Today screen shows.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: PurifyFamily.today.kind,
                intent: TodayLookIntent.self,
                provider: TodayLookProvider()
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("Today in the Church")
            .description("The day's saint and fast, in your calendar.")
            .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.today.kind,
            provider: LookProvider(family: .today, look: PurifyFamily.today.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("Today in the Church")
        .description("The day's saint and fast, in your calendar.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

struct PrayNowWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return StaticConfiguration(
                kind: PurifyFamily.pray.kind,
                provider: LookProvider(family: .pray, look: PurifyFamily.pray.firstLook)
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("Pray now")
            .description("Morning prayers until 5 pm, Evening prayers after.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.pray.kind,
            provider: LookProvider(family: .pray, look: PurifyFamily.pray.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("Pray now")
        .description("Morning prayers until 5 pm, Evening prayers after.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct StreakWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: PurifyFamily.streak.kind,
                intent: StreakLookIntent.self,
                provider: StreakLookProvider()
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("Streak")
            .description("Your streak and this week.")
            .supportedFamilies([.systemSmall, .accessoryCircular])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.streak.kind,
            provider: LookProvider(family: .streak, look: PurifyFamily.streak.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak")
        .description("Your streak and this week.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

struct CountdownWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: PurifyFamily.countdown.kind,
                intent: CountdownLookIntent.self,
                provider: CountdownLookProvider()
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("What is coming")
            .description("The days to the next fast, great feast or Purify update.")
            .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.countdown.kind,
            provider: LookProvider(family: .countdown, look: PurifyFamily.countdown.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("What is coming")
        .description("The days to the next fast, great feast or Purify update.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}

struct MySaintWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return StaticConfiguration(
                kind: PurifyFamily.saint.kind,
                provider: LookProvider(family: .saint, look: PurifyFamily.saint.firstLook)
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("My saint")
            .description("Your patron saint and your name day.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.saint.kind,
            provider: LookProvider(family: .saint, look: PurifyFamily.saint.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("My saint")
        .description("Your patron saint and your name day.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct MosaicWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return AppIntentConfiguration(
                kind: PurifyFamily.mosaic.kind,
                intent: MosaicLookIntent.self,
                provider: MosaicLookProvider()
            ) { entry in
                PurifyWidgetView(entry: entry)
            }
            .configurationDisplayName("Mosaic")
            .description("The season's mosaic, the cross or the lampada.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
        }
        return StaticConfiguration(
            kind: PurifyFamily.mosaic.kind,
            provider: LookProvider(family: .mosaic, look: PurifyFamily.mosaic.firstLook)
        ) { entry in
            PurifyWidgetView(entry: entry)
        }
        .configurationDisplayName("Mosaic")
        .description("The season's mosaic, the cross or the lampada.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
