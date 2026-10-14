package net.purifyapp.purify.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;

import java.util.Calendar;
import java.util.Locale;

/**
 * Today, as a widget sees it, and the one alarm that turns a widget over.
 *
 * <p>Today is YYYY-MM-DD in the DEVICE'S LOCAL time, matching what the app
 * shows. The table's keys are UTC dates, and that is the intended pairing:
 * lib/calendar/useToday.ts resolves the reader's own civil day on the device
 * and the lookups run in a UTC-noon frame, so local date to UTC key is the
 * same mapping the app makes. Stepping a civil date forward (the week's seven
 * days) is plain calendar counting, not the Church's reckoning, which the
 * table already holds.
 *
 * <p>updatePeriodMillis is 0 in every widget's info file. The system clamps
 * that setting to 30 minutes at best and wakes the app to honour it, which is
 * waste for content that changes once a day. Each widget kind sets one
 * inexact alarm instead: the next local midnight, or for Pray now the next of
 * midnight and 17:00, when the morning rule gives way to the evening one.
 */
public final class WidgetClock {

    static final String ACTION_TICK = "net.purifyapp.purify.WIDGET_MIDNIGHT";

    /** The hour the evening rule begins, the same boundary the Today card uses. */
    static final int EVENING_HOUR = 17;

    private WidgetClock() {}

    static String key(Calendar c) {
        return String.format(
                Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** Today's key in the device's local time. */
    static String today() {
        return key(Calendar.getInstance());
    }

    /** The key `days` civil days after today (negative for before). */
    static String plusDays(int days) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, days);
        return key(c);
    }

    static boolean isEvening() {
        return Calendar.getInstance().get(Calendar.HOUR_OF_DAY) >= EVENING_HOUR;
    }

    private static PendingIntent tickIntent(Context context, Class<?> provider) {
        Intent intent = new Intent(context, provider);
        intent.setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(
                context, provider.getName().hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** One alarm for the next change: midnight, or 17:00 first when it is nearer and asked for. */
    static void scheduleNext(Context context, Class<?> provider, boolean atEvening) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_MONTH, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);

        if (atEvening) {
            Calendar evening = Calendar.getInstance();
            evening.set(Calendar.HOUR_OF_DAY, EVENING_HOUR);
            evening.set(Calendar.MINUTE, 0);
            evening.set(Calendar.SECOND, 5);
            evening.set(Calendar.MILLISECOND, 0);
            if (evening.getTimeInMillis() > System.currentTimeMillis()) next = evening;
        }

        long delay = next.getTimeInMillis() - System.currentTimeMillis();
        // setExact needs a permission on Android 12+ that this app does not
        // hold and does not need: a saint's name arriving a few minutes late
        // is not worth asking a reader for an exact-alarm grant. set() is
        // inexact and allowed to everyone.
        alarms.set(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + Math.max(delay, 60_000L),
                tickIntent(context, provider));
    }

    /** The last widget of a kind is gone: stop waking the phone for it. */
    static void cancel(Context context, Class<?> provider) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(tickIntent(context, provider));
    }
}
