package net.purifyapp.purify.widget;

import android.content.Context;
import android.content.res.Resources;
import android.content.res.TypedArray;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;

import net.purifyapp.purify.R;

import java.io.InputStream;
import java.util.Calendar;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * The pieces the six families after Today draw with (docs/WIDGETS.md): the
 * days to a date the app handed over, a date in words, the word after a
 * count, two colours mixed, the picture a season wears, and a patron saint's
 * icon made small enough for a widget.
 *
 * <p>The only dates counted here are ones the app has already worked out
 * (the next update, the next name day on the reader's own calendar), and the
 * count is plain calendar days between two civil dates. The Church's
 * reckoning stays in the day table.
 */
final class WidgetPieces {

    private WidgetPieces() {}

    private static final Pattern DAY_KEY = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
    private static final long DAY_MS = 86_400_000L;

    // ── Dates ───────────────────────────────────────────────────────────

    /** A YYYY-MM-DD key as noon of that day in UTC, or null when it names no day (2026-02-30 names none). */
    static Calendar civil(String key) {
        if (key == null || !DAY_KEY.matcher(key).matches()) return null;
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        c.clear();
        c.setLenient(false);
        try {
            c.set(Integer.parseInt(key.substring(0, 4)), Integer.parseInt(key.substring(5, 7)) - 1,
                    Integer.parseInt(key.substring(8, 10)), 12, 0, 0);
            c.getTimeInMillis();
            return c;
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Civil days from today to a YYYY-MM-DD key, negative once it has gone by, or null when it is not a date. */
    static Integer daysFromToday(String key) {
        Calendar to = civil(key);
        Calendar from = civil(WidgetClock.today());
        if (to == null || from == null) return null;
        return (int) ((to.getTimeInMillis() - from.getTimeInMillis()) / DAY_MS);
    }

    /** "December 25" for a YYYY-MM-DD key, the month in the app's language, or "" for no date. */
    static String dateInWords(Context context, String key) {
        Calendar c = civil(key);
        return c == null ? "" : WidgetFaces.month(context, c) + " " + c.get(Calendar.DAY_OF_MONTH);
    }

    /**
     * The word after a count: the app's "day" for exactly one and "days" for
     * any other number (docs/WIDGETS.md). Labels handed over before the app
     * carried "day" keep their own "days" for one as well, rather than an
     * English word among the reader's own, as the iPhone widgets do.
     */
    static String daysWord(Context context, int count) {
        String days = WidgetData.label(context, "days", "days");
        if (count != 1) return days;
        return WidgetData.label(context, "day", "days".equals(days) ? "day" : days);
    }

    // ── Colour and size ─────────────────────────────────────────────────

    /** Colour a at share t (0 to 1) and b at the rest, as the mock's color-mix in srgb. */
    static int mix(int a, int b, float t) {
        float s = Math.max(0f, Math.min(1f, t));
        return Color.argb(
                Math.round(Color.alpha(a) * s + Color.alpha(b) * (1 - s)),
                Math.round(Color.red(a) * s + Color.red(b) * (1 - s)),
                Math.round(Color.green(a) * s + Color.green(b) * (1 - s)),
                Math.round(Color.blue(a) * s + Color.blue(b) * (1 - s)));
    }

    /** A length in dp as pixels on this phone. */
    static int dp(Context context, float dp) {
        return Math.round(dp * context.getResources().getDisplayMetrics().density);
    }

    // ── Pictures ────────────────────────────────────────────────────────

    /**
     * The Mosaic picture a season of the day table wears, square or wide, or 0
     * for a theme that has none. The themes and their pictures are listed
     * together in res/values/widget_families.xml, so the names of the seasons
     * are never spelled in Java.
     */
    static int seasonArt(Context context, String theme, boolean wide) {
        if (theme == null || theme.isEmpty()) return 0;
        Resources res = context.getResources();
        String[] themes = res.getStringArray(R.array.widget_art_themes);
        TypedArray art = res.obtainTypedArray(wide ? R.array.widget_art_wide : R.array.widget_art_square);
        try {
            for (int i = 0; i < themes.length && i < art.length(); i++) {
                if (themes[i].equals(theme)) return art.getResourceId(i, 0);
            }
            return 0;
        } finally {
            art.recycle();
        }
    }

    /** The longest side of a patron's icon as handed to the launcher, in pixels: sharp at two cells, small to send. */
    private static final int ICON_PX = 280;

    private static String sourcePath;
    private static Bitmap source;

    /**
     * A patron saint's icon from the app's own bundle ("public/..." in the
     * APK's assets), cut to the shape it is shown in (width over height) and
     * made no larger than {@link #ICON_PX}, or null when there is none or it
     * cannot be read. A tall icon keeps its upper part, where the face is, as
     * the mock shows it (object-position 50% 18%).
     */
    static Bitmap icon(Context context, String path, float aspect) {
        Bitmap full = iconSource(context, path);
        if (full == null || aspect <= 0f) return null;
        int w = full.getWidth();
        int h = full.getHeight();
        int cutW = w;
        int cutH = h;
        if ((float) w / h > aspect) cutW = Math.max(1, Math.min(w, Math.round(h * aspect)));
        else cutH = Math.max(1, Math.min(h, Math.round(w / aspect)));
        int x = (w - cutW) / 2;
        int y = Math.round((h - cutH) * 0.18f);
        Bitmap cut = Bitmap.createBitmap(full, x, y, cutW, cutH);
        float scale = Math.min(1f, (float) ICON_PX / Math.max(cutW, cutH));
        if (scale >= 1f) return cut;
        return Bitmap.createScaledBitmap(cut, Math.max(1, Math.round(cutW * scale)), Math.max(1, Math.round(cutH * scale)), true);
    }

    /** The icon file decoded once (and again only when the patron changes), never far above the size it is drawn at. */
    private static synchronized Bitmap iconSource(Context context, String path) {
        if (path == null || !path.startsWith("public/") || path.contains("..")) return null;
        if (path.equals(sourcePath) && source != null) return source;
        Bitmap decoded;
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream in = context.getAssets().open(path)) {
                BitmapFactory.decodeStream(in, null, bounds);
            }
            int sample = 1;
            while (Math.max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= ICON_PX * 2) sample *= 2;
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = sample;
            try (InputStream in = context.getAssets().open(path)) {
                decoded = BitmapFactory.decodeStream(in, null, options);
            }
        } catch (Exception e) {
            // An icon missing from this build reads as no icon: the text version.
            decoded = null;
        }
        sourcePath = path;
        source = decoded;
        return decoded;
    }
}
