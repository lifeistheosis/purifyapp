package net.purifyapp.purify.widget;

import android.content.Context;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

/**
 * The Countdown family (docs/WIDGETS.md, the mock's sections 9 and 11).
 *
 * <p>Next fast, the default, and Next feast: the next fast season to begin or
 * the next great feast, the days to it and its date, from the day table in
 * the reader's own reckoning. The table counts the days, so this never
 * subtracts one date of the Church's calendar from another. A tap opens the
 * Calendar.
 *
 * <p>Next Purify update: the name and version the app hands over (`update`)
 * and the days to its date, plain calendar counting. It warms as the day
 * nears, as the mock's slider shows: calm thirty days out, the number, the
 * words over it, the bar and the edge running to red in the last days, and
 * on the day a full red card. With no date set it says "Soon". A tap opens
 * What's New.
 *
 * <p>Both layouts carry every view either look uses, and each draw sets
 * every one of them, because a launcher may lay a new drawing over the views
 * of the last one when the layout is the same.
 */
public class CountdownWidgetProvider extends PurifyWidgetProvider {

    /** How many days out the update countdown begins to warm: the mock's slider runs 30 to 0. */
    private static final float WARM_DAYS = 30f;

    /** The level of a bar run to its end. */
    private static final int FULL = 10000;

    @Override
    protected String family() {
        return "countdown";
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        if ("update".equals(variant)) return update(context, id, wide);
        return church(context, id, wide, "feast".equals(variant));
    }

    /** The next fast or great feast, from today's entry in the day table. */
    private static RemoteViews church(Context context, int id, boolean wide, boolean feast) {
        JSONObject day = WidgetData.day(context, WidgetClock.today());
        if (day == null) return null;
        JSONObject next = feast ? day.optJSONObject("nextFeast") : day.optJSONObject("nextFast");
        if (next == null) return null;
        int days = next.optInt("days", -1);
        if (days < 0) return null;

        RemoteViews views = new RemoteViews(context.getPackageName(), wide ? R.layout.widget_countdown_wide : R.layout.widget_countdown);
        int paper = context.getColor(R.color.widget_paper);
        int soft = context.getColor(R.color.widget_soft);
        int dim = context.getColor(R.color.widget_dim);

        views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_card_plain);
        edge(context, views, 0f);

