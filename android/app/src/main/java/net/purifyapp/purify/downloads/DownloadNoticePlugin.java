package net.purifyapp.purify.downloads;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import net.purifyapp.purify.R;

/**
 * A download in the notification bar (1.9, build 95 note 23; the owner, 2026-11-13:
 * "whenever you are downloading something it should show up on your
 * notification bar"). The app's side is lib/downloads/notice.ts, which says
 * what each download is doing in the reader's own words.
 *
 * One notification for each download, on a channel of its own, "Downloads":
 * low importance, so it never sounds, never drops over what the reader is
 * doing, and puts no badge on the icon (CONTRIBUTING: no badge, no unread
 * count). While it runs, a progress bar and the words of how far it has come;
 * when it ends, the words of its end, and a tap opens Purify.
 *
 * No foreground service, so no store declaration: the download is the app's
 * own, and runs while the app does. A running notice the app stops refreshing
 * (the app paused in the background, or closed) clears itself after
 * STALE_MS, and one left by an app that was closed is cleared when the app
 * starts again (load), so no notice stands at a number nobody is moving.
 *
 * Nothing is posted without the reader's leave: on Android 13 and later that
 * is POST_NOTIFICATIONS, which the manifest already declares for the reminders.
 *
 * Registered in MainActivity, as the widgets' bridge is. Capacitor's own keep
 * rules keep it and its methods under R8 (android/app/proguard-rules.pro).
 */
@CapacitorPlugin(name = "DownloadNotice")
public class DownloadNoticePlugin extends Plugin {

    /** The channel, made once; a reader's own setting for it always wins. */
    public static final String CHANNEL = "purify-downloads";

    /** Every download's notice carries this tag, apart from the reminders' notifications. */
    static final String TAG = "purify-download";

    /** Set on a notice while its download runs or waits. */
    static final String RUNNING = "net.purifyapp.purify.download.running";

    /** A running notice nobody has refreshed for this long is stale (the app refreshes it every minute). */
    static final long STALE_MS = 150_000L;

    @Override
    public void load() {
        createChannel(getContext());
        clearLeftRunning(getContext());
    }

    @PluginMethod
    public void post(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("A download's notice needs its id.");
            return;
        }
        Context context = getContext();
        if (!mayPost(context)) {
            // No leave from the reader: the bell's sheet in the app still shows it.
            call.resolve();
            return;
        }
        String state = call.getString("state", "running");
        boolean running = "running".equals(state);
        boolean waiting = "waiting".equals(state);
        double share = call.getDouble("share", 0.0);
        int percent = (int) Math.round(Math.max(0.0, Math.min(1.0, share)) * 100.0);

        NotificationCompat.Builder notice = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_purify)
            .setContentTitle(call.getString("title", ""))
            .setContentText(call.getString("text", ""))
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openPurify(context));

        if (running || waiting) {
            Bundle extras = new Bundle();
            extras.putBoolean(RUNNING, true);
            notice
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setProgress(100, percent, false)
                .setShowWhen(false)
                // Running, it stays until it ends; waiting for Wi-Fi or a signal, the reader may swipe it away.
                .setOngoing(running)
                .setAutoCancel(false)
                .addExtras(extras);
            if (running) notice.setTimeoutAfter(STALE_MS);
        } else {
            notice
                .setCategory("failed".equals(state) ? NotificationCompat.CATEGORY_ERROR : NotificationCompat.CATEGORY_STATUS)
                .setProgress(0, 0, false)
                .setShowWhen(true)
                .setOngoing(false)
                .setAutoCancel(true);
        }
        NotificationManagerCompat.from(context).notify(TAG, id, notice.build());
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        Integer id = call.getInt("id");
        if (id != null) NotificationManagerCompat.from(getContext()).cancel(TAG, id);
        call.resolve();
    }

    /** The reader's leave to post: always before Android 13, POST_NOTIFICATIONS from it, and the app's notifications not turned off. */
    private static boolean mayPost(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    /** A tap opens Purify where the reader left it. */
    private static PendingIntent openPurify(Context context) {
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open == null) open = new Intent();
        open.setPackage(context.getPackageName());
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        return PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The "Downloads" channel: low, silent, no badge. Making a channel that exists changes nothing. */
    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL,
            context.getString(R.string.download_channel_name),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(context.getString(R.string.download_channel_description));
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    /** A running notice left by an app that was closed: its download stopped with it. */
    private static void clearLeftRunning(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        try {
            for (StatusBarNotification shown : manager.getActiveNotifications()) {
                if (TAG.equals(shown.getTag()) && shown.getNotification().extras.getBoolean(RUNNING, false)) {
                    manager.cancel(TAG, shown.getId());
                }
            }
        } catch (RuntimeException ignored) {
            // The phone would not say what it shows: the stale timeout clears them instead.
        }
    }
}
