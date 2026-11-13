// What a sound that could not play says, on the ambience sheet and in the
// Plus preview (build 95, note 11).
//
// A reader without Plus meets the lock: every sound wears the padlock and a
// tap opens the upgrade sheet. The failure line must never stand in its
// place. It did: the upgrade sheet's preview plays Rain through the one
// player, and when that failed (as it did in every iPhone app, the note's
// cause) the failure was kept, and the ambience sheet behind printed "Could
// not play" on Rain beside its padlock, which reads as a feature that does
// not work rather than one that is Plus.
//
// And the line says what is true: "Needs a connection" when the website
// could not be reached (on the website every sound comes from it), and
// otherwise that a tap tries again, since a failure is not kept.

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AmbienceSnapshot } from "@/lib/ambience/player";

let plus: boolean | null;
let snap: AmbienceSnapshot;

vi.mock("next/navigation", () => ({ usePathname: () => "/bible/john/1" }));
vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k, locale: "en" }) }));
vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ open, titleExtra, children }: { open: boolean; titleExtra?: ReactNode; children: ReactNode }) =>
    open ? createElement("div", { role: "dialog" }, titleExtra, children) : null,
}));
vi.mock("@/components/billing/UpgradeModal", () => ({
  UpgradeModalProvider: ({ children }: { children: ReactNode }) => children,
  useUpgradeModal: () => ({ open: () => {} }),
}));
vi.mock("@/lib/entitlements/usePlusFeatures", () => ({ usePlusFeatures: () => plus }));
vi.mock("@/lib/ambience/sheet", () => ({ useAmbienceSheet: () => ({ open: true, overPlayer: false }), closeAmbience: () => {} }));
vi.mock("@/lib/ambience/player", () => ({
  DEFAULT_LEVEL: 1,
  useAmbience: () => snap,
  layerAmbience: async () => {},
  playAmbience: async () => {},
  setAmbienceBalance: () => {},
  setAmbienceLevel: () => {},
  setAmbienceVolume: () => {},
}));
vi.mock("@/lib/player/sleep", () => ({
  isChosen: () => false,
  minutesLeft: () => 0,
  setSleepTimer: () => {},
  useSleepTimer: () => ({ kind: "off" }),
}));
vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ playing: false, src: null }),
  subscribeAudio: () => () => {},
}));
vi.mock("@/components/player/AmbienceButton", () => ({ AmbienceIcon: () => null }));
// The preview's frame and page, which have nothing to say here.
vi.mock("@/components/billing/plusTry/TryKit", () => ({
  TryWindow: ({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) => createElement("div", null, children, overlay),
  TryStrip: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  TryTile: ({ children }: { children: ReactNode }) => createElement("button", { type: "button" }, children),
}));
vi.mock("@/components/billing/plusTry/TryBible", () => ({ JohnPage: () => null }));
vi.mock("@/lib/premium/plusTrySound", () => ({
  trySound: () => {},
  useTrySound: () => ({ feature: "ambience", startedAt: 0, ended: false }),
}));

const QUIET: AmbienceSnapshot = { playing: null, loading: null, failed: null, failedFor: null, volume: 0.55, balance: 0.4, last: null, layers: [], levels: {} };

beforeEach(() => {
  plus = true;
  snap = { ...QUIET };
});

async function sheet(): Promise<string> {
  const { AmbienceSheet } = await import("@/components/player/AmbienceSheet");
  return renderToStaticMarkup(createElement(AmbienceSheet));
}

async function preview(): Promise<string> {
  const { default: TryAmbience } = await import("@/components/billing/plusTry/TryAmbience");
  const row = { id: "ambience", name: "plus.ambience.title" } as unknown as Parameters<typeof TryAmbience>[0]["row"];
  return renderToStaticMarkup(createElement(TryAmbience, { row }));
}

describe("the ambience sheet, for a reader without Plus", () => {
  it("shows the lock on every sound and never the failure line, even after the preview's sound failed", async () => {
    plus = false;
    for (const failedFor of ["error", "connection"] as const) {
      snap = { ...QUIET, failed: "rain", failedFor, last: "rain" };
      const html = await sheet();
      expect(html, failedFor).not.toContain("ambience.failed");
      expect(html, failedFor).not.toContain("ambience.needsConnection");
      expect(html, failedFor).not.toContain("ambience.last");
      // Six sounds, each with its padlock (the Plus mark's lock, an svg).
      expect((html.match(/data-ambience-tile=/g) ?? []).length, failedFor).toBe(6);
      expect((html.match(/<svg/g) ?? []).length, failedFor).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("the ambience sheet, for a reader with Plus", () => {
  it("says a sound needs a connection when the website could not be reached", async () => {
    snap = { ...QUIET, failed: "rain", failedFor: "connection" };
    const html = await sheet();
    expect(html).toContain("ambience.needsConnection");
    expect(html).not.toContain("ambience.failed");
  });

  it("otherwise says a tap tries again", async () => {
    snap = { ...QUIET, failed: "rain", failedFor: "error" };
    const html = await sheet();
    expect(html).toContain("ambience.failed");
    expect(html).not.toContain("ambience.needsConnection");
  });
});

describe("the Plus preview's sounds", () => {
  it("say the same true line while the minute runs", async () => {
    plus = false;
    snap = { ...QUIET, failed: "rain", failedFor: "connection" };
    expect(await preview()).toContain("ambience.needsConnection");
    snap = { ...QUIET, failed: "rain", failedFor: "error" };
    const html = await preview();
    expect(html).toContain("ambience.failed");
    expect(html).not.toContain("ambience.needsConnection");
  });
});
