import Capacitor
import UIKit
import UserNotifications

/// A download's end as a notification (1.9, build 95 note 23; the owner,
/// 2026-11-13: "whenever you are downloading something it should show up on
/// your notification bar"). An iPhone shows no progress there, so a download
/// is told when it ends: done, or failed and why, in the reader's own words
/// (lib/downloads/notice.ts says them). The same name and methods as on
/// Android (android/.../downloads/DownloadNoticePlugin.java): post({ id,
/// title, text, share, state }) and clear({ id }).
///
/// While a download runs, the app asks iOS for the few moments it gives an
/// app that has just been left (a background task), so a download nearly
/// done can finish; iOS pauses it after that, and it goes on when Purify is
/// opened again. No background mode is declared for it.
///
/// While Purify is open, its own list in the bell's sheet already says the
/// download ended, so the notification waits in Notification Center with no
/// banner over the app (willPresent). A push is the push plugin's, as before:
/// this answers only for the app's own notices.
///
/// Nothing is shown without the reader's leave: iOS drops a notification the
/// reader has not allowed.
///
/// Registered by PurifyBridgeViewController, as the widgets' bridge is.
@objc(DownloadNoticePlugin)
public class DownloadNoticePlugin: CAPPlugin, CAPBridgedPlugin, NotificationHandlerProtocol {
    public let identifier = "DownloadNoticePlugin"
    public let jsName = "DownloadNotice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "post", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]

    /// The background task held for each download that runs, by its id.
    private var held: [Int: UIBackgroundTaskIdentifier] = [:]

    override public func load() {
        bridge?.notificationRouter.localNotificationHandler = self
    }

    private static func identifier(_ id: Int) -> String {
        return "purify.download.\(id)"
    }

    @objc func post(_ call: CAPPluginCall) {
        guard let id = call.getInt("id") else {
            call.reject("A download's notice needs its id.")
            return
        }
        let state = call.getString("state") ?? "running"
        if state == "running" || state == "waiting" {
            DispatchQueue.main.async { self.hold(id) }
            call.resolve()
            return
        }
        DispatchQueue.main.async { self.release(id) }
        let content = UNMutableNotificationContent()
        content.title = call.getString("title") ?? ""
        content.body = call.getString("text") ?? ""
        content.threadIdentifier = "purify-downloads"
        let request = UNNotificationRequest(identifier: DownloadNoticePlugin.identifier(id), content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { _ in
            call.resolve()
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        guard let id = call.getInt("id") else {
            call.resolve()
            return
        }
        DispatchQueue.main.async { self.release(id) }
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [DownloadNoticePlugin.identifier(id)])
        call.resolve()
    }

    // MARK: The app's own notices while Purify is open

    public func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
        // Into Notification Center, no banner over the app: the bell's sheet says it here.
        return [.list]
    }

    public func didReceive(response: UNNotificationResponse) {
        // A tap opens Purify where the reader left it; nothing more to do.
    }

    // MARK: The moments iOS gives an app just left

    private func hold(_ id: Int) {
        guard held[id] == nil else { return }
        held[id] = UIApplication.shared.beginBackgroundTask(withName: DownloadNoticePlugin.identifier(id)) { [weak self] in
            self?.release(id)
        }
    }

    private func release(_ id: Int) {
        guard let task = held.removeValue(forKey: id) else { return }
        UIApplication.shared.endBackgroundTask(task)
    }
}
