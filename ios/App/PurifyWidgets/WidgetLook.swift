import ImageIO
import SwiftUI
import UIKit
import WidgetKit

/// The Night look, the owner's pick on the approved mock (2026-10-10): a
/// near-black card and paper text. Every colour is that look's own token in
/// the mock (Homebase/boards/purify-master/widgets/widgets.html, .look-night).
/// Red is only for the streak and the update countdown's last days; nothing
/// here is gold or yellow. The serif is the system's own, since Lora is not
/// bundled with the extension.
enum Look {
    static func rgb(_ red: Double, _ green: Double, _ blue: Double) -> Color {
        Color(red: red / 255, green: green / 255, blue: blue / 255)
    }

    /// --w-ink and its two softer steps.
    static let paper = rgb(243, 241, 236)
    static let paper2 = rgb(243, 241, 236).opacity(0.66)
    static let paper3 = rgb(243, 241, 236).opacity(0.42)
    /// --w-gold in the Night look, which is a pale grey.
    static let eyebrow = rgb(207, 207, 211)
    /// A fast day's chip.
    static let fastInk = rgb(244, 244, 245)
    static let fastEdge = rgb(207, 207, 211).opacity(0.45)
    static let chip = Color.white.opacity(0.07)
    static let edge = Color.white.opacity(0.10)
    static let dot = Color.white.opacity(0.16)
    static let red = rgb(226, 87, 76)
    static let ember = rgb(240, 138, 75)
    /// The round button and today's circle, and what is written on them.
    static let button = rgb(234, 234, 236)
    static let onButton = rgb(16, 16, 19)

    /// The card, 160 degrees from #27272c through #17171a to #0f0f12.
    static let card = LinearGradient(
        gradient: Gradient(stops: [
            Gradient.Stop(color: rgb(39, 39, 44), location: 0),
            Gradient.Stop(color: rgb(23, 23, 26), location: 0.55),
            Gradient.Stop(color: rgb(15, 15, 18), location: 1),
        ]),
        startPoint: UnitPoint(x: 0.33, y: 0),
        endPoint: UnitPoint(x: 0.67, y: 1)
    )

    /// The update countdown's card on the day itself.
    static let outCard = LinearGradient(
        gradient: Gradient(colors: [rgb(200, 71, 60), rgb(143, 36, 28)]),
        startPoint: UnitPoint(x: 0.33, y: 0),
        endPoint: UnitPoint(x: 0.67, y: 1)
    )

    /// The streak's week, red into ember.
    static let streak = LinearGradient(
        gradient: Gradient(colors: [rgb(226, 87, 76), rgb(240, 138, 75)]),
        startPoint: .leading,
        endPoint: .trailing
    )

    static func serif(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        Font.system(size: size, weight: weight, design: .serif)
    }

    static func sans(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        Font.system(size: size, weight: weight, design: .default)
    }

    /// The mock's padding for each size.
    static func insets(_ size: WidgetFamily) -> EdgeInsets {
        switch size {
        case .systemSmall:
            return EdgeInsets(top: 15, leading: 15, bottom: 15, trailing: 15)
        case .systemMedium:
            return EdgeInsets(top: 16, leading: 18, bottom: 16, trailing: 18)
        default:
            return EdgeInsets(top: 20, leading: 20, bottom: 20, trailing: 20)
        }
    }

    /// Words set over Mosaic art sit closer to the edge, as in the mock.
    static let artInsets = EdgeInsets(top: 13, leading: 14, bottom: 13, trailing: 14)

    /// Paper warming to red as the update nears: 0 far off, 1 on the day.
    static func heat(_ amount: Double) -> Color {
        let t: Double = min(1, max(0, amount))
        // From paper (243, 241, 236) to red (226, 87, 76).
        let red: Double = 243 - 17 * t
        let green: Double = 241 - 154 * t
        let blue: Double = 236 - 160 * t
        return rgb(red, green, blue)
    }
}

// MARK: - The card

