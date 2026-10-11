package net.purifyapp.purify;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Where a tapped app icon shortcut lands first (res/xml/shortcuts.xml).
 *
 * <p>It shows nothing. It hands the shortcut's address to MainActivity and
 * goes, and the web layer takes it from there: Capacitor's App plugin reports
 * the address as an opened URL, and components/native/ShortcutListener.tsx
 * turns it into a screen.
 *
 * <h2>Why the shortcuts do not open MainActivity themselves</h2>
 *
 * <p>Android starts a static shortcut's activity with NEW_TASK and CLEAR_TASK,
 * always, and the file that declares it cannot say otherwise. Pointed at
 * MainActivity that would destroy it and build it again on every use: the app
 * would reload from the splash screen while it was already open, and whatever
 * was playing would stop. So the task that gets emptied is this activity's
 * own (taskAffinity="" in the manifest), and MainActivity, which is
 * singleTask, is brought forward as it is and told through onNewIntent. When
 * the app is not running, the same call starts it.
 */
public class ShortcutActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent open = new Intent(this, MainActivity.class);
        Intent tapped = getIntent();
        Uri address = tapped == null ? null : tapped.getData();
        // Anything that is not one of ours still opens the app, with nothing
        // to tell it.
        if (isShortcut(address)) {
            open.setAction(Intent.ACTION_VIEW);
            open.setData(address);
        }
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(open);

        // Theme.NoDisplay: an activity with nothing to show has to finish
        // before it is resumed.
        finish();
    }

    /** True for one of the shortcuts' addresses: net.purifyapp.purify://shortcut/... */
    static boolean isShortcut(Uri address) {
        return address != null
                && "net.purifyapp.purify".equals(address.getScheme())
                && "shortcut".equals(address.getHost());
    }
}
