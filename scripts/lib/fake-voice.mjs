// A phone's voice for a walk or a still (build 98 note 2). Headless Chromium has no voice, so a
// text with no recording could not be heard: Listen opened the Voice sheet instead of playing.
// Added to a context as an init script (ctx.addInitScript(fakeVoice)), before the page asks
// for its voices (lib/listen/speech/engine.ts keeps the first speechSynthesis it meets).
/**
 * A phone's voice for the walk: one local voice, and an utterance that starts at once, says a word
 * every 300ms and ends after a minute, so Listen plays as a phone's voice would.
 */
export function fakeVoice() {
  const voice = { voiceURI: "walk-voice", name: "Walk", lang: navigator.language || "en-US", localService: true, default: true };
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
    for (let i = 1; i < 200; i++) timers.push(setTimeout(() => u.onboundary?.({ name: "word", charIndex: Math.min(i * 6, Math.max(0, u.text.length - 1)), charLength: 5 }), 30 + i * 300));
    timers.push(
      setTimeout(() => {
        queue.shift();
        u.onend?.({});
        synth.speaking = queue.length > 0;
        next();
      }, 60000),
    );
  };
  Object.assign(synth, {
    speaking: false,
    paused: false,
    pending: false,
    getVoices: () => [voice],
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
