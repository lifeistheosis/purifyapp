"use client";

import { useEffect, useState } from "react";

import { machineVerseFileUrl, readMachineVerseFile, type MachineVerseFile } from "@/lib/today/machineVerse";

/**
 * TEMPORARY (lib/today/machineVerse.ts): the machine-translated Verse of the
 * Day's file, for the card.
 *
 * Fetched only for a language that has one switched on, so every other
 * reader fetches nothing. The address is relative, so inside the apps it is
 * read from the bundle with no signal (app/today-data/machine-verse/). Once
 * per session: a file that fails to load or to read is forgotten, and the
 * next card to mount tries again.
 */

const loading = new Map<string, Promise<MachineVerseFile | null>>();

export function loadMachineVerseFile(language: string): Promise<MachineVerseFile | null> {
  let file = loading.get(language);
  if (!file) {
    file = fetch(machineVerseFileUrl(language))
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => readMachineVerseFile(json, language))
      .catch(() => null);
    loading.set(language, file);
    void file.then((read) => {
      if (!read) loading.delete(language);
    });
  }
  return file;
}

/** The file for `language`, or null: no language, not loaded yet, or not loadable. */
export function useMachineVerseFile(language: string | null): MachineVerseFile | null {
  const [file, setFile] = useState<MachineVerseFile | null>(null);
  useEffect(() => {
    if (!language) return;
    let live = true;
    void loadMachineVerseFile(language).then((read) => {
      if (live && read) setFile(read);
    });
    return () => {
      live = false;
    };
  }, [language]);
  return language && file?.language === language ? file : null;
}
