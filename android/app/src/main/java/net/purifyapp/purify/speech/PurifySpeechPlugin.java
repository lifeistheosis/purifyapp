package net.purifyapp.purify.speech;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
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
 * The phone's speech service is the engine's own process. While a text is
 * read the app holds the phone's audio focus for media speech, as a player
 * does, so a phone call, the assistant, an alarm or another app taking the
 * sound stops the voice at its word and says so ("interruption"), and the
 * player shows it paused there; when a call or the assistant is over the
 * phone gives the sound back and the reading goes on, as a recording does in
 * the web view. Another app that keeps the sound leaves the reading paused for
 * the reader. A sound that only asks the others to go quieter for a moment (a
 * notification, a navigation prompt) is left to the phone. The ambience is the
 * web view's own Web Audio, which holds no focus, so it goes on under the voice
 * and the player's balance lowers it, as it does under a recording.
 */
@CapacitorPlugin(name = "PurifySpeech")
public class PurifySpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;
    private boolean failed = false;
    private final List<Runnable> waiting = new ArrayList<>();

    /** How the voice sounds to the phone: media, and speech. */
    private static final AudioAttributes SPEECH = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build();
    /** A text is being read: its pieces are queued and the last is not done. */
    private boolean reading = false;
    /** The ask being read (its token), so a report from one stopped a moment ago lets nothing go. */
    private int current = -1;
    /** The app holds the phone's audio focus. */
    private volatile boolean focused = false;
    /** The phone took the sound for a moment (a call, the assistant) while a text was read: say when it gives it back. */
    private boolean lostForAMoment = false;
    private AudioFocusRequest focusRequest;
    private final AudioManager.OnAudioFocusChangeListener onFocus = this::focusChanged;

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
                        tts.setAudioAttributes(SPEECH);
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
            if (Integer.parseInt(p[1]) == Integer.parseInt(p[5]) - 1) {
                send("end", p, -1, -1);
                finishedReading(Integer.parseInt(p[0]));
            }
        }

        @Override
        public void onError(String id) {
            String[] p = parts(id);
            if (p == null) return;
            send("error", p, -1, -1);
            finishedReading(Integer.parseInt(p[0]));
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

    /** The phone took the sound, or gave it back. Called on the main thread. */
    private void focusChanged(int change) {
        if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            // A call, the assistant, an alarm: stop at the word, and keep the claim to hear when it is over.
            synchronized (this) {
                if (!reading) return;
                reading = false;
                lostForAMoment = true;
                if (tts != null && ready) tts.stop();
            }
            interruption(true, false);
        } else if (change == AudioManager.AUDIOFOCUS_LOSS) {
            // Another app has the sound for good: the reading waits for the reader.
            boolean was;
            synchronized (this) {
                was = reading || lostForAMoment;
                if (reading && tts != null && ready) tts.stop();
                reading = false;
            }
            dropFocus();
            if (was) interruption(true, false);
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            boolean back;
            synchronized (this) {
                back = lostForAMoment;
                lostForAMoment = false;
            }
            if (back) interruption(false, true);
        }
        // AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK (a notification, a navigation prompt): left to the phone.
    }

    private void interruption(boolean began, boolean resume) {
        JSObject e = new JSObject();
        e.put("type", "interruption");
        e.put("began", began);
        if (!began) e.put("resume", resume);
        notifyListeners("speech", e);
    }

    private AudioManager audio() {
        return (AudioManager) getContext().getApplicationContext().getSystemService(Context.AUDIO_SERVICE);
    }

    /** Ask the phone for the sound, as a player does. False while it will not give it (a call under way). */
    @SuppressWarnings("deprecation")
    private synchronized boolean takeFocus() {
        if (focused) return true;
        AudioManager manager = audio();
        if (manager == null) return true;
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(SPEECH)
                        .setOnAudioFocusChangeListener(onFocus)
                        .build();
            }
            result = manager.requestAudioFocus(focusRequest);
        } else {
            result = manager.requestAudioFocus(onFocus, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
        focused = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        return focused;
    }

    /** Let the phone's sound go: the reading stopped, ended, or another app has it. */
    @SuppressWarnings("deprecation")
    private synchronized void dropFocus() {
        lostForAMoment = false;
        if (!focused) return;
        focused = false;
        AudioManager manager = audio();
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) manager.abandonAudioFocusRequest(focusRequest);
        } else {
            manager.abandonAudioFocus(onFocus);
        }
    }

    /** The last piece of the reading now is done, or it failed: the sound is let go. */
    private void finishedReading(int token) {
        synchronized (this) {
            if (token != current) return;
            reading = false;
        }
        dropFocus();
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
                synchronized (this) {
                    reading = false;
                    lostForAMoment = false;
                    current = token;
                }
                // Not over a call: the reading waits, paused at its place, for the reader.
                if (!takeFocus()) {
                    interruption(true, false);
                    call.resolve();
                    return;
                }
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
                synchronized (this) {
                    reading = from < count;
                }
                if (from >= count) dropFocus();
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
        synchronized (this) {
            reading = false;
        }
        if (tts != null && ready) tts.stop();
        dropFocus();
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
        reading = false;
        dropFocus();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ready = false;
        super.handleOnDestroy();
    }
}