extension View {
    /// A home screen widget's card: the mock's own padding and the background
    /// behind it. iOS 17 and newer take the background through
    /// containerBackground (without it a widget shows Apple's "adopt
    /// containerBackground" notice), and the system margins are switched off
    /// in PurifyWidgets.swift so the padding is the mock's on every iOS.
    @ViewBuilder
    func card<Background: View>(_ insets: EdgeInsets, @ViewBuilder background: () -> Background) -> some View {
        let ground = background()
        if #available(iOS 17.0, *) {
            self
                .padding(insets)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .containerBackground(for: .widget) {
                    ground
                }
        } else {
            self
                .padding(insets)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .background {
                    ground
                }
        }
    }

    /// A lock screen widget's ground: the system's own glass, as the mock
    /// draws them, and nothing behind a line of text.
    @ViewBuilder
    func lockGround(_ size: WidgetFamily) -> some View {
        if #available(iOS 17.0, *) {
            if size == .accessoryInline {
                self.containerBackground(for: .widget) {
                    Color.clear
                }
            } else {
                self.containerBackground(for: .widget) {
                    AccessoryWidgetBackground()
                }
            }
        } else {
            if size == .accessoryInline {
                self
            } else {
                ZStack {
                    AccessoryWidgetBackground()
                    self
                }
            }
        }
    }

    /// Words over Mosaic art carry a soft shadow, as in the mock.
    func artShadow() -> some View {
        shadow(color: Color.black.opacity(0.65), radius: 4, x: 0, y: 1)
    }
}

// MARK: - Pieces every family draws with

/// The three-bar cross of the mock's mark, on its 24-point grid.
struct CrossShape: Shape {
    func path(in rect: CGRect) -> Path {
        let unit = min(rect.width, rect.height) / 24
        let left = rect.midX - 12 * unit
        let top = rect.midY - 12 * unit
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: left + x * unit, y: top + y * unit)
        }
        var path = Path()
        path.move(to: point(12, 2.5))
        path.addLine(to: point(12, 21.5))
        path.move(to: point(8.5, 6))
        path.addLine(to: point(15.5, 6))
        path.move(to: point(5.5, 9.5))
        path.addLine(to: point(18.5, 9.5))
        path.move(to: point(8, 16.5))
        path.addLine(to: point(16, 14))
        return path
    }
}

/// The cross mark, drawn in the current foreground style.
struct Cross: View {
    var size: CGFloat = 14
    /// Stroke width on the 24-point grid; the mock's mark uses 2.
    var weight: CGFloat = 2

    var body: some View {
        CrossShape()
            .stroke(style: StrokeStyle(lineWidth: weight * size / 24, lineCap: .round, lineJoin: .round))
            .frame(width: size, height: size)
    }
}

/// The small capitals over a widget's content: "TODAY IN THE CHURCH".
struct Eyebrow: View {
    let text: String
    var cross = false
    var color: Color = Look.eyebrow

    var body: some View {
        HStack(spacing: 6) {
            if cross {
                Cross(size: 10, weight: 2.2)
                    .foregroundStyle(color)
            }
            Text(text)
                .font(Look.sans(11, .bold))
                .tracking(1.3)
                .textCase(.uppercase)
                .foregroundStyle(color)
                .lineLimit(1)
        }
    }
}

/// The fast's chip. On a fast day it stands out, as the mock draws it.
struct FastChip: View {
    let text: String
    let standsOut: Bool

    var body: some View {
        Text(text)
            .font(Look.sans(10.5, .bold))
            .tracking(0.6)
            .textCase(.uppercase)
            .lineLimit(1)
            .foregroundStyle(standsOut ? Look.fastInk : Look.paper2)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(Look.chip, in: Capsule())
            .overlay {
                Capsule().strokeBorder(standsOut ? Look.fastEdge : Look.edge, lineWidth: 1)
            }
    }
}

/// The verse's reference after a short rule, in small capitals: LUKE 5:32.
struct RefLine: View {
    let ref: String
    var color: Color = Look.paper2

    var body: some View {
        HStack(spacing: 8) {
            Rectangle()
                .fill(color.opacity(0.65))
                .frame(width: 16, height: 1)
            Text(ref)
                .font(Look.sans(11, .bold))
                .tracking(1.5)
                .textCase(.uppercase)
                .foregroundStyle(color)
                .lineLimit(1)
        }
    }
}

/// The label a machine-translated verse carries under its reference
/// (TEMPORARY, lib/today/machineVerse.ts): "Makine çevirisi".
struct VerseNote: View {
    let note: String
    var color: Color = Look.paper3

    var body: some View {
        Text(note)
            .font(Look.sans(10, .medium))
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }
}

/// A widget with nothing true to show yet: one plain line, never a blank card.
struct MessageFace: View {
    let text: String
    let size: WidgetFamily

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Cross(size: 13)
                .foregroundStyle(Look.paper3)
            Text(text)
                .font(Look.sans(size == .systemSmall ? 13 : 15, .medium))
                .foregroundStyle(Look.paper2)
                .lineLimit(4)
            Spacer(minLength: 0)
        }
        .card(Look.insets(size)) {
            Look.card
        }
    }
}

// MARK: - Mosaic art

