package net.purifyapp.purify.widget;

import android.content.Context;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

/**
 * The Mosaic family (docs/WIDGETS.md, the mock's section 12): widgets that
 * are there to look good, in the Mosaic pack.
 *
 * <p>The season, the default, turns itself on with the feast: on the days the
 * day table gives a season in the reader's own reckoning, that season's
 * picture with its greeting and line over the shaded foot (the app's words in
 * the reader's language when it handed them over, else the table's). On any
 * other day it is the cross. The cross and the lampada are pure designs and
 * carry no words. A tap opens Today.
 */
public class MosaicWidgetProvider extends PurifyWidgetProvider {

    @Override
    protected String family() {
        return "mosaic";
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        RemoteViews views = new RemoteViews(context.getPackageName(), wide ? R.layout.widget_mosaic : R.layout.widget_mosaic_small);

        int picture = 0;
        String title = "";
        String line = "";
        if ("season".equals(variant)) {
            JSONObject day = WidgetData.day(context, WidgetClock.today());
            JSONObject season = day == null ? null : day.optJSONObject("season");
            String theme = WidgetData.text(season, "theme");
            picture = WidgetPieces.seasonArt(context, theme, wide);
            if (picture != 0) {
                title = WidgetData.label(context, "season." + theme + ".title", WidgetData.text(season, "title"));
                line = WidgetData.label(context, "season." + theme + ".line", WidgetData.text(season, "line"));
            }
        }

        if (picture == 0) {
            // The cross, or the lampada: the picture alone, named for a screen reader.
            boolean lampada = "lampada".equals(variant);
            picture = lampada
                    ? (wide ? R.drawable.mosaic_lampada_wide : R.drawable.mosaic_lampada_square)
                    : (wide ? R.drawable.mosaic_night_wide : R.drawable.mosaic_night_square);
            views.setContentDescription(R.id.mosaic_art, lampada
                    ? WidgetData.label(context, "variant.mosaic.lampada", "The lampada")
                    : WidgetData.label(context, "variant.mosaic.cross", "The cross"));
            views.setViewVisibility(R.id.mosaic_words, View.GONE);
        } else {
            views.setContentDescription(R.id.mosaic_art, null);
            views.setViewVisibility(R.id.mosaic_words, View.VISIBLE);
            views.setTextViewText(R.id.mosaic_title, title);
            // A long title, such as the Dormition's, is set a little smaller, as the mock sets it.
            boolean longTitle = title.length() > 18;
            views.setTextViewTextSize(R.id.mosaic_title, TypedValue.COMPLEX_UNIT_SP,
                    wide ? (longTitle ? 21f : 24f) : (longTitle ? 15f : 17f));
            WidgetFaces.line(views, R.id.mosaic_line, line);
        }
        views.setImageViewResource(R.id.mosaic_art, picture);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "today"));
        return views;
    }
}
