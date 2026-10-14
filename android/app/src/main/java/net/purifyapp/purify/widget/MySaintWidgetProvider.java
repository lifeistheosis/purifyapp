package net.purifyapp.purify.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

import java.util.regex.Pattern;

/**
 * The My saint family (docs/WIDGETS.md, the mock's section 8): the reader's
 * own patron saint, as the app hands it over (`patron`): the icon, the name,
 * and the days to the name day, which says so on the day itself.
 *
 * <p>The icon is drawn only when the app sends one, which it does only for an
 * icon whose rights are cleared (lib/saints/iconRights.ts); otherwise the
 * widget is its text version, as the mock allows. With no patron chosen it
 * asks the reader to choose one in Purify, and a tap opens the app; with one,
 * a tap opens that saint's page.
 */
public class MySaintWidgetProvider extends PurifyWidgetProvider {

    /** A saint's slug as the app's registry spells one; anything else opens Today. */
    private static final Pattern SLUG = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    /** The icon's frame, width over height: tall beside the words on four cells, wide over them on two. */
    private static final float WIDE_ICON = 0.7f;
    private static final float SMALL_ICON = 1.45f;

    @Override
    protected String family() {
        return "mysaint";
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        JSONObject patron = WidgetData.handed(context, "patron");
        String name = WidgetData.text(patron, "name");
        if (name.isEmpty()) {
            return message(context, id, WidgetData.label(context, "chooseSaint", "Choose your saint in Purify"));
        }
        String nameDay = WidgetData.text(patron, "nameDay");
        Integer days = WidgetPieces.daysFromToday(nameDay);
        String path = WidgetData.text(patron, "icon");
        Bitmap icon = path.isEmpty() ? null : WidgetPieces.icon(context, path, wide ? WIDE_ICON : SMALL_ICON);
        String eyebrow = WidgetData.label(context, "mySaint", "My saint");

        RemoteViews views;
        if (wide) {
            views = new RemoteViews(context.getPackageName(), R.layout.widget_mysaint);
            if (icon != null) {
                views.setImageViewBitmap(R.id.saint_icon, icon);
                views.setViewVisibility(R.id.saint_icon, View.VISIBLE);
                int pad = WidgetPieces.dp(context, 12);
                views.setViewPadding(R.id.widget_root, pad, pad, pad, pad);
            } else {
                views.setViewVisibility(R.id.saint_icon, View.GONE);
                int side = WidgetPieces.dp(context, 18);
                int top = WidgetPieces.dp(context, 14);
                views.setViewPadding(R.id.widget_root, side, top, side, top);
            }
            views.setTextViewText(R.id.saint_eyebrow, eyebrow);
            views.setTextViewText(R.id.saint_name, name);
            nameDayRow(context, views, nameDay, days);
        } else if (icon != null) {
            views = new RemoteViews(context.getPackageName(), R.layout.widget_mysaint_small);
            views.setImageViewBitmap(R.id.saint_icon, icon);
            views.setTextViewText(R.id.saint_name, name);
            WidgetFaces.line(views, R.id.saint_meta, countLine(context, days));
        } else {
            views = new RemoteViews(context.getPackageName(), R.layout.widget_mysaint_small_text);
            views.setTextViewText(R.id.saint_eyebrow, eyebrow);
            views.setTextViewText(R.id.saint_name, name);
            WidgetFaces.line(views, R.id.saint_meta, countLine(context, days));
        }

        String slug = WidgetData.text(patron, "slug");
        views.setOnClickPendingIntent(R.id.widget_root,
                WidgetOpen.tap(context, id, SLUG.matcher(slug).matches() ? "saint/" + slug : "today"));
        return views;
    }

    /**
     * "Name day in 57 days", or "Name day today" on the day; nothing when the
     * app knows no name day. A name day gone by (the app not opened since)
     * asks for the app, which knows the next one.
     */
    private static String countLine(Context context, Integer days) {
        if (days == null) return "";
        if (days < 0) return WidgetData.label(context, "openToRefresh", "Open Purify to refresh");
        if (days == 0) return WidgetData.label(context, "nameDayToday", "Name day today");
        String english = days == 1 ? "Name day in {n} day" : "Name day in {n} days";
        return WidgetData.label(context, "nameDayIn", english).replace("{n}", String.valueOf(days));
    }

    /** Four cells: the name day's date, and a chip with the days to it, standing out on the day itself. */
    private static void nameDayRow(Context context, RemoteViews views, String nameDay, Integer days) {
        if (days == null) {
            views.setViewVisibility(R.id.saint_date, View.GONE);
            views.setViewVisibility(R.id.saint_chip, View.GONE);
            return;
        }
        if (days < 0) {
            WidgetFaces.line(views, R.id.saint_date, WidgetData.label(context, "openToRefresh", "Open Purify to refresh"));
            views.setViewVisibility(R.id.saint_chip, View.GONE);
            return;
        }
        WidgetFaces.line(views, R.id.saint_date, WidgetPieces.dateInWords(context, nameDay));
        boolean today = days == 0;
        views.setTextViewText(R.id.saint_chip, today
                ? WidgetData.label(context, "nameDayToday", "Name day today")
                : days + " " + WidgetPieces.daysWord(context, days));
        views.setViewVisibility(R.id.saint_chip, View.VISIBLE);
        views.setInt(R.id.saint_chip, "setBackgroundResource", today ? R.drawable.widget_chip_on : R.drawable.widget_chip);
        views.setTextColor(R.id.saint_chip, context.getColor(today ? R.color.widget_paper : R.color.widget_soft));
    }
}
