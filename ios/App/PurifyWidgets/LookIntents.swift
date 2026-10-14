import AppIntents
import Foundation
import WidgetKit

// The looks a reader picks in Edit Widget (iOS 17 and newer), one list per
// family with more than one (docs/WIDGETS.md, "The seven families"). Each
// look's raw value is the id the contract and Android use, so a look means
// the same thing on both phones. The names here are English: Edit Widget
// reads them from the extension when it is built, before the app has handed
// over any words, so the app's own language cannot reach this screen.

@available(iOS 17.0, *)
enum VerseLook: String, AppEnum {
    case minimal
    case mosaic

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Look"
    static var caseDisplayRepresentations: [VerseLook: DisplayRepresentation] = [
        .minimal: "Minimal",
        .mosaic: "On Mosaic art",
    ]
}

@available(iOS 17.0, *)
enum TodayLook: String, AppEnum {
    case day
    case week
    case rotating

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Look"
    static var caseDisplayRepresentations: [TodayLook: DisplayRepresentation] = [
        .day: "Saint and fast",
        .week: "The week",
        .rotating: "Rotating",
    ]
}

@available(iOS 17.0, *)
enum StreakLook: String, AppEnum {
    case number
    case ring

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Look"
    static var caseDisplayRepresentations: [StreakLook: DisplayRepresentation] = [
        .number: "Number",
        .ring: "Ring",
    ]
}

@available(iOS 17.0, *)
enum CountdownLook: String, AppEnum {
    case fast
    case feast
    case update

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Look"
    static var caseDisplayRepresentations: [CountdownLook: DisplayRepresentation] = [
        .fast: "Next fast",
        .feast: "Next feast",
        .update: "Next Purify update",
    ]
}

@available(iOS 17.0, *)
enum MosaicLook: String, AppEnum {
    case season
    case cross
    case lampada

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Look"
    static var caseDisplayRepresentations: [MosaicLook: DisplayRepresentation] = [
        .season: "The season",
        .cross: "The cross",
        .lampada: "The lampada",
    ]
}

// MARK: - The configurations

@available(iOS 17.0, *)
struct VerseLookIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose a look"

    @Parameter(title: "Look", default: .minimal)
    var look: VerseLook
}

@available(iOS 17.0, *)
struct TodayLookIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose a look"

    @Parameter(title: "Look", default: .day)
    var look: TodayLook
}

@available(iOS 17.0, *)
struct StreakLookIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose a look"

    @Parameter(title: "Look", default: .number)
    var look: StreakLook
}

@available(iOS 17.0, *)
struct CountdownLookIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose a look"

    @Parameter(title: "Look", default: .fast)
    var look: CountdownLook
}

@available(iOS 17.0, *)
struct MosaicLookIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose a look"

    @Parameter(title: "Look", default: .season)
    var look: MosaicLook
}

// MARK: - The providers

// Each hands its look to the same timelines LookProvider uses, so a widget
// draws the same way whichever iOS chose its look.

@available(iOS 17.0, *)
struct VerseLookProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> PurifyEntry {
        Timelines.entry(.verse, look: VerseLook.minimal.rawValue, at: Date(), in: context)
    }

    func snapshot(for configuration: VerseLookIntent, in context: Context) async -> PurifyEntry {
        Timelines.entry(.verse, look: configuration.look.rawValue, at: Date(), in: context)
    }

    func timeline(for configuration: VerseLookIntent, in context: Context) async -> Timeline<PurifyEntry> {
        Timelines.timeline(.verse, look: configuration.look.rawValue, in: context)
    }
}

@available(iOS 17.0, *)
struct TodayLookProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> PurifyEntry {
        Timelines.entry(.today, look: TodayLook.day.rawValue, at: Date(), in: context)
    }

    func snapshot(for configuration: TodayLookIntent, in context: Context) async -> PurifyEntry {
        Timelines.entry(.today, look: configuration.look.rawValue, at: Date(), in: context)
    }

    func timeline(for configuration: TodayLookIntent, in context: Context) async -> Timeline<PurifyEntry> {
        Timelines.timeline(.today, look: configuration.look.rawValue, in: context)
    }
}

@available(iOS 17.0, *)
struct StreakLookProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> PurifyEntry {
        Timelines.entry(.streak, look: StreakLook.number.rawValue, at: Date(), in: context)
    }

    func snapshot(for configuration: StreakLookIntent, in context: Context) async -> PurifyEntry {
        Timelines.entry(.streak, look: configuration.look.rawValue, at: Date(), in: context)
    }

    func timeline(for configuration: StreakLookIntent, in context: Context) async -> Timeline<PurifyEntry> {
        Timelines.timeline(.streak, look: configuration.look.rawValue, in: context)
    }
}

@available(iOS 17.0, *)
struct CountdownLookProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> PurifyEntry {
        Timelines.entry(.countdown, look: CountdownLook.fast.rawValue, at: Date(), in: context)
    }

    func snapshot(for configuration: CountdownLookIntent, in context: Context) async -> PurifyEntry {
        Timelines.entry(.countdown, look: configuration.look.rawValue, at: Date(), in: context)
    }

    func timeline(for configuration: CountdownLookIntent, in context: Context) async -> Timeline<PurifyEntry> {
        Timelines.timeline(.countdown, look: configuration.look.rawValue, in: context)
    }
}

@available(iOS 17.0, *)
struct MosaicLookProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> PurifyEntry {
        Timelines.entry(.mosaic, look: MosaicLook.season.rawValue, at: Date(), in: context)
    }

    func snapshot(for configuration: MosaicLookIntent, in context: Context) async -> PurifyEntry {
        Timelines.entry(.mosaic, look: configuration.look.rawValue, at: Date(), in: context)
    }

    func timeline(for configuration: MosaicLookIntent, in context: Context) async -> Timeline<PurifyEntry> {
        Timelines.timeline(.mosaic, look: configuration.look.rawValue, in: context)
    }
}
