package net.purifyapp.purify;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Required by @capacitor-community/safe-area so the system reports
        // correct safe-area insets under Android's forced edge-to-edge mode.
        EdgeToEdge.enable(this);
        // Paint the window background the app's night color. Under edge-to-edge,
        // when the soft keyboard opens the webview is resized above it; the area
        // it no longer covers falls back to the window background, which is a
        // default grey and showed as a large grey box on the sign-in form.
        // Matching it to #101013 makes that gap blend into the app.
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#101013")));
        createPushChannel();
    }

    /**
     * The channel every push is posted to: ANDROID_CHANNEL_ID in
     * lib/push/providers/fcm.ts, and Firebase's default in the manifest.
     * High importance is what lets a push show as a banner. Without a channel
     * of its own, Firebase used its "Miscellaneous" fallback at default
     * importance, where a push is only a small icon in the status bar, and a
     * broadcast Firebase had accepted looked like nothing arrived. Creating a
     * channel that exists changes nothing, and a reader's own setting for it
     * always wins.
     */
    private void createPushChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            "purify",
            getString(R.string.push_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.push_channel_description));
        manager.createNotificationChannel(channel);
    }
}
