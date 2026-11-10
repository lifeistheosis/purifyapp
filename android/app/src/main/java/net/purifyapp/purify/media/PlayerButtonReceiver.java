package net.purifyapp.purify.media;

import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * The phone's media buttons (headphones, a car, and on Android 12 and older
 * the buttons of Purify's own notification), handed to Purify's player only
 * while it runs (1.9, docs/audit/findings.yaml F-51).
 *
 * The media-session plugin (@capgo/capacitor-media-session) brings androidx's
 * MediaButtonReceiver, which starts the plugin's MediaSessionService with
 * startForegroundService for every button. The service then has seconds to
 * call startForeground, and calls it only when the app binds it, as the app
 * does while something plays or is paused. Once the player has run, Android
 * sends a button pressed after it has gone (play on headphones the next
 * morning, a car that presses play when it connects) to the receiver of the
 * last app that played; the service would start with no player behind it,
 * and Android would stop the app for it, as a crash, mostly unseen.
 *
 * This receiver takes androidx's place (AndroidManifest.xml removes that one,
 * so the plugin's session and its notification find this one). A button
 * while the player's service runs in the foreground goes to it as androidx's
 * receiver sends it; any other is let go, since there is nothing to play,
 * pause or move. lib/player/__tests__/lockScreen.test.ts holds the names.
 */
public class PlayerButtonReceiver extends BroadcastReceiver {

    /** The plugin's service, which hands a button to the player (MediaSessionService.onStartCommand). */
    static final String PLAYER_SERVICE = "com.capgo.mediasession.MediaSessionService";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) return;
        if (!playerRuns(context)) return;
        Intent toPlayer = new Intent(intent);
        toPlayer.setComponent(new ComponentName(context, PLAYER_SERVICE));
        // Already in the foreground, so this asks nothing new of the service.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(toPlayer);
        } else {
            context.startService(toPlayer);
        }
    }

    /** Whether the player's service runs in the foreground: the only time a button has a player to reach. */
    @SuppressWarnings("deprecation")
    static boolean playerRuns(Context context) {
        ActivityManager manager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) return false;
        // Closed to other apps' services since Android 8, it still lists the app's own (Android's reference).
        for (ActivityManager.RunningServiceInfo info : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (info.service != null && PLAYER_SERVICE.equals(info.service.getClassName()) && info.foreground) {
                return true;
            }
        }
        return false;
    }
}
