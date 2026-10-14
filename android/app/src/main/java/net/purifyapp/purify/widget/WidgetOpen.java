package net.purifyapp.purify.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import net.purifyapp.purify.ShortcutActivity;

/**
 * What a tap on a widget opens: the app, at one screen.
 *
 * <p>The tap travels the same road as the icon shortcuts: ShortcutActivity
 * hands an address to the app, and the app's own code
 * (lib/widget/open.ts, through components/native/ShortcutListener.tsx)
 * decides which screen it means. The address is never a route: a phone knows
 * nothing about the app's screens, and lib/shortcuts/shortcuts.ts explains why
 * an address only ever picks one of a fixed set. ShortcutActivity is not
 * exported, and a PendingIntent from this app may still start it, so nothing
 * outside the app can send one.
 */
public final class WidgetOpen {

    static final String PREFIX = "net.purifyapp.purify://widget/";

    private WidgetOpen() {}

    /** A tap that opens `target` ("calendar", "verse/luke/8/25", ...). */
    static PendingIntent tap(Context context, int appWidgetId, String target) {
        Intent intent = new Intent(context, ShortcutActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(PREFIX + target));
        // The address differs per target, which already keeps two taps apart;
        // the widget's id as the request code keeps two placed widgets apart.
        return PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** "/bible/luke/8#v25" as the widget address "verse/luke/8/25", or "today" for anything else. */
    static String verseTarget(String href) {
        if (href == null) return "today";
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("^/bible/([a-z0-9-]+)/(\\d{1,3})(?:#v(\\d{1,3}))?$")
                .matcher(href);
        if (!m.matches()) return "today";
        return "verse/" + m.group(1) + "/" + m.group(2) + "/" + (m.group(3) == null ? "1" : m.group(3));
    }
}
