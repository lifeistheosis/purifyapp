package net.purifyapp.purify.widget;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import org.json.JSONObject;

/**
 * Remember the verse (1.9, docs/WIDGETS.md, the `remember` entry): one of
 * the reader's saved verses a day, at its step, as the card on Today asks
 * it: its longer words blank, each word as its first letter, or no words at
 * all once it is said from memory. The words are checked on the card, so a
 * tap opens Today.
 *
 * <p>The app works out the next seven days' faces (lib/widget/remember.ts),
 * since a widget cannot run the schedule; this looks up today's and draws
 * it. Every word arrives finished, in the app's language. A day with
 * nothing due has a face too: the verse that comes back first, by its
 * reference, and when (build 89, note 18). A day with no face (the app not
 * opened for a week) is the plain line every widget has for that, and no
 * verse saved asks for one.
 *
 * <p>Four cells show the verse; two cells, where its words could not be read,
 * show the reference and the line.
 */
public class RememberWidgetProvider extends PurifyWidgetProvider {

    @Override
    protected String family() {
        return "remember";
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) {
        JSONObject entry = WidgetData.handed(context, "remember");
        if (entry == null) return null;
        if (entry.optBoolean("none", false)) {
            return message(context, id, WidgetData.label(context, "rememberNone", "Save a verse to remember it here."));
        }
        JSONObject days = entry.optJSONObject("days");
        JSONObject face = days == null ? null : days.optJSONObject(WidgetClock.today());
        String ref = WidgetData.text(face, "ref");
        if (ref.isEmpty()) return null;

        String words = WidgetData.text(face, "words");
        String line = WidgetData.text(face, "line");
        boolean done = face.optBoolean("done", false);
        String eyebrow = WidgetData.label(context, "rememberTitle", "Remember the verse");

        int layout = !wide
                ? R.layout.widget_remember_small
                : words.isEmpty() ? R.layout.widget_remember_memory : R.layout.widget_remember;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        views.setTextViewText(R.id.remember_eyebrow, eyebrow);
        views.setTextViewText(R.id.remember_ref, ref);
        WidgetFaces.line(views, R.id.remember_line, line);
        if (layout == R.layout.widget_remember) {
            views.setTextViewText(R.id.remember_words, words);
            views.setViewVisibility(R.id.remember_check, done ? View.VISIBLE : View.GONE);
        }
        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "today"));
        return views;
    }
}
