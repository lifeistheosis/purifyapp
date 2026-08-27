package net.purifyapp.purify;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Locale;

/**
 * The day's commemoration and fast, on the home screen.
 *
 * <p>Asked for twice in the app's own Community tab: "Is it possible for you to
 * add the widget option?" and "IOS Widgets". This is the Android half.
 *
 * <h2>Why it reads a prebaked table</h2>
 *
 * <p>The commemoration and the fast are computed in lib/calendar/orthodox.ts,
 * which is TypeScript running in a WebView. This class cannot call it. Porting
 * the paschalion to Java would give a second implementation of Meeus's
 * algorithm that drifts from the tested one, and the app deliberately keeps one
 * reckoning (lib/calendar/__tests__/oneReckoning.test.ts).
 *
 * <p>So the table is computed once at build time by scripts/emit-widget-data.mjs
 * and lands in the web bundle. NO BRIDGE PLUGIN IS NEEDED ON ANDROID: a widget
 * provider ships inside the same APK as the app, so it can open the asset
 * directly. That is only a problem on iOS, where a WidgetKit extension is a
 * separate binary and needs an App Group.
 *
 * <h2>Both reckonings, no date arithmetic</h2>
 *
 * <p>The table is keyed by civil date and each entry carries the New and the
 * Old Calendar answer, so this class never shifts a date. That is on purpose:
 * putting the 13 day Julian offset in Java and again in Swift is how three
 * copies of it start to disagree.
 *
 * <h2>Why it schedules its own update</h2>
 *
 * <p>updatePeriodMillis in day_widget_info.xml is 0. The system clamps that
 * setting to 30 minutes at best and wakes the app to honour it, which is waste
 * for content that changes once a day. This sets one alarm for the next local
 * midnight instead, so the widget turns over when the day does.
 */
public class DayWidgetProvider extends AppWidgetProvider {

    /** Written by scripts/emit-widget-data.mjs into public/, copied here by cap sync. */
    private static final String ASSET = "public/widget-day-table.json";

    /** Mirrors the reader's choice in the app. See lib/calendar/useCalendarStyleDefault. */
    private static final String PREFS = "PurifyWidget";
    private static final String KEY_STYLE = "calendarStyle";

    private static final String ACTION_MIDNIGHT =
            "net.purifyapp.purify.WIDGET_MIDNIGHT";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context));
        }
        scheduleNextMidnight(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // The midnight alarm, and the two system broadcasts that mean the
        // device's idea of "today" moved without one firing: a timezone change
        // and a manual clock change. Without these a traveller sees yesterday.
        String action = intent.getAction();
        if (ACTION_MIDNIGHT.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_DATE_CHANGED.equals(action)) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                    new ComponentName(context, DayWidgetProvider.class));
            onUpdate(context, manager, ids);
        }
    }

    @Override
    public void onDisabled(Context context) {
        // Last widget removed: stop the alarm rather than waking the device
        // every midnight for something nobody is looking at.
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(midnightIntent(context));
    }

    // ── Rendering ───────────────────────────────────────────────────────

    private RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.day_widget);

        String today = todayKey();
        JSONObject day = lookup(context, today, styleOf(context));

        if (day == null) {
            // The table ran out, or the asset is missing. Say so plainly
            // rather than showing a blank card, which reads as a crash.
            views.setTextViewText(R.id.widget_fast, "");
            views.setTextViewText(R.id.widget_saint, "Open Purify to refresh the calendar");
        } else {
            views.setTextViewText(R.id.widget_fast, day.optString("fastLabel", ""));
            views.setTextViewText(R.id.widget_saint, day.optString("saint", ""));
        }

        // Tapping anywhere opens the app.
        Intent open = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            PendingIntent pi = PendingIntent.getActivity(
                    context, 0, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_saint, pi);
        }
        return views;
    }

    /** "new" or "old", defaulting to the app's own default of New Calendar. */
    private String styleOf(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return "old".equals(prefs.getString(KEY_STYLE, "new")) ? "old" : "new";
    }

    /** The entry for a civil date in one reckoning, or null. */
    private JSONObject lookup(Context context, String dateKey, String style) {
        try (InputStream in = context.getAssets().open(ASSET)) {
            StringBuilder sb = new StringBuilder();
            BufferedReader r = new BufferedReader(
                    new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            JSONObject root = new JSONObject(sb.toString());
            JSONObject days = root.optJSONObject("days");
            if (days == null) return null;
            JSONObject entry = days.optJSONObject(dateKey);
            return entry == null ? null : entry.optJSONObject(style);
        } catch (Exception e) {
            // A missing or malformed asset must not crash the launcher.
            return null;
        }
    }

    /**
     * Today as YYYY-MM-DD in the DEVICE'S LOCAL time, matching what the app
     * shows. The table's keys are UTC dates, and that is the intended pairing:
     * lib/calendar/useToday.ts resolves the reader's own civil day on the
     * device and the lookups run in a UTC-noon frame, so local date to UTC key
     * is the same mapping the app makes.
     */
    private String todayKey() {
        Calendar c = Calendar.getInstance();
        return String.format(
                Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    // ── The midnight alarm ──────────────────────────────────────────────

    private PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, DayWidgetProvider.class);
        intent.setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void scheduleNextMidnight(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_MONTH, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);

        long delay = next.getTimeInMillis() - System.currentTimeMillis();
        // setExact needs a permission on Android 12+ that this app does not
        // hold and does not need: a saint's name arriving a few minutes late
        // is not worth asking a reader for an exact-alarm grant. set() is
        // inexact and allowed to everyone.
        alarms.set(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + Math.max(delay, 60_000L),
                midnightIntent(context));
    }
}
