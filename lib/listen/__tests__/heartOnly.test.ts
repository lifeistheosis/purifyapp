// Heart alone (his word of 2026-11-16, about 22:35 UTC: "remove locally LLM
// voices and full drop and turn on campaigns etc (only leave one the standard
// prerecorded voices)").
//
// What it holds:
//   no phone's voice   nothing the app runs reaches the phone's or the
//                      browser's speech: lib/listen/speech/ is gone, and no
//                      page, component or library names speechSynthesis, the
//                      apps' PurifySpeech plugin or a spoken track
//   no Voice sheet     the sheet, its mount in the root frame, the player's
//                      Voice row and its words are gone: one voice, nothing
//                      to choose
//   Listen where Heart reads
//                      a chapter of the English Bible that has Heart's
//                      recording (the New Testament) shows Listen; a chapter
//                      that has none (the Old Testament, until Heart's
//                      recordings land) shows none, and neither does a chapter
//                      shown in a downloaded Bible, nor a life, a council, a
//                      study or an event with no recording
//
// What a reader would notice if this broke: a Listen that plays a robot voice
// they were promised is gone, or a Listen that plays nothing; a Voice row in
// the player's ••• that opens a choice with one voice in it.
//
// The native plugin's files and their registration are left as build 100 has
// them (android/.../speech/, ios/App/App/PurifySpeechPlugin.swift): the app
// never calls them, which is what is held here.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListenButton, ReadAloudPillButton } from "@/components/bible/ReadAloud";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ListenPillButton } from "@/components/reading/ListenHere";
import books from "@/data/bible/books.json";
import carriedTexts from "@/data/listen/index.json";
import carriedChapters from "@/data/readAloud/index.json";
import { downloadableBible } from "@/lib/bible/downloads/catalog";
import { getMessages } from "@/lib/i18n";
import en from "@/lib/i18n/messages/en.json";
import { listenId } from "@/lib/listen/texts";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

type ProviderProps = Parameters<typeof MessagesProvider>[0];
function render(node: ReactElement): string {
  return renderToString(createElement(MessagesProvider, { locale: "en", messages: getMessages("en") } as ProviderProps, node));
}

/** Every source file the app is built from: pages, components and libraries, tests left out. */
function sources(): string[] {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "app", "components", "lib"], { cwd: ROOT, encoding: "utf8" });
  return out
    .split("\n")
    .filter((f) => /\.(?:tsx?|mjs|js)$/.test(f))
    .filter((f) => !/(^|\/)__tests__\//.test(f))
    .filter((f) => fs.existsSync(path.join(ROOT, f)));
}

describe("the phone's own voices are gone (his word of 2026-11-16)", () => {
  it("leaves no speech library behind", () => {
    expect(fs.existsSync(path.join(ROOT, "lib/listen/speech"))).toBe(false);
  });

  it("is reached by nothing the app runs: no import of it, no speech engine, no spoken track", () => {
    const reaches: string[] = [];
    for (const file of sources()) {
      const text = read(file);
      for (const word of ["listen/speech", "speechSynthesis", "SpeechSynthesisUtterance", "PurifySpeech", "setSpokenTrack", "isSpoken("]) {
        if (text.includes(word)) reaches.push(`${file}: ${word}`);
      }
    }
    expect(reaches).toEqual([]);
  });
});

describe("one voice, nothing to choose: the Voice sheet is gone", () => {
  it("and every door to it: the root frame, Now Playing, the player's •••", () => {
    expect(fs.existsSync(path.join(ROOT, "components/player/VoiceSheet.tsx"))).toBe(false);
    const doors: string[] = [];
    for (const file of sources()) {
      const text = read(file);
      for (const word of [/\bVoiceSheet\b/, /\bopenVoiceSheet\b/, /\buseVoiceRowValue\b/, /\bonVoice\b/, /t\("player\.voice"\)/]) {
        if (word.test(text)) doors.push(`${file}: ${word.source}`);
      }
    }
    expect(doors).toEqual([]);
  });

  it("and its words, in every language", () => {
    expect(Object.keys(en).filter((k) => k === "player.voice" || k.startsWith("player.voice."))).toEqual([]);
  });
});

describe("Listen stands only where Heart's recording is", () => {
  const recorded = new Set(carriedChapters as string[]);
  const newTestament = (books as { slug: string; testament: string; chapters: number }[]).filter((b) => b.testament === "NT");
  const oldTestament = (books as { slug: string; testament: string; chapters: number }[]).filter((b) => b.testament === "OT");
  // A New Testament chapter Heart has read, and an Old Testament chapter it has not, from the lists a build carries.
  const heard = newTestament.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.slug, chapter: i + 1 }))).find((c) => recorded.has(`${c.book}/${c.chapter}`));
  const unheard = oldTestament.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.slug, chapter: i + 1 }))).find((c) => !recorded.has(`${c.book}/${c.chapter}`));
  const life = listenId("life", "xenia-of-petersburg");

  it("on a New Testament chapter with its recording: Listen, in the pill and in the toolbar", () => {
    expect(heard, "a New Testament chapter with Heart's recording").toBeTruthy();
    const pill = render(createElement(ReadAloudPillButton, { book: heard!.book, chapter: heard!.chapter, title: `${heard!.book} ${heard!.chapter}` }));
    expect(pill).toContain("data-read-aloud-play");
    expect(pill).toContain(">Listen<");
    const toolbar = render(createElement(ListenButton, { book: heard!.book, chapter: heard!.chapter, bookName: heard!.book }));
    expect(toolbar).toContain(">Listen<");
  });

  it.skipIf(!unheard)("on a chapter with no recording: no Listen at all", () => {
    expect(render(createElement(ReadAloudPillButton, { book: unheard!.book, chapter: unheard!.chapter, title: "x" }))).toBe("");
    expect(render(createElement(ListenButton, { book: unheard!.book, chapter: unheard!.chapter, bookName: unheard!.book }))).toBe("");
  });

  it("on a chapter shown in a downloaded Bible: none, since Heart reads the English", () => {
    const russian = downloadableBible("ru-synodal");
    expect(russian).toBeTruthy();
    expect(render(createElement(ReadAloudPillButton, { book: heard!.book, chapter: heard!.chapter, title: "x", bible: russian }))).toBe("");
    expect(render(createElement(ListenButton, { book: heard!.book, chapter: heard!.chapter, bookName: heard!.book, bible: russian }))).toBe("");
  });

  it.skipIf((carriedTexts as string[]).includes(life))("on a life with no recording: no Listen in its foot pill", () => {
    expect(render(createElement(ListenPillButton, { text: { id: life, title: "St Xenia of Petersburg", by: "Purify" } }))).toBe("");
  });
});
