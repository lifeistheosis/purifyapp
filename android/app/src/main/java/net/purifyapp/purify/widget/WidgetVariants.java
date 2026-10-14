package net.purifyapp.purify.widget;

import android.content.Context;

import java.util.Arrays;
import java.util.List;

/**
 * Which look a placed widget wears, for the families that have more than one
 * (docs/WIDGETS.md, "The seven families"). Each family is one entry in the
 * phone's widget picker, so the picker stays tidy; the look is chosen on the
 * configure screen when the widget is placed, and can be changed later on
 * Android 12 and newer. A widget that was never configured wears its family's
 * first look.
 */
public final class WidgetVariants {

    private WidgetVariants() {}

    /** A family's looks, the first being the one a widget wears until told otherwise. */
    static List<String> of(String family) {
        switch (family) {
            case "verse": return Arrays.asList("minimal", "mosaic");
            case "today": return Arrays.asList("day", "week", "rotating");
            case "streak": return Arrays.asList("number", "ring");
            case "countdown": return Arrays.asList("fast", "feast", "update");
            case "mosaic": return Arrays.asList("season", "cross", "lampada");
            default: return Arrays.asList("default");
        }
    }

    /** The English name of a look, for the configure screen when the app has not handed over its words. */
    static String english(String family, String variant) {
        switch (family + "." + variant) {
            case "verse.minimal": return "Minimal";
            case "verse.mosaic": return "On Mosaic art";
            case "today.day": return "Saint and fast";
            case "today.week": return "The week";
            case "today.rotating": return "Rotating";
            case "streak.number": return "Number";
            case "streak.ring": return "Ring";
            case "countdown.fast": return "Next fast";
            case "countdown.feast": return "Next feast";
            case "countdown.update": return "Next Purify update";
            case "mosaic.season": return "The season";
            case "mosaic.cross": return "The cross";
            case "mosaic.lampada": return "The lampada";
            default: return variant;
        }
    }

    private static String keyFor(int appWidgetId) {
        return "variant." + appWidgetId;
    }

    static String get(Context context, String family, int appWidgetId) {
        List<String> looks = of(family);
        String chosen = WidgetData.prefs(context).getString(keyFor(appWidgetId), null);
        return chosen != null && looks.contains(chosen) ? chosen : looks.get(0);
    }

    static void set(Context context, int appWidgetId, String variant) {
        WidgetData.prefs(context).edit().putString(keyFor(appWidgetId), variant).apply();
    }

    static void forget(Context context, int appWidgetId) {
        WidgetData.prefs(context).edit().remove(keyFor(appWidgetId)).apply();
    }
}
