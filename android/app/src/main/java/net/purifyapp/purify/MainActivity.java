package net.purifyapp.purify;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

import net.purifyapp.purify.widget.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // An app icon shortcut is for the launch it started, and no later one.
        // Android keeps the intent an activity was started with and hands it
        // back whenever it builds the activity again. Capacitor reads that
        // intent each time it comes up, so a reader who began the day from
        // "Morning prayers" would be carried back there at every such return.
        // There are two ways back, and each leaves its own mark:
        //   - the app was cleared from memory in the background and is
        //     rebuilt: there is a saved state;
        //   - the phone was restarted, or the app had crashed, and the reader
        //     opens it from the recent apps list: there is no saved state,
        //     but Android marks the intent as launched from history.
        // A fresh tap has neither: ShortcutActivity writes a new intent every
        // time. Before super.onCreate, which is where Capacitor reads it.
        Intent launch = getIntent();
        if (launch != null && ShortcutActivity.isShortcut(launch.getData())) {
            boolean fromRecents = (launch.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
            if (savedInstanceState != null || fromRecents) {
                launch.setData(null);
            }
        }
        // The app's own plugin for the home screen widgets: registered before
        // the bridge starts, as Capacitor asks of a plugin that lives in the app.
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        holdPortraitOnPhones(getResources().getConfiguration());
        // Required by @capacitor-community/safe-area so the system reports
        // correct safe-area insets under Android's forced edge-to-edge mode.
        EdgeToEdge.enable(this);
        // Paint the window background the app's night color. Under edge-to-edge,
        // when the soft keyboard opens the webview is resized above it; the area
        // it no longer covers falls back to the window background, which is a
        // default grey and showed as a large grey box on the sign-in form.
        // Matching it to #101013 makes that gap blend into the app.
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#101013")));
        // No scroll bar at the screen's edge (the owner, 2026-10-30): the app
        // shows where a reader is with its own marks, and the web view's bar
        // read as a website's. The page's own bars are hidden in app/globals.css.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setVerticalScrollBarEnabled(false);
            getBridge().getWebView().setHorizontalScrollBarEnabled(false);
        }
        createPushChannel();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // The activity handles its own size changes (configChanges in the
        // manifest), so a foldable opening or closing lands here, not in
        // onCreate.
        holdPortraitOnPhones(newConfig);
    }

    /**
     * A phone stays upright; a tablet or an unfolded foldable turns freely.
     *
     * Play, 2026-10-18: "Remove resizability and orientation restrictions in
     * your app to support large screen devices. From Android 16, Android will
     * ignore resizability and orientation restrictions for large screen
     * devices, such as foldables and tablets." So the manifest no longer pins
     * portrait. The app's phone layout is made upright, so a phone is held
     * that way here. A screen 600 dp or more on its short side may turn, and
     * what it shows is the tablet layout the walk already checks in
     * landscape, 1133 x 744 to 1366 x 1024.
     */
    private void holdPortraitOnPhones(Configuration config) {
        boolean phone = config.smallestScreenWidthDp < 600;
        int wanted = phone ? ActivityInfo.SCREEN_ORIENTATION_PORTRAIT : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
        if (getRequestedOrientation() != wanted) setRequestedOrientation(wanted);
    }

    /** The channel every push is posted to, from 1.8 (createPushChannel). */
    public static final String PUSH_CHANNEL = "purify-notifications";

    /** The channel before it, made with the launcher badge on: copied from, then deleted. */
    static final String OLD_PUSH_CHANNEL = "purify";

    /**
     * The channel every push is posted to: ANDROID_CHANNEL_ID in
     * lib/push/providers/fcm.ts, and Firebase's default in the manifest.
     * High importance is what lets a push show as a banner. Without a channel
     * of its own, Firebase used its "Miscellaneous" fallback at default
     * importance, where a push is only a small icon in the status bar, and a
     * broadcast Firebase had accepted looked like nothing arrived. Creating a
     * channel that exists changes nothing, and a reader's own setting for it
     * always wins.
     *
     * No badge on the app icon. Android puts a dot on the launcher icon for
     * every notification left unread, and some launchers (Samsung's among
     * them) draw it as a number: an unread count on Purify's own icon, which
     * CONTRIBUTING's fourth clause on reminders forbids ("no badge, no unread
     * count, no red dot") and the bell in the app was built without.
     *
     * WHY A NEW CHANNEL. Android reads the badge setting only when a channel
     * is first made, so the channel every phone already had ("purify") could
     * not lose its badge. This build makes "purify-notifications" without
     * one and retires the old channel, and because deleting a channel throws
     * away what the reader chose for it, it first carries those choices over
     * (copyReadersChoices): how it interrupts, so a channel the reader
     * silenced stays silent and one they blocked stays blocked, its sound, its
     * vibration, its light, what the lock screen shows, and Do Not Disturb.
     * The old channel goes only after the new one exists, and only once: a
     * phone that has the new channel is never copied over again. A push for
     * the old id (a website not yet updated) and an older build that has no
     * new channel both land in the manifest's default, so nothing is lost on
     * either side of the change.
     */
    private void createPushChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            PUSH_CHANNEL,
            getString(R.string.push_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.push_channel_description));
        channel.setShowBadge(false);
        NotificationChannel old = manager.getNotificationChannel(OLD_PUSH_CHANNEL);
        if (old != null && manager.getNotificationChannel(PUSH_CHANNEL) == null) {
            copyReadersChoices(old, channel);
        }
        manager.createNotificationChannel(channel);
        if (old != null) manager.deleteNotificationChannel(OLD_PUSH_CHANNEL);
    }

    /**
     * What the reader chose for the old channel, carried to the new one
     * before it is made (Android takes these only then). Its importance is
     * the reader's own: lowered to silent, or to none for a channel they
     * blocked, it stays so.
     */
    private static void copyReadersChoices(NotificationChannel from, NotificationChannel to) {
        to.setImportance(from.getImportance());
        to.setSound(from.getSound(), from.getAudioAttributes());
        // The pattern before the switch: setting a pattern also sets whether
        // the channel vibrates, and the default pattern reads as none.
        long[] pattern = from.getVibrationPattern();
        if (pattern != null) to.setVibrationPattern(pattern);
        to.enableVibration(from.shouldVibrate());
        to.enableLights(from.shouldShowLights());
        to.setLightColor(from.getLightColor());
        to.setLockscreenVisibility(from.getLockscreenVisibility());
        to.setBypassDnd(from.canBypassDnd());
    }
}
