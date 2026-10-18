package net.purifyapp.purify.widget;

import android.content.Context;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

/**
 * The Verse family (docs/WIDGETS.md): the Verse of the Day, the verse the
 * Today screen shows, from the day table.
 *
 * <p>Two looks. Minimal, the default, is the mock's section 2: a small
 * cross, the verse in the serif, a short rule and the reference, nothing
 * else. On Mosaic art sets the same words low over a Mosaic picture whose
 * foot is shaded: the picture of the hour, dawn until 17:00 and dusk after,
 * whose light sits high on the right and leaves the foot to the words. The
 * mock draws no verse on art, so this follows the nearest thing it draws,
 * its Pray now cards. The two cell widget shows the middle of the wide
 * picture, so the light falls outside the card instead of under a verse of
 * four lines. A tap opens the verse in the Bible.
 */
public class VerseWidgetProvider extends PurifyWidgetProvider {

    @Override
    protected String family() {
        return "verse";
    }

    /** On Mosaic art the picture is the hour's, so the family turns over at 17:00 as well as at midnight. */
    @Override
    protected boolean changesAtEvening() {
        return true;
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        JSONObject verse = WidgetData.verse(context, WidgetClock.today());
        String text = WidgetData.text(verse, "text");
        if (text.isEmpty()) return null;
        String ref = WidgetData.text(verse, "ref");
        boolean art = "mosaic".equals(variant);

        int layout = art
                ? (wide ? R.layout.widget_verse_art : R.layout.widget_verse_art_small)
                : (wide ? R.layout.widget_verse_minimal : R.layout.widget_verse_minimal_small);
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        views.setTextViewText(R.id.verse_text, text);
        views.setTextViewText(R.id.verse_ref, ref);
        views.setViewVisibility(R.id.verse_ref_row, ref.isEmpty() ? View.GONE : View.VISIBLE);
        // A machine-translated verse's label (TEMPORARY, lib/today/machineVerse.ts);
        // WidgetData.verse hands over such a verse only with one.
        WidgetFaces.line(views, R.id.verse_note, WidgetData.text(verse, "note"));

        if (art) {
            boolean evening = WidgetClock.isEvening();
            views.setImageViewResource(R.id.verse_art, evening ? R.drawable.mosaic_dusk_wide : R.drawable.mosaic_dawn_wide);
            views.setTextViewTextSize(R.id.verse_text, TypedValue.COMPLEX_UNIT_SP, sizeOverArt(text.length(), wide));
        }

        views.setOnClickPendingIntent(R.id.widget_root,
                WidgetOpen.tap(context, id, WidgetOpen.verseTarget(WidgetData.text(verse, "href"))));
        return views;
    }

    /**
     * The verse's size over art, smaller for a longer verse so it keeps to
     * the foot of the picture. (The Minimal look sizes itself: its verse has
     * the middle of the card to fill.)
     */
    private static float sizeOverArt(int length, boolean wide) {
        if (wide) return length <= 60 ? 17f : length <= 100 ? 15f : 14f;
        return length <= 50 ? 15f : length <= 80 ? 14f : 12f;
    }
}
