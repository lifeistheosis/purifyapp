import Capacitor
import UIKit

/// The app's web view as Capacitor makes it, plus the plugins written inside
/// this app. Main.storyboard names this class in place of
/// CAPBridgeViewController.
///
/// Capacitor registers packaged plugins by itself, from the class list
/// `npx cap sync` writes into capacitor.config.json. A plugin that lives in
/// the app is not on that list, so it is registered here, in
/// capacitorDidLoad, which runs before the page loads: a plugin registered
/// later would be missing from the page's first run.
class PurifyBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        // Home screen widgets: docs/WIDGETS.md, section 2.
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
