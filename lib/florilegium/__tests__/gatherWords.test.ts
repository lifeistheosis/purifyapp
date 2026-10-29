// The Gather button in every language (found while fixing the owner's build
// 80 notes, Homebase/boards/purify-master/r18/BUILD-80-NOTES.md, 2026-10-29).
// components/florilegium/AddToFlorilegium.tsx wrote its words out in English:
// "Gather" on the button, "Gathered into {name}" once a line was gathered, and
// "Untitled gathering" for a gathering left unnamed, so a phone set to Greek
// drew an English button under a Greek quotation. The button asks the catalog
// now (study.gather, study.florilegium.gatheredInto), and every screen that
// makes a gathering names an unnamed one with study.florilegium.untitled
// before the store keeps it: the store keeps the title it is given, and its
// own fallback is English.
//
// What it does not hold: whether the words are the right ones. They use each
// catalog's own words for gather, a gathering and a title, and wait for a
// native reader like the rest.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import { AddToFlorilegium } from "@/components/florilegium/AddToFlorilegium";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { getMessages } from "@/lib/i18n";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const catalog = (c: string) => JSON.parse(read(`lib/i18n/messages/${c}.json`)) as Record<string, string>;

type ProviderProps = Parameters<typeof MessagesProvider>[0];

const EN = catalog("en");
const CODES = LOCALES.map((l) => l.code);
const BUTTON = "components/florilegium/AddToFlorilegium.tsx";
const MAKERS = [BUTTON, "components/florilegium/FlorilegiumPickerSheet.tsx", "components/florilegium/FlorilegiaHub.tsx"];

// Each new key, and the key of the same feature it sits right after.
const NEW: [string, string][] = [
  ["study.florilegium.gatheredInto", "study.florilegium.gatherInto"],
  ["study.florilegium.untitled", "study.florilegium.title"],
];

describe("the Gather button's words", () => {
  it("are in all twenty-one catalogs, in each one's own words, beside the florilegium's other keys", () => {
    expect(CODES).toHaveLength(21);
    expect(EN["study.florilegium.gatheredInto"]).toBe("Gathered into {name}");
    expect(EN["study.florilegium.untitled"]).toBe("Untitled gathering");
    for (const c of CODES) {
      const words = catalog(c);
      const keys = Object.keys(words);
      for (const [key, after] of NEW) {
        expect(words[key]?.trim(), `${c} ${key}`).toBeTruthy();
        expect(keys.indexOf(key), `${c}: ${key} sits right after ${after}`).toBe(keys.indexOf(after) + 1);
        if (c !== "en") expect(words[key], `${c} ${key} is not the English copied`).not.toBe(EN[key]);
      }
      expect(words["study.florilegium.gatheredInto"].match(/\{name\}/g)?.length, `${c} keeps {name} once`).toBe(1);
      expect(words["study.florilegium.untitled"], `${c} has nothing to fill in`).not.toMatch(/[{}]/);
    }
  });

  it("are asked of the catalog, never written out", () => {
    const button = code(BUTTON);
    expect(button).toContain('{done ? t("study.florilegium.gatheredInto", { name: done }) : t("study.gather")}');
    expect(button).not.toMatch(/Gathered into|Untitled gathering|"Gather"|`Gather/);
  });

  it("name an unnamed gathering in the reader's language wherever one is made", () => {
    for (const file of MAKERS) {
      const source = code(file);
      expect(source, file).toContain('title.trim() || t("study.florilegium.untitled")');
      // Never the bare title, which the store would name in English.
      expect(source, file).not.toMatch(/\bcreate\(title\)/);
    }
  });

  it("draws the button in the reader's language", () => {
    const item = { kind: "father" as const, text: "Let no one fear death.", author: "St. John Chrysostom" };
    for (const c of ["el", "ru", "ar", "ka"] as LocaleCode[]) {
      const messages = getMessages(c);
      const html = renderToString(createElement(MessagesProvider, { locale: c, messages } as ProviderProps, createElement(AddToFlorilegium, { item })));
      const button = /<button[^>]*data-gather=""[^>]*>([\s\S]*?)<\/button>/.exec(html)?.[1] ?? "";
      const words = button.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      expect(words, c).toBe(messages["study.gather"]);
      expect(words, c).not.toBe(EN["study.gather"]);
    }
  });
});
