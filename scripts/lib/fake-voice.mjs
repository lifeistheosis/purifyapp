// A phone's voice for a walk or a still (build 98 note 2). Headless Chromium has no voice, so a
// text with no recording could not be heard: Listen opened the Voice sheet instead of playing.
// Added to a context as an init script (ctx.addInitScript(fakeVoice)), before the page asks
// for its voices (lib/listen/speech/engine.ts keeps the first speechSynthesis it meets).
/**
 * A phone's voice for the walk: a local voice in the reader's language, and an English one beside
 * it when that is another (a phone in Arabic still has its English voice, and the texts read aloud
 * are English: with the Arabic voice alone, Listen opened the Voice sheet over an English text,
 * Updates 98g's Arabic walk). An utterance starts at once, says a word every 300ms and ends after a
 * minute, so Listen plays as a phone's voice would.
 *
 * `{ endsWithWords: true }` (the transport walk, Updates 98o): an utterance ends once its words are
 * said, as a phone's does, and the next verse begins. Held a minute, a verse's last word was said
 * again every 300ms, so Play taken up near a verse's end stood still on it, and the clock with it.
 */
export function fakeVoice(o) {
  const endsWithWords = !!o?.endsWithWords;
  const lang = navigator.language || "en-US";
  const voices = [{ voiceURI: "walk-voice", name: "Walk", lang, localService: true, default: true }];
  if (!/^en\b/i.test(lang)) voices.push({ voiceURI: "walk-voice-en", name: "Walk (English)", lang: "en-US", localService: true, default: false });
  let timers = [];
  class Utterance {
    constructor(text) {
      this.text = text;
      this.voice = null;
      this.lang = "";
      this.rate = 1;
      this.volume = 1;
    }
  }
  // One utterance at a time, as a phone's voice queues them: each starts as the one before it
  // ends, says a word every 300ms, and takes a minute.
  const synth = new EventTarget();
  let queue = [];
  const next = () => {
    const u = queue[0];
    if (!u || synth.paused) return;
    synth.speaking = true;
    timers.push(setTimeout(() => u.onstart?.({}), 30));
    const said = endsWithWords ? Math.max(0, Math.ceil(u.text.length / 6) - 1) : 199;
    for (let i = 1; i <= said; i++) timers.push(setTimeout(() => u.onboundary?.({ name: "word", charIndex: Math.min(i * 6, Math.max(0, u.text.length - 1)), charLength: 5 }), 30 + i * 300));
    timers.push(
      setTimeout(() => {
        queue.shift();
        u.onend?.({});
        synth.speaking = queue.length > 0;
        next();
      }, endsWithWords ? 30 + (said + 1) * 300 : 60000),
    );
  };
  Object.assign(synth, {
    speaking: false,
    paused: false,
    pending: false,
    getVoices: () => voices,
    speak(u) {
      queue.push(u);
      if (queue.length === 1) next();
    },
    cancel() {
      for (const t of timers) clearTimeout(t);
      timers = [];
      queue = [];
      synth.speaking = false;
    },
    pause() {
      synth.paused = true;
    },
    resume() {
      synth.paused = false;
    },
  });
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
}