/// One of the Mosaic pictures behind a widget, or the plain card and a cross
/// when the picture is not in the build.
struct ArtBackground: View {
    let paint: String
    let wide: Bool
    let size: CGSize
    /// The quiet look Pray now wears once the rule is prayed.
    var quiet = false
    @Environment(\.displayScale) var displayScale

    var body: some View {
        if let picture = MosaicArt.picture(paint, wide: wide, size: size, scale: displayScale) {
            Image(uiImage: picture)
                .resizable()
                .scaledToFill()
                .saturation(quiet ? 0.35 : 1)
                .overlay {
                    Color.black.opacity(quiet ? 0.3 : 0)
                }
        } else {
            ZStack {
                Look.card
                Cross(size: 46, weight: 1.4)
                    .foregroundStyle(Look.paper3)
            }
        }
    }
}

/// The Mosaic pack, as baked for Android by scripts/emit-widget-art.mjs and
/// copied into this extension's asset catalog by scripts/ios-widget-assets.mjs:
/// one data set per picture, "mosaic_<paint>_<square|wide>", WebP inside. The
/// phone shows the picture; it never runs the art engine.
enum MosaicArt {
    static let cache = NSCache<NSString, UIImage>()

    /// The picture for a season in the day table. The Dormition wears the
    /// Theotokos mosaic, as in the mock.
    static func paint(forSeason theme: String?) -> String? {
        switch theme ?? "" {
        case "pascha": return "pascha"
        case "nativity": return "nativity"
        case "theophany": return "theophany"
        case "dormition": return "theotokos"
        case "lent": return "lent"
        default: return nil
        }
    }

    /// The picture cut to fill `size` (points) at the screen's scale.
    ///
    /// WidgetKit refuses to draw a widget whose picture holds more pixels than
    /// the widget does ("Widget archival failed due to image being too
    /// large"), and the whole widget goes blank. So the picture is decoded
    /// once, cut to the widget's own shape and drawn a little under its pixel
    /// size, never handed over at the size it was baked.
    static func picture(_ paint: String, wide: Bool, size: CGSize, scale: CGFloat) -> UIImage? {
        let name = "mosaic_" + paint + (wide ? "_wide" : "_square")
        let fit: CGFloat = 0.9
        let width = Int((size.width * scale * fit).rounded())
        let height = Int((size.height * scale * fit).rounded())
        guard width > 0, height > 0 else { return nil }

        let key = "\(name)-\(width)x\(height)" as NSString
        if let cached = cache.object(forKey: key) {
            return cached
        }
        guard let data = NSDataAsset(name: name)?.data,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let full = CGImageSourceCreateImageAtIndex(source, 0, nil),
              let context = CGContext(
                  data: nil,
                  width: width,
                  height: height,
                  bitsPerComponent: 8,
                  bytesPerRow: 0,
                  space: CGColorSpaceCreateDeviceRGB(),
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              )
        else { return nil }

        let sourceWidth = CGFloat(full.width)
        let sourceHeight = CGFloat(full.height)
        guard sourceWidth > 0, sourceHeight > 0 else { return nil }
        let fill = max(CGFloat(width) / sourceWidth, CGFloat(height) / sourceHeight)
        let drawWidth = sourceWidth * fill
        let drawHeight = sourceHeight * fill
        let frame = CGRect(
            x: (CGFloat(width) - drawWidth) / 2,
            y: (CGFloat(height) - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight
        )
        context.interpolationQuality = .high
        context.draw(full, in: frame)
        guard let cut = context.makeImage() else { return nil }

        let picture = UIImage(cgImage: cut, scale: scale * fit, orientation: .up)
        cache.setObject(picture, forKey: key)
        return picture
    }
}

/// A patron saint's icon, from the app's own bundle, where the web bundle
/// keeps it ("public/..."). The app sends a path only for an icon whose
/// rights are cleared; without one, or when it cannot be read, the widget
/// shows its text version, as docs/WIDGETS.md asks.
enum SaintIcon {
    static func picture(_ path: String?, box: CGSize, scale: CGFloat) -> UIImage? {
        guard let path = path,
              path.hasPrefix("public/"),
              !path.contains(".."),
              box.width > 0,
              box.height > 0
        else { return nil }
        // PurifyWidgets.appex sits in App.app/PlugIns.
        let app = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent()
        let url = app.appendingPathComponent(path)
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        // Decoded straight to the size it is shown at, for the same reason
        // as the Mosaic pictures above.
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: max(box.width, box.height) * scale,
        ]
        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        return UIImage(cgImage: thumbnail, scale: scale, orientation: .up)
    }
}
