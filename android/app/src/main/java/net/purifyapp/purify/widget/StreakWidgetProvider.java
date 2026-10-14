package net.purifyapp.purify.widget;

import android.content.Context;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The Streak family (docs/WIDGETS.md, the mock's section 5): the red
 * streak and the week, so a reader sees it without opening the app.
 *
 * <p>Two looks. Number, the default: the red flame and the count, the words
 * under it, a line to keep it or that it is kept, and the last seven days as
 * dashes, red for each day kept, today last. Ring: the count inside a ring
 * that fills through the week, one seventh for each of those days kept.
 *
 * <p>Only the app keeps the streak, so the widget repeats the app's last
 * word and never works one out: the count the app wrote today, or
 * yesterday's when yesterday was kept, since that streak stands until
 * tonight (its week then moves on a day, today not kept yet). Anything older
 * may have broken or been saved, and the widget says plainly to open the app.
 * A tap opens Today.
 */
public class StreakWidgetProvider extends PurifyWidgetProvider {

    private static final int[] DAYS = {
        R.id.streak_d0, R.id.streak_d1, R.id.streak_d2, R.id.streak_d3, R.id.streak_d4, R.id.streak_d5, R.id.streak_d6,
    };

    /** The ring for 0 to 7 of the week's days kept, one drawing each (a widget cannot set a drawing's length). */
    private static final int[] RINGS = {
        R.drawable.widget_ring_0, R.drawable.widget_ring_1, R.drawable.widget_ring_2, R.drawable.widget_ring_3,
        R.drawable.widget_ring_4, R.drawable.widget_ring_5, R.drawable.widget_ring_6, R.drawable.widget_ring_7,
    };

    @Override
    protected String family() {
        return "streak";
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        Shown streak = Shown.read(context);
        if (streak == null) {
            return message(context, id, WidgetData.label(context, "openForStreak", "Open Purify to see your streak"));
        }
        String words = WidgetData.label(context, "dayStreak", "day streak");
        String line = streak.kept
                ? WidgetData.label(context, "keptToday", "Kept today.")
                : WidgetData.label(context, "keepIt", "Pray or read today to keep it.");

        RemoteViews views;
        if ("ring".equals(variant)) {
            views = new RemoteViews(context.getPackageName(), wide ? R.layout.widget_streak_ring_wide : R.layout.widget_streak_ring);
            views.setImageViewResource(R.id.streak_ring, RINGS[streak.keptThisWeek()]);
            if (wide) views.setTextViewText(R.id.streak_line, line);
        } else {
            views = new RemoteViews(context.getPackageName(), R.layout.widget_streak_number);
            views.setTextViewText(R.id.streak_line, line);
            for (int i = 0; i < DAYS.length; i++) {
                views.setImageViewResource(DAYS[i], streak.week[i] ? R.drawable.widget_week_on : R.drawable.widget_week_off);
            }
        }
        views.setTextViewText(R.id.streak_count, String.valueOf(streak.count));
        views.setTextViewText(R.id.streak_label, words);
        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "today"));
        return views;
    }

    /** The streak as the widget may show it today. */
    private static final class Shown {
        final int count;
        final boolean kept;
        /** The last seven days, oldest first, today last. */
        final boolean[] week;

        Shown(int count, boolean kept, boolean[] week) {
            this.count = count;
            this.kept = kept;
            this.week = week;
        }

        int keptThisWeek() {
            int n = 0;
            for (boolean day : week) if (day) n++;
            return n;
        }

        /** What the app handed over, if it still holds today; null when absent, unreadable or too old to repeat. */
        static Shown read(Context context) {
            JSONObject handed = WidgetData.handed(context, "streak");
            if (handed == null) return null;
            int count = handed.optInt("count", -1);
            if (count < 0) return null;
            boolean kept = handed.optBoolean("keptToday", false);
            String on = WidgetData.text(handed, "on");

            boolean[] week = new boolean[7];
            JSONArray days = handed.optJSONArray("week");
            if (days != null) {
                // The last seven the app sent, set against the end: today is last.
                int from = Math.max(0, days.length() - 7);
                int at = 7 - (days.length() - from);
                for (int i = from; i < days.length(); i++, at++) week[at] = days.optBoolean(i, false);
            }

            if (on.equals(WidgetClock.today())) return new Shown(count, kept, week);
            if (kept && on.equals(WidgetClock.plusDays(-1))) {
                boolean[] moved = new boolean[7];
                System.arraycopy(week, 1, moved, 0, 6);
                return new Shown(count, false, moved);
            }
            return null;
        }
    }
}
