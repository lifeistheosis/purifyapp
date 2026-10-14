package net.purifyapp.purify.widget;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

import java.text.DateFormatSymbols;
import java.util.Calendar;

/**
 * The Today family's faces, and the small pieces every family draws with: the
 * weekday and month in the app's language, and the fast's chip.
 *
 * <p>Each face returns null when the table has nothing for today, and the
 * caller (PurifyWidgetProvider) shows a plain line instead of a blank card.
 */
public final class WidgetFaces {

    private WidgetFaces() {}

    // ── Pieces ──────────────────────────────────────────────────────────

    /** One of a "|"-joined list of names the app hands over, or the phone's own when absent. */
    private static String fromList(Context context, String key, int index, String fallback) {
        String joined = WidgetData.label(context, key, "");
        String[] names = joined.isEmpty() ? new String[0] : joined.split("\\|");
        return index >= 0 && index < names.length && !names[index].isEmpty() ? names[index] : fallback;
    }

    /** "Wed", in the app's language. */
    static String weekday(Context context, Calendar day) {
        int index = day.get(Calendar.DAY_OF_WEEK) - 1;
        return fromList(context, "weekdaysShort", index, new DateFormatSymbols().getShortWeekdays()[index + 1]);
    }

    /** "October", in the app's language. */
    static String month(Context context, Calendar day) {
        int index = day.get(Calendar.MONTH);
        return fromList(context, "monthsLong", index, new DateFormatSymbols().getMonths()[index]);
    }

    /** "Oct", in the app's language. */
    static String monthShort(Context context, Calendar day) {
        int index = day.get(Calendar.MONTH);
        return fromList(context, "monthsShort", index, new DateFormatSymbols().getShortMonths()[index]);
    }

    /** The fast's chip: its badge, standing out on a fast day as the mock draws it. */
    static void chip(RemoteViews views, int viewId, Context context, JSONObject day) {
        views.setTextViewText(viewId, WidgetData.fastBadge(context, day));
        boolean fast = WidgetData.isFast(day);
        views.setInt(viewId, "setBackgroundResource", fast ? R.drawable.widget_chip_on : R.drawable.widget_chip);
        views.setTextColor(viewId, context.getColor(fast ? R.color.widget_paper : R.color.widget_soft));
    }

    /** Set a line, hiding it when there is nothing to say rather than leaving a gap that reads as missing. */
    static void line(RemoteViews views, int viewId, String text) {
        views.setTextViewText(viewId, text);
        views.setViewVisibility(viewId, text == null || text.isEmpty() ? View.GONE : View.VISIBLE);
    }

    // ── Today ───────────────────────────────────────────────────────────

