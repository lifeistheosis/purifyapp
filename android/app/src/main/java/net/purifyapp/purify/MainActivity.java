package net.purifyapp.purify;

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
    }
}
