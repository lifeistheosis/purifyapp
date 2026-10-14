package net.purifyapp.purify.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import net.purifyapp.purify.R;

import java.util.List;

/**
 * The small screen that asks which look a widget should wear, for the
 * families that have more than one (WidgetVariants). The phone opens it when
 * a reader places such a widget; on Android 12 and newer the widget is placed
 * with its first look and this opens again from the widget's settings.
 *
 * <p>Its words are the app's, in the reader's language, from the labels the
 * app hands over; English until the app has been opened once.
 */
public class WidgetConfigureActivity extends Activity {

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Backing out without choosing must not place the widget on old phones,
        // where the configure screen is part of placing it.
        setResult(RESULT_CANCELED);

        Bundle extras = getIntent() == null ? null : getIntent().getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        String family = familyOf(appWidgetId);
        List<String> looks = WidgetVariants.of(family);
        if (looks.size() < 2) {
            done();
            return;
        }

        setContentView(R.layout.widget_configure);
        TextView title = findViewById(R.id.configure_title);
        title.setText(WidgetData.label(this, "chooseLook", "Choose a look"));

        LinearLayout list = findViewById(R.id.configure_list);
        String current = WidgetVariants.get(this, family, appWidgetId);
        for (String look : looks) {
            Button button = (Button) getLayoutInflater().inflate(R.layout.widget_configure_option, list, false);
            String name = WidgetData.label(this, "variant." + family + "." + look, WidgetVariants.english(family, look));
            button.setText(look.equals(current) ? "✓  " + name : name);
            button.setOnClickListener(v -> {
                WidgetVariants.set(this, appWidgetId, look);
                done();
            });
            list.addView(button);
        }
    }

    private void done() {
        WidgetRefresh.one(this, appWidgetId);
        Intent result = new Intent();
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_OK, result);
        finish();
    }

    /** The family of the widget being configured, from its provider's class. */
    private String familyOf(int id) {
        AppWidgetProviderInfo info = AppWidgetManager.getInstance(this).getAppWidgetInfo(id);
        String name = info == null || info.provider == null ? "" : info.provider.getClassName();
        if (name.endsWith(".DayWidgetProvider")) return "today";
        if (name.endsWith(".VerseWidgetProvider")) return "verse";
        if (name.endsWith(".StreakWidgetProvider")) return "streak";
        if (name.endsWith(".CountdownWidgetProvider")) return "countdown";
        if (name.endsWith(".MosaicWidgetProvider")) return "mosaic";
        return "";
    }
}
