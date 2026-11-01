package net.purifyapp.purify.widget;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationManagerCompat;

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

import net.purifyapp.purify.MainActivity;

/**
 * How the app hands the widgets what only it knows: the reader's calendar,
 * their streak, the prayers they kept, their patron saint, the next update,
 * and every word in their language (docs/WIDGETS.md, section 2).
 *
 * <p>update({ entries }), the same name on the iPhone. It keeps only the six
 * keys of the contract and drops anything else, so nothing the page sends can
 * grow into a store of its own here, then asks every placed widget to draw
 * again. The app's side is lib/widget/bridge.ts, which sends a key only when
 * its value changed.
 *
 * <p>And on Android only, notificationsEnabled(): whether the phone shows
 * Purify's notifications at all (lib/push/native.ts asks it). The app's own
 * bridge is the one native code the app carries, so the question lives here
 * rather than in a plugin of its own.
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

    /**
     * Whether Purify's notifications can be shown: not switched off for the
     * whole app in the phone's settings, and the push channel not blocked.
     *
     * <p>On Android 12 and older there is no permission to ask, so the push
     * plugin answers "granted" whatever the reader set (its checkPermissions),
     * and the app showed reminders as on while the phone hid every one. On 13
     * and newer the permission follows the app's own switch, but a channel
     * blocked on its own does not show there either. This answers both.
     */
    @PluginMethod
    public void notificationsEnabled(PluginCall call) {
        Context context = getContext();
        boolean enabled = NotificationManagerCompat.from(context).areNotificationsEnabled();
        if (enabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            NotificationChannel channel = manager == null ? null : manager.getNotificationChannel(MainActivity.PUSH_CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) enabled = false;
        }
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }
}
