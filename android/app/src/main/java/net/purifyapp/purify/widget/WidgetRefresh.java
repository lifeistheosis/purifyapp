package net.purifyapp.purify.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import net.purifyapp.purify.DayWidgetProvider;

/**
 * Redraw every placed Purify widget, after the app has handed over something
 * new (WidgetBridgePlugin), or one widget after its look was chosen.
 *
 * <p>Every family's provider is listed here. A family missing from this list
 * still draws when the phone asks it to, but would not hear of a new streak
 * or a new language until midnight, so a new family is added here as well as
 * to the manifest (lib/widget/__tests__/androidContract.test.ts holds the two
 * lists together).
 */
public final class WidgetRefresh {

    static final Class<?>[] FAMILIES = {
        DayWidgetProvider.class,
    };

    private WidgetRefresh() {}

    /** Ask every placed widget of every family to draw again. */
    public static void all(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (Class<?> family : FAMILIES) {
            ComponentName component = new ComponentName(context, family);
            int[] ids = manager.getAppWidgetIds(component);
            if (ids == null || ids.length == 0) continue;
            send(context, component, ids);
        }
    }

    /** Ask one placed widget to draw again. */
    static void one(Context context, int appWidgetId) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        android.appwidget.AppWidgetProviderInfo info = manager.getAppWidgetInfo(appWidgetId);
        if (info == null || info.provider == null) return;
        send(context, info.provider, new int[] {appWidgetId});
    }

    private static void send(Context context, ComponentName component, int[] ids) {
        Intent intent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.setComponent(component);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}