        views.setTextViewText(R.id.cd_eyebrow, WidgetData.label(context, "coming", "Coming"));
        views.setTextColor(R.id.cd_eyebrow, soft);
        figure(views, days == 0 ? WidgetData.label(context, "today0", "Today") : String.valueOf(days), days != 0, paper);
        WidgetFaces.line(views, R.id.cd_unit, days == 0 ? "" : WidgetPieces.daysWord(context, days));
        views.setTextColor(R.id.cd_unit, soft);
        WidgetFaces.line(views, R.id.cd_name, WidgetData.text(next, "name"));
        views.setTextColor(R.id.cd_name, paper);
        views.setViewVisibility(R.id.cd_sub, View.GONE);
        WidgetFaces.line(views, R.id.cd_date, WidgetPieces.dateInWords(context, WidgetData.text(next, "date")));
        views.setTextColor(R.id.cd_date, dim);
        views.setViewVisibility(R.id.cd_bar, View.GONE);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "calendar"));
        return views;
    }

    /** The next Purify update, from what the app handed over. */
    private static RemoteViews update(Context context, int id, boolean wide) {
        JSONObject update = WidgetData.handed(context, "update");
        if (update == null) return null;
        String name = WidgetData.text(update, "name");
        String version = WidgetData.text(update, "version");
        Integer days = WidgetPieces.daysFromToday(WidgetData.text(update, "date"));
        // A date gone by means the app has newer word than this phone: until
        // it is opened, the update is coming "soon", as when no date is set.
        if (days != null && days < 0) days = null;
        boolean out = days != null && days == 0;
        float heat = out ? 1f : days == null ? 0f : Math.max(0f, Math.min(1f, 1f - days / WARM_DAYS));

        RemoteViews views = new RemoteViews(context.getPackageName(), wide ? R.layout.widget_countdown_wide : R.layout.widget_countdown);
        int paper = context.getColor(R.color.widget_paper);
        int hot = out ? Color.WHITE : WidgetPieces.mix(context.getColor(R.color.widget_red), paper, heat);

        views.setInt(R.id.widget_root, "setBackgroundResource", out ? R.drawable.widget_card_out : R.drawable.widget_card_plain);
        edge(context, views, heat);

        views.setTextViewText(R.id.cd_eyebrow, WidgetData.label(context, "nextUpdate", "Next update"));
        views.setTextColor(R.id.cd_eyebrow, hot);
        String shown = days == null
                ? WidgetData.label(context, "soon", "Soon")
                : out ? WidgetData.label(context, "today0", "Today") : String.valueOf(days);
        figure(views, shown, days != null && !out, hot);
        WidgetFaces.line(views, R.id.cd_unit, days == null || out ? "" : WidgetPieces.daysWord(context, days));
        views.setTextColor(R.id.cd_unit, out ? context.getColor(R.color.widget_on_art_soft) : context.getColor(R.color.widget_soft));

        // The name, and the version under it; the version alone when the update has no name yet.
        WidgetFaces.line(views, R.id.cd_name, name.isEmpty() ? version : name);
        views.setTextColor(R.id.cd_name, out ? Color.WHITE : paper);
        WidgetFaces.line(views, R.id.cd_sub, name.isEmpty() ? "" : version);
        views.setTextColor(R.id.cd_sub, out ? context.getColor(R.color.widget_out_dim) : context.getColor(R.color.widget_dim));
        views.setViewVisibility(R.id.cd_date, View.GONE);

        views.setViewVisibility(R.id.cd_bar, View.VISIBLE);
        views.setInt(R.id.cd_bar, "setBackgroundResource", out ? R.drawable.widget_bar_track_out : R.drawable.widget_bar_track);
        views.setInt(R.id.cd_bar, "setImageLevel", Math.max(1, Math.round(heat * FULL)));
        views.setInt(R.id.cd_bar, "setColorFilter", hot);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "whats-new"));
        return views;
    }

    /**
     * The big figure: the days at the mock's size, or a word in their place
     * ("Today", "Soon") a little smaller, in a view of its own whose box is
     * not pulled in, so a letter that hangs below the line is never cut.
     */
    private static void figure(RemoteViews views, String text, boolean count, int color) {
        views.setTextViewText(count ? R.id.cd_number : R.id.cd_word, text);
        views.setViewVisibility(R.id.cd_number, count ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.cd_word, count ? View.GONE : View.VISIBLE);
        views.setTextColor(R.id.cd_number, color);
        views.setTextColor(R.id.cd_word, color);
    }

    /**
     * The card's edge, drawn over it: the hairline every card has when calm,
     * warming toward red with the heat, red at seven tenths of it mixed into
     * the hairline as the mock's border is.
     */
    private static void edge(Context context, RemoteViews views, float heat) {
        int red = context.getColor(R.color.widget_red);
        float share = 0.7f * Math.max(0f, Math.min(1f, heat));
        float hairline = 0x1F / 255f;
        float alpha = share + (1 - share) * hairline;
        int r = Math.round((share * Color.red(red) + (1 - share) * hairline * 255) / alpha);
        int g = Math.round((share * Color.green(red) + (1 - share) * hairline * 255) / alpha);
        int b = Math.round((share * Color.blue(red) + (1 - share) * hairline * 255) / alpha);
        views.setInt(R.id.cd_edge, "setColorFilter", Color.rgb(Math.min(255, r), Math.min(255, g), Math.min(255, b)));
        views.setInt(R.id.cd_edge, "setImageAlpha", Math.round(alpha * 255));
    }
}
