// What speaks, for the on-phone voice (1.9): the one seam between the app and
// the engine.
//
// A STUB UNTIL THE ENGINE IS MEASURED. The engine chosen is Kokoro 82M
// (Apache-2.0) run in the web view. Whether it keeps pace on an ordinary
// phone is not known: the web view is not cross-origin isolated, so it runs
// on one thread, and no phone has been timed. Until one has, nothing in the
// app calls an engine, no screen offers the download, and this file holds
// only the shape the player will ask of it, so the download step and the
// picker can be built and tested against it.

export type SpokenSentence = {
  /** The sound of one sentence, as the player takes it. */
  audio: Blob;
  seconds: number;
};

export type PhoneVoiceEngine = {
  /** Make ready with the files the download kept. Rejects where they are not all there. */
  load(): Promise<void>;
  /** Speak one sentence in a voice. A sentence at a time, so the player can begin before a paragraph is done. */
  speak(sentence: string, voice: { id: string; file: ArrayBuffer }): Promise<SpokenSentence>;
  /** Let go of the engine's memory, when the reader stops listening. */
  unload(): Promise<void>;
};

/** Whether an engine is in this build. False until it has been measured on a phone and wired in. */
export const PHONE_VOICE_ENGINE_READY = false;

/** The engine of this build, or null while there is none. */
export function phoneVoiceEngine(): PhoneVoiceEngine | null {
  return null;
}
