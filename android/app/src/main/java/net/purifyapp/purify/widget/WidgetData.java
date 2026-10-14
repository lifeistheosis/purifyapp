package net.purifyapp.purify.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * What every Purify widget reads: the day table the build bakes, and what the
 * app hands over. docs/WIDGETS.md is the contract for both.
 *
 * <p>The table (version 3) is written by scripts/emit-widget-data.mjs into the
 * web bundle, which ships in this APK, so a widget opens it as an asset with no
 * bridge. It carries every civil day in both reckonings, already worked out by
 * the app's own calendar code, so nothing here does date arithmetic about the
 * Church's calendar: a widget looks up today's key and picks a side.
 *
 * <p>What only the app knows (the reader's calendar, streak, patron saint,
 * prayers kept, and every word in their language) arrives through the
 * WidgetBridge plugin into the {@link #PREFS} preferences. Any of it can be
 * absent, on a phone where the app has not been opened since the widget was
 * placed, and every widget has a plain answer for that.
 */
public final class WidgetData {

    /** The preferences the app's WidgetBridge writes. The old day widget read the calendar style here too. */
    public static final String PREFS = "PurifyWidget";

    /** Written by scripts/emit-widget-data.mjs into public/, copied here by cap sync. */
    static final String ASSET = "public/widget-day-table.json";

    private static JSONObject table;

    private WidgetData() {}

    /** The whole table, read once per process. Null when missing or unreadable. */
    static synchronized JSONObject table(Context context) {
        if (table != null) return table;
        try (InputStream in = context.getAssets().open(ASSET)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[16384];
            int n;
            while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
            table = new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
        } catch (Exception e) {
            // A missing or malformed asset must not crash the launcher.
            table = null;
        }
        return table;
    }

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** "new" or "old", the app's own default of New Calendar until the app says otherwise. */
    static String style(Context context) {
        return "old".equals(prefs(context).getString("calendarStyle", "new")) ? "old" : "new";
    }

    /** A civil day's entry (both reckonings, and the verse), or null. */
    static JSONObject entry(Context context, String dayKey) {
        JSONObject t = table(context);
        JSONObject days = t == null ? null : t.optJSONObject("days");
        return days == null ? null : days.optJSONObject(dayKey);
    }

    /** A civil day in the reader's own reckoning, or null. */
    static JSONObject day(Context context, String dayKey) {
        JSONObject e = entry(context, dayKey);
        return e == null ? null : e.optJSONObject(style(context));
    }

    /** The Verse of the Day for a civil day, or null. */
    static JSONObject verse(Context context, String dayKey) {
        JSONObject e = entry(context, dayKey);
        return e == null ? null : e.optJSONObject("verse");
    }

    /** One of the JSON values the app hands over, or null when absent or unreadable. */
    static JSONObject handed(Context context, String key) {
        String raw = prefs(context).getString(key, null);
        if (raw == null) return null;
        try {
            return new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * A word in the app's language, from the labels the app hands over, or the
     * English given. Every label arrives finished; a widget never builds a
     * sentence.
     */
    static String label(Context context, String key, String english) {
        JSONObject labels = handed(context, "labels");
        Object value = labels == null ? null : labels.opt(key);
        return value instanceof String && !((String) value).isEmpty() ? (String) value : english;
    }

    /** A string field of a JSON object, or "" (never the text "null"). */
    static String text(JSONObject object, String key) {
        if (object == null) return "";
        Object value = object.opt(key);
        return value instanceof String ? (String) value : "";
    }

    /** The fast's badge in the reader's language, falling back to the table's English. */
    static String fastBadge(Context context, JSONObject day) {
        String rule = text(day, "fastRule");
        String english = text(day, "fastLabel");
        return rule.isEmpty() ? english : label(context, "fast." + rule, english);
    }

    /** Whether the day is a fast day at all, for the week's dots and the chip that stands out. */
    static boolean isFast(JSONObject day) {
        String kind = text(day, "fastKind");
        return !kind.isEmpty() && !"normal".equals(kind) && !"fast-free".equals(kind);
    }
}