    /** Saint and fast, four cells wide: the date on the left, the saint on the right. */
    public static RemoteViews todayDay(Context context, int id) {
        JSONObject day = WidgetData.day(context, WidgetClock.today());
        if (day == null) return null;
        Calendar now = Calendar.getInstance();
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today_day);
        views.setTextViewText(R.id.today_weekday, weekday(context, now));
        views.setTextViewText(R.id.today_number, String.valueOf(now.get(Calendar.DAY_OF_MONTH)));
        views.setTextViewText(R.id.today_month, month(context, now));
        views.setTextViewText(R.id.today_eyebrow, WidgetData.label(context, "todayInTheChurch", "Today in the Church"));
        views.setTextViewText(R.id.today_saint, WidgetData.text(day, "saint"));
        views.setTextViewText(R.id.today_note, WidgetData.text(day, "note"));
        chip(views, R.id.today_chip, context, day);
        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "calendar"));
        return views;
    }

    /** Saint and fast, two cells: "10 SAT · OCT", the saint, the chip. */
    public static RemoteViews todayDaySmall(Context context, int id) {
        JSONObject day = WidgetData.day(context, WidgetClock.today());
        if (day == null) return null;
        Calendar now = Calendar.getInstance();
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today_day_small);
        views.setTextViewText(R.id.today_number, String.valueOf(now.get(Calendar.DAY_OF_MONTH)));
        views.setTextViewText(R.id.today_weekday, weekday(context, now) + " · " + monthShort(context, now));
        views.setTextViewText(R.id.today_saint, WidgetData.text(day, "saint"));
        chip(views, R.id.today_chip, context, day);
        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "calendar"));
        return views;
    }

    private static final int[] WEEKDAY_IDS = {
        R.id.week_wd0, R.id.week_wd1, R.id.week_wd2, R.id.week_wd3, R.id.week_wd4, R.id.week_wd5, R.id.week_wd6,
    };
    private static final int[] NUMBER_IDS = {
        R.id.week_n0, R.id.week_n1, R.id.week_n2, R.id.week_n3, R.id.week_n4, R.id.week_n5, R.id.week_n6,
    };
    private static final int[] DOT_IDS = {
        R.id.week_dot0, R.id.week_dot1, R.id.week_dot2, R.id.week_dot3, R.id.week_dot4, R.id.week_dot5, R.id.week_dot6,
    };

    /** The week: seven days from today, a red dot on each fast day, today's saint and fast under them. */
    public static RemoteViews todayWeek(Context context, int id) {
        JSONObject today = WidgetData.day(context, WidgetClock.today());
        if (today == null) return null;
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today_week);
        views.setTextViewText(R.id.today_eyebrow, WidgetData.label(context, "thisWeek", "This week"));
        for (int i = 0; i < 7; i++) {
            Calendar c = Calendar.getInstance();
            c.add(Calendar.DAY_OF_MONTH, i);
            JSONObject day = WidgetData.day(context, WidgetClock.key(c));
            views.setTextViewText(WEEKDAY_IDS[i], weekday(context, c));
            views.setTextViewText(NUMBER_IDS[i], String.valueOf(c.get(Calendar.DAY_OF_MONTH)));
            views.setInt(NUMBER_IDS[i], "setBackgroundResource", i == 0 ? R.drawable.widget_today_circle : 0);
            views.setTextColor(NUMBER_IDS[i], context.getColor(i == 0 ? R.color.widget_ground : R.color.widget_paper));
            views.setViewVisibility(DOT_IDS[i], day != null && WidgetData.isFast(day) ? View.VISIBLE : View.INVISIBLE);
        }
        views.setTextViewText(R.id.today_saint, WidgetData.text(today, "saint"));
        chip(views, R.id.today_chip, context, today);
        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "calendar"));
        return views;
    }

    /** Rotating: the verse, the saint and the fast, turning by themselves. */
    public static RemoteViews todayRotating(Context context, int id) {
        String key = WidgetClock.today();
        JSONObject day = WidgetData.day(context, key);
        if (day == null) return null;
        JSONObject verse = WidgetData.verse(context, key);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today_rotating);
        String eyebrow = WidgetData.label(context, "today", "Today");
        views.setTextViewText(R.id.rot_eyebrow_1, eyebrow);
        views.setTextViewText(R.id.rot_eyebrow_2, eyebrow);
        views.setTextViewText(R.id.rot_eyebrow_3, eyebrow);

        views.setTextViewText(R.id.rot_verse, WidgetData.text(verse, "text"));
        views.setTextViewText(R.id.rot_verse_ref, WidgetData.text(verse, "ref"));

        views.setTextViewText(R.id.rot_saint, WidgetData.text(day, "saint"));
        line(views, R.id.rot_saint_note, WidgetData.text(day, "note"));

        views.setTextViewText(R.id.rot_fast, WidgetData.fastBadge(context, day));
        JSONObject next = day.optJSONObject("nextFast");
        String coming = "";
        if (next != null) {
            int days = next.optInt("days", -1);
            String when = days == 0
                    ? WidgetData.label(context, "today0", "Today")
                    : days + " " + WidgetData.label(context, "days", "days");
            coming = WidgetData.text(next, "name") + " · " + when;
        }
        line(views, R.id.rot_fast_next, coming);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "calendar"));
        return views;
    }
}
