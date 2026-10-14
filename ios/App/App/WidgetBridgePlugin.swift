import Capacitor
import Foundation
import WidgetKit

/// How the app hands the home screen widgets what only it knows: the reader's
/// calendar, their streak, the prayers they kept, their patron saint, the next
/// update, and every word in their language (docs/WIDGETS.md, section 2).
///
/// One method, update({ entries }), the same name and shape as on Android
/// (android/.../widget/WidgetBridgePlugin.java). It keeps only the six keys of
/// the contract and drops anything else, so nothing the page sends can grow
/// into a store of its own here. The values go to the App Group the widget
/// extension (ios/App/PurifyWidgets) reads, then every placed widget is asked
/// to draw again. The app's side is lib/widget/bridge.ts, which sends a key
/// only when its value changed.
///
/// Registered by PurifyBridgeViewController: a plugin that lives in the app
/// rather than in a package is not on the list `npx cap sync` writes.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    /// Shared with the widget extension; both targets' entitlements carry it.
    static let appGroup = "group.net.purifyapp.purify"

    static let keys: Set<String> = ["calendarStyle", "labels", "streak", "prayed", "patron", "update"]

    @objc func update(_ call: CAPPluginCall) {
        guard let shared = UserDefaults(suiteName: WidgetBridgePlugin.appGroup) else {
            call.reject("The widgets' App Group is not available.")
            return
        }
        let entries = call.getObject("entries") ?? [:]
        var stored = 0
        for (key, value) in entries where WidgetBridgePlugin.keys.contains(key) {
            if let text = value as? String {
                shared.set(text, forKey: key)
                stored += 1
            } else if value is NSNull {
                // A value the app no longer has (a patron saint cleared) goes too.
                shared.removeObject(forKey: key)
                stored += 1
            }
        }
        if stored > 0 {
            DispatchQueue.main.async {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
        call.resolve(["stored": stored])
    }
}
