package net.purifyapp.purify.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.ArrayMap;
import android.util.SizeF;
import android.widget.RemoteViews;

import net.purifyapp.purify.R;

import java.util.Map;

/**
 * What every Purify widget family shares: when it draws, which size it draws
 * for, and what it shows when it cannot draw.
 *
 * <p>A family says its name and draws one look at one size; everything else is
 * here. It draws when the phone asks (placed, resized, the phone restarted),
 * when the app hands over something new (WidgetRefresh), at the next local
 * midnight, and when the phone's idea of today moves without the alarm firing:
 * a flight across a timezone, or the clock set by hand. Without those a reader
 * sees yesterday's saint.
 *
 * <p>Two sizes. On Android 12 and newer the launcher is handed both and picks
 * the one that fits as the reader resizes; below that the widget's own width
 * decides. A family whose look does not change with size draws the same views
 * for both.
 */
public abstract class PurifyWidgetProvider extends AppWidgetProvider {

    /** The narrowest a widget is drawn wide, in dp: about four cells. */
    static final int WIDE_DP = 250;

    /** The family this provider draws, as docs/WIDGETS.md names it. */
    protected abstract String family();

    /** One look at one size. May throw; the reader then sees a plain line, never a blank card. */
    protected abstract RemoteViews draw(Context context, int appWidgetId, String variant, boolean wide) throws Exception;

    /** Pray now turns over at 17:00 as well as at midnight. */
    protected boolean changesAtEvening() {
        return false;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, views(context, manager, id));
        WidgetClock.scheduleNext(context, getClass(), changesAtEvening());
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        manager.updateAppWidget(id, views(context, manager, id));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (WidgetClock.ACTION_TICK.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_DATE_CHANGED.equals(action)) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, getClass()));
            onUpdate(context, manager, ids);
        }
    }

    @Override
    public void onDeleted(Context context, int[] ids) {
        for (int id : ids) WidgetVariants.forget(context, id);
    }

    @Override
    public void onDisabled(Context context) {
        // The last widget of this kind is gone: stop waking the phone for it.
        WidgetClock.cancel(context, getClass());
    }

    private RemoteViews views(Context context, AppWidgetManager manager, int id) {
        String variant = WidgetVariants.get(context, family(), id);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> sizes = new ArrayMap<>();
            sizes.put(new SizeF(100f, 100f), safely(context, id, variant, false));
            sizes.put(new SizeF(WIDE_DP, 100f), safely(context, id, variant, true));
            return new RemoteViews(sizes);
        }
        Bundle options = manager.getAppWidgetOptions(id);
        int minWidth = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        return safely(context, id, variant, minWidth >= WIDE_DP);
    }

    private RemoteViews safely(Context context, int id, String variant, boolean wide) {
        try {
            RemoteViews views = draw(context, id, variant, wide);
            if (views != null) return views;
        } catch (Exception e) {
            // Fall through to the plain line: a launcher must never crash on us.
        }
        return message(context, id, WidgetData.label(context, "openToRefresh", "Open Purify to refresh"));
    }

    /** A card with one plain line, for a widget with nothing true to show yet. Tapping it opens the app. */
    protected static RemoteViews message(Context context, int id, String line) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_message);
        views.setTextViewText(R.id.widget_message_text, line);
        views.setOnClickPendingIntent(R.id.widget_root, WidgetOpen.tap(context, id, "today"));
        return views;
    }
}
