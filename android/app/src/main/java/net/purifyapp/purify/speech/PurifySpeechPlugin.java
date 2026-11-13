package net.purifyapp.purify.speech;

import android.media.AudioAttributes;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * The phone's own voices, for Purify's player (1.9, build 95 note 25: the
 * choice of voices, by the phone's own voices). The Android web view has no
 * speech of its own, so the app asks the phone's TextToSpeech here, and the
 * player (lib/listen/speech/engine.ts, session.ts) plays it as it plays a
 * recording.
 *
 * Only voices on the phone are listed: one that needs the network, or is not
 * installed, is left out, so a reading never sends its text away.
 *
 * A text comes as its pieces (verses, or paragraphs), all queued at once, so
 * the phone reads on with the screen off. Each report names the ask it
 * answers (token) and the piece (index), and a word's letters are counted in
 * the piece as it was given, so the player lights the very word said.
 *
 * The phone's speech service is the engine's own process; this asks for no
 * audio focus, so the ambience the web view plays goes on under the voice
 * and the player's balance lowers it, as it does under a recording.
 */
@CapacitorPlugin(name = "PurifySpeech")
public class PurifySpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;
    private boolean failed = false;
    private final List<Runnable> waiting = new ArrayList<>();

    /** Run once the phone's speech is ready; a phone with none rejects. */
    private synchronized void withSpeech(PluginCall call, Runnable action) {
        if (failed) {
            call.reject("This phone has no speech engine.");
            return;
        }
        if (ready) {
            action.run();
            return;
        }
        waiting.add(() -> {
            if (failed) call.reject("This phone has no speech engine.");
            else action.run();
        });
        if (tts == null) {
            tts = new TextToSpeech(getContext().getApplicationContext(), status -> {
                List<Runnable> now;
                synchronized (PurifySpeechPlugin.this) {
                    ready = status == TextToSpeech.SUCCESS;
                    failed = !ready;
                    if (ready) {
                        tts.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build());
                        tts.setOnUtteranceProgressListener(progress);
                    }
                    now = new ArrayList<>(waiting);
                    waiting.clear();
                }
                for (Runnable r : now) r.run();
            });
        }
    }

    /** An utterance's id: token|index|shift|first|last|count, where shift is where its letters begin in the piece. */
    private final UtteranceProgressListener progress = new UtteranceProgressListener() {
        @Override
        public void onStart(String id) {
            String[] p = parts(id);
            if (p == null || !"1".equals(p[3])) return;
            send("start", p, -1, -1);
        }

        @Override
        public void onRangeStart(String id, int start, int end, int frame) {
            String[] p = parts(id);
            if (p == null) return;
            int shift = Integer.parseInt(p[2]);
            send("word", p, start + shift, end + shift);
        }

        @Override
        public void onDone(String id) {
            String[] p = parts(id);
            if (p == null || !"1".equals(p[4])) return;
            send("done", p, -1, -1);
            if (Integer.parseInt(p[1]) == Integer.parseInt(p[5]) - 1) send("end", p, -1, -1);
        }

        @Override
        public void onError(String id) {
            String[] p = parts(id);
            if (p != null) send("error", p, -1, -1);
        }

        @Override
        public void onError(String id, int code) {
            onError(id);
        }

        @Override
        public void onStop(String id, boolean interrupted) {
            // Stopped by the player: no report.
        }
    };

    private static String[] parts(String id) {
        if (id == null || id.startsWith("preview")) return null;
        String[] p = id.split("\\|");
        return p.length == 6 ? p : null;
    }

    private void send(String type, String[] p, int start, int end) {
        JSObject e = new JSObject();
        e.put("type", type);
        e.put("token", Integer.parseInt(p[0]));
        e.put("index", Integer.parseInt(p[1]));
        if (start >= 0) {
            e.put("start", start);
            e.put("end", end);
        }
        notifyListeners("speech", e);
    }

    private boolean onDevice(Voice v) {
        Set<String> features = v.getFeatures();
        boolean missing = features != null && features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
        return !v.isNetworkConnectionRequired() && !missing;
    }

    /** The voice asked for, else the phone's own for the language. */
    private void useVoice(String id, String lang) {
        if (id != null && tts.getVoices() != null) {
            for (Voice v : tts.getVoices()) {
                if (v.getName().equals(id) && onDevice(v)) {
                    tts.setVoice(v);
                    return;
                }
            }
        }
        tts.setLanguage(Locale.forLanguageTag(lang));
    }

    @PluginMethod
    public void voices(PluginCall call) {
        withSpeech(call, () -> {
            JSArray list = new JSArray();
            Voice standard = null;
            try {
                standard = tts.getDefaultVoice();
            } catch (Exception ignored) {
                // An engine that cannot say: no voice is marked as the phone's own.
            }
            Set<Voice> all = tts.getVoices();
            if (all != null) {
                for (Voice v : all) {
                    if (!onDevice(v)) continue;
                    JSObject o = new JSObject();
                    o.put("id", v.getName());
                    o.put("name", v.getName());
                    o.put("lang", v.getLocale().toLanguageTag());
                    o.put("quality", v.getQuality());
                    if (standard != null && standard.getName().equals(v.getName())) o.put("default", true);
                    list.put(o);
                }
            }
            JSObject result = new JSObject();
            result.put("voices", list);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        withSpeech(call, () -> {
            try {
                JSArray pieces = call.getArray("pieces", new JSArray());
                int token = call.getInt("token", 0);
                int from = call.getInt("from", 0);
                int offset = call.getInt("offset", 0);
                String lang = call.getString("lang", "en");
                String voice = call.getString("voice");
                float rate = call.getFloat("rate", 1f);
                float volume = call.getFloat("volume", 1f);
                int count = pieces.length();
                tts.stop();
                useVoice(voice, lang);
                tts.setSpeechRate(Math.max(0.25f, Math.min(4f, rate)));
                int max = Math.max(200, TextToSpeech.getMaxSpeechInputLength() - 100);
                for (int i = Math.max(0, from); i < count; i++) {
                    String piece = pieces.getString(i);
                    int shift = i == from ? Math.max(0, Math.min(offset, piece.length())) : 0;
                    List<int[]> chunks = chunks(piece, shift, max);
                    for (int c = 0; c < chunks.size(); c++) {
                        int[] span = chunks.get(c);
                        Bundle params = new Bundle();
                        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0f, Math.min(1f, volume)));
                        String id = token + "|" + i + "|" + span[0] + "|" + (c == 0 ? 1 : 0) + "|" + (c == chunks.size() - 1 ? 1 : 0) + "|" + count;
                        tts.speak(piece.substring(span[0], span[1]), TextToSpeech.QUEUE_ADD, params, id);
                    }
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Could not speak: " + e.getMessage());
            }
        });
    }

    /** A piece cut where the phone's limit asks, at a space, from `shift` on. */
    private static List<int[]> chunks(String piece, int shift, int max) {
        List<int[]> out = new ArrayList<>();
        int at = shift;
        while (at < piece.length()) {
            int end = Math.min(piece.length(), at + max);
            if (end < piece.length()) {
                int space = piece.lastIndexOf(' ', end);
                if (space > at) end = space + 1;
            }
            out.add(new int[] { at, end });
            at = end;
        }
        if (out.isEmpty()) out.add(new int[] { shift, piece.length() });
        return out;
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null && ready) tts.stop();
        call.resolve();
    }

    @PluginMethod
    public void preview(PluginCall call) {
        withSpeech(call, () -> {
            tts.stop();
            useVoice(call.getString("voice"), call.getString("lang", "en"));
            tts.setSpeechRate(Math.max(0.25f, Math.min(4f, call.getFloat("rate", 1f))));
            tts.speak(call.getString("text", ""), TextToSpeech.QUEUE_FLUSH, null, "preview");
            call.resolve();
        });
    }

    /** The iPhone draws its lock screen here; on Android the player's own (the media session plugin) shows the voice. */
    @PluginMethod
    public void nowPlaying(PluginCall call) {
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ready = false;
        super.handleOnDestroy();
    }
}
