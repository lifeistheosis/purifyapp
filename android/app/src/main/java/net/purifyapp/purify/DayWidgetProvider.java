package net.purifyapp.purify;

import android.content.Context;
import android.widget.RemoteViews;

import net.purifyapp.purify.widget.PurifyWidgetProvider;
import net.purifyapp.purify.widget.WidgetFaces;

/**
 * The Today family (docs/WIDGETS.md): the day's saint and fast, the week, or
 * all of it rotating.
 *
 * <p>Asked for twice in the app's own Community tab: "Is it possible for you
 * to add the widget option?" and "IOS Widgets". This was the first Android
 * widget, a plain two-line card, and it keeps its class name and package on
 * purpose: a widget a reader has already placed is bound to this name, so it
 * becomes the family's first look instead of disappearing from their home
 * screen with the update.
 *
 * <p>Everything it shows comes from the day table, in the reader's own
 * reckoning, and the words the app hands over (net.purifyapp.purify.widget
 * WidgetData); nothing here works out the Church's calendar.
 */
public class DayWidgetProvider extends PurifyWidgetProvider {

    @Override
    protected String family() {
        return "today";
    }

    @Override
    protected RemoteViews draw(Context context, int id, String variant, boolean wide) throws Exception {
        switch (variant) {
            case "week":
                return WidgetFaces.todayWeek(context, id);
            case "rotating":
                return WidgetFaces.todayRotating(context, id);
            default:
                return wide ? WidgetFaces.todayDay(context, id) : WidgetFaces.todayDaySmall(context, id);
        }
    }
}
