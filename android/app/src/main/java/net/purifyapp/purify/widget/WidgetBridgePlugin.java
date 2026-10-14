package net.purifyapp.purify.widget;

import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

/**
 * How the app hands the widgets what only it knows: the reader's calendar,
 * their streak, the prayers they kept, their patron saint, the next update,
 * and every word in their language (docs/WIDGETS.md, section 2).
 *
 * <p>One method, update({ entries }), the same name on the iPhone. It keeps
 * only the six keys of the contract and drops anything else, so nothing the
 * page sends can grow into a store of its own here, then asks every placed
 * widget to draw again. The app's side is lib/widget/bridge.ts, which sends a
 * key only when its value changed.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    static final Set<String> KEYS = new HashSet<>(Arrays.asList(
            "calendarStyle", "labels", "streak", "prayed", "patron", "update"));

    @PluginMethod
    public void update(PluginCall call) {
        JSObject entries = call.getObject("entries");
        int stored = 0;
        if (entries != null) {
            SharedPreferences.Editor editor = WidgetData.prefs(getContext()).edit();
            Iterator<String> keys = entries.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                if (!KEYS.contains(key)) continue;
                Object value = entries.opt(key);
                if (value instanceof String) {
                    editor.putString(key, (String) value);
                    stored++;
                } else if (value == null || value == JSONObject.NULL) {
                    // A value the app no longer has (a patron saint cleared) goes too.
                    editor.remove(key);
                    stored++;
                }
            }
            editor.apply();
        }
        if (stored > 0) WidgetRefresh.all(getContext());
        JSObject result = new JSObject();
        result.put("stored", stored);
        call.resolve(result);
    }
}
