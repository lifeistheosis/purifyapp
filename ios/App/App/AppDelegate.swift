import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        //
        // A tap on a home screen or lock screen widget arrives here too: its
        // widgetURL is a net.purifyapp.purify://widget/... address
        // (docs/WIDGETS.md, section 3), and like a shortcut it goes on to the
        // web layer as "appUrlOpen". WidgetKit always opens a widget's own
        // app with that address, registered scheme or not, so the scheme
        // stays unregistered for the reason in lib/shortcuts/shortcuts.ts:
        // nothing outside the app can send one.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Home Screen quick actions
    // The app icon's shortcuts, declared in Info.plist
    // (UIApplicationShortcutItems). Each one's type is the address it stands
    // for, so it is handed to Capacitor exactly as an opened URL is: the App
    // plugin tells the web layer ("appUrlOpen", kept until it is listening)
    // and remembers it for getLaunchUrl, which is how a shortcut that started
    // the app is found. components/native/ShortcutListener.tsx turns the
    // address into a screen.
    //
    // didFinishLaunchingWithOptions returns true, so iOS calls this for a
    // shortcut that launched the app as well as for one tapped while it was
    // open. The app has no scene delegate; if it ever gets one, this moves to
    // windowScene(_:performActionFor:completionHandler:), because iOS stops
    // calling it here.

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        guard let url = URL(string: shortcutItem.type) else {
            completionHandler(false)
            return
        }
        completionHandler(ApplicationDelegateProxy.shared.application(application, open: url, options: [:]))
    }

    // MARK: - Remote notifications (APNs)
    // Required for @capacitor/push-notifications: forward the system APNs
    // callbacks to Capacitor, which converts the device token into the
    // JS "registration" event the web layer (lib/push/native.ts) listens for.

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
