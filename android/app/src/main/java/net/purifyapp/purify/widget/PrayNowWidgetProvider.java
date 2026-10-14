package net.purifyapp.purify.widget;

import android.content.Context;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

/**
 * The Pray now family (docs/WIDGETS.md, the mock's section 4): the morning
 * rule until 17:00 and the evening rule after, the same boundary the Today
 * card uses. The Mosaic picture of the hour (a rising light in the morning, a
 * moon over deep blue from 17:00), the hour and the minutes in small
 * capitals, the rule's name, and a round paper button with an arrow. A tap
 * opens the rule, ready to begin.
 *
 * <p>Once that rule is prayed today (the app hands over the day each rule was
 * last finished, `prayed`) the card goes quiet: the picture dimmed, "Prayed
 * today", when the next rule is, and a check instead of the arrow.
 */
public class PrayNowWidgetProvider extends PurifyWidgetProvider {

    @Override
    protected String family() {
        return "pray";
    }

    @Override
    protected boolean changesAtEvening() {
        return true;
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        boolean evening = WidgetClock.isEvening();
        JSONObject prayed = WidgetData.handed(context, "prayed");
        String prayedOn = evening ? WidgetData.text(prayed, "evening") : WidgetData.text(prayed, "morning");
        boolean quiet = !prayedOn.isEmpty() && prayedOn.equals(WidgetClock.today());

        String hour = evening
                ? WidgetData.label(context, "evening", "Evening")
                : WidgetData.label(context, "morning", "Morning");
        String minutes = evening
                ? WidgetData.label(context, "eveningMinutes", "8 min")
                : WidgetData.label(context, "morningMinutes", "8 min");
        String rule = evening
                ? WidgetData.label(context, "eveningPrayers", "Evening prayers")
                : WidgetData.label(context, "morningPrayers", "Morning prayers");
        String next = evening
                ? WidgetData.label(context, "afterEvening", "Morning prayers tomorrow")
                : WidgetData.label(context, "afterMorning", "Evening prayers at 5 pm");

        RemoteViews views = new RemoteViews(context.getPackageName(), wide ? R.layout.widget_pray : R.layout.widget_pray_small);
        views.setImageViewResource(R.id.pray_art, picture(evening, quiet, wide));
        views.setTextViewText(R.id.pray_title, quiet ? WidgetData.label(context, "prayedToday", "Prayed today") : rule);
        if (wide) {
            views.setTextViewText(R.id.pray_tag, quiet ? hour : hour + " · " + minutes);
            WidgetFaces.line(views, R.id.pray_after, quiet ? next : "");
        } else {
            views.setTextViewText(R.id.pray_tag, hour);
            views.setTextViewText(R.id.pray_meta, quiet ? next : minutes);
        }
        views.setInt(R.id.pray_button, "setBackgroundResource", quiet ? R.drawable.widget_play_done : R.drawable.widget_play);
        views.setImageViewResource(R.id.pray_button, quiet ? R.drawable.widget_check : R.drawable.widget_arrow);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, evening ? "pray/evening" : "pray/morning"));
        return views;
    }

    /** The hour's picture, square or wide, and its dimmed copy once the rule is prayed (baked, not filtered here). */
    private static int picture(boolean evening, boolean quiet, boolean wide) {
        if (evening) {
            if (quiet) return wide ? R.drawable.mosaic_dusk_quiet_wide : R.drawable.mosaic_dusk_quiet_square;
            return wide ? R.drawable.mosaic_dusk_wide : R.drawable.mosaic_dusk_square;
        }
        if (quiet) return wide ? R.drawable.mosaic_dawn_quiet_wide : R.drawable.mosaic_dawn_quiet_square;
        return wide ? R.drawable.mosaic_dawn_wide : R.drawable.mosaic_dawn_square;
    }
}
