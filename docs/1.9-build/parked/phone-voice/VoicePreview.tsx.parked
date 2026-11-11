"use client";

// The Voice section as the owner is shown it before it is built in (1.9):
// only in a build made with NEXT_PUBLIC_PHONE_VOICE_PREVIEW=1, which no store
// build and no website build sets, so in every release this is nothing.
//
// The picture needs what a reader's phone cannot have yet: Plus voices he has
// not chosen, and each state of a download no engine is behind. So here two
// of the candidates stand as if kept, and the address may name the state to
// show (?voice=fetching). scripts/mock-phone-voice.mjs photographs it.

import { useSyncExternalStore } from "react";

import type { DownloadState } from "@/lib/listen/phoneVoiceDownload";
import { PHONE_VOICES } from "@/lib/listen/phoneVoices";

import { PHONE_VOICE_ABOUT_BYTES, VoiceSection } from "./VoiceSection";

export const PHONE_VOICE_PREVIEW = process.env.NEXT_PUBLIC_PHONE_VOICE_PREVIEW === "1";

const SHOWN = ["af_heart", "bm_george", "bf_emma"];

const STATES: Record<string, DownloadState> = {
  none: { phase: "none" },
  wifi: { phase: "waiting", waiting: "wifi", done: 0, total: PHONE_VOICE_ABOUT_BYTES },
  fetching: { phase: "fetching", done: 41_000_000, total: PHONE_VOICE_ABOUT_BYTES },
  ready: { phase: "ready", bytes: PHONE_VOICE_ABOUT_BYTES },
};

const never = () => () => {};

export function VoicePreview() {
  const asked = useSyncExternalStore(
    never,
    () => new URLSearchParams(window.location.search).get("voice") ?? "none",
    () => "none",
  );
  if (!PHONE_VOICE_PREVIEW) return null;
  const voices = PHONE_VOICES.filter((v) => SHOWN.includes(v.id)).map((v) => ({ ...v, offered: true }));
  return <VoiceSection voices={voices} state={STATES[asked] ?? STATES.none} />;
}
