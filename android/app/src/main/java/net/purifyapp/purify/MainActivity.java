package net.purifyapp.purify;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
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
    }
}
