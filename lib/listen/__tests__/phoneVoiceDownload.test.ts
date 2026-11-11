// The on-phone voice's download (1.9): only from the reader's tap, only from
// Purify's own storage, every file checked against the list, waiting for
// Wi-Fi as a book's saving does, and gone when removed.

import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelPhoneVoice,
  getPhoneVoice,
  manifestBytes,
  PHONE_VOICE_MANIFEST,
  phoneVoiceOverMobileData,
  readManifest,
  removePhoneVoice,
  resetPhoneVoiceForTests,
  resumePhoneVoice,
  startPhoneVoice,
  type Store,
  type Wire,
} from "@/lib/listen/phoneVoiceDownload";
import { PHONE_VOICE_ENGINE_READY, phoneVoiceEngine } from "@/lib/listen/phoneVoiceEngine";
import { PHONE_VOICE_STORE } from "@/lib/listen/phoneVoices";
import type { Net, NetStatus } from "@/lib/readAloud/saving";

const local = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  },
});

const WIFI: NetStatus = { connected: true, type: "wifi" };
const CELL: NetStatus = { connected: true, type: "cellular" };
const OFF: NetStatus = { connected: false, type: "none" };

const bytesOf = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
const sum = (body: ArrayBuffer) => `${new TextDecoder().decode(body).length}`.padStart(64, "0").replace(/[^0-9a-f]/g, "0");

const FILES = { "onnx/model.onnx": "m".repeat(90), "config.json": "c".repeat(7), "voices/af_heart.bin": "v".repeat(5) };
const MANIFEST = {
  version: 1,
  files: Object.entries(FILES).map(([p, body]) => ({ path: p, bytes: body.length, sha256: sum(bytesOf(body)) })),
};

function stand(first: NetStatus) {
  let status = first;
  const watchers = new Set<(s: NetStatus) => void>();
  const kept = new Map<string, number>();
  const asked: string[] = [];
  const served: Record<string, string | null> = { ...FILES };
  let manifest: unknown = MANIFEST;
  const net: Net = {
    status: async () => status,
    watch(changed) {
      watchers.add(changed);
      return () => watchers.delete(changed);
    },
  };
  const store: Store = {
    has: async (p, bytes) => kept.get(p) === bytes,
    put: async (p, body) => void kept.set(p, body.byteLength),
    clear: async () => kept.clear(),
  };
  const wire: Wire = {
    async fetch(url) {
      asked.push(url);
      if (!status.connected) throw new Error("offline");
      if (url === PHONE_VOICE_MANIFEST) return { ok: manifest !== null, json: async () => manifest, arrayBuffer: async () => bytesOf("") };
      const body = served[url.slice(PHONE_VOICE_STORE.length + 1)];
      return { ok: body != null, json: async () => null, arrayBuffer: async () => bytesOf(body ?? "") };
    },
    sha256: async (body) => sum(body),
  };
  resetPhoneVoiceForTests({ net, store, wire });
  return {
    kept,
    asked,
    served,
    setManifest: (m: unknown) => void (manifest = m),
    async move(to: NetStatus) {
      status = to;
      for (const w of [...watchers]) w(to);
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    },
  };
}

beforeEach(() => local.clear());

describe("the list of the engine's files", () => {
  it("is read only when every path, size and sum is well formed", () => {
    expect(readManifest(MANIFEST)?.files).toHaveLength(3);
    expect(manifestBytes(readManifest(MANIFEST)!)).toBe(102);
    const bad = (f: object) => ({ version: 1, files: [{ path: "a.bin", bytes: 4, sha256: "0".repeat(64), ...f }] });
    for (const m of [null, {}, { version: 1, files: [] }, bad({ path: "../a" }), bad({ path: "/etc/x" }), bad({ path: "https://x/y" }), bad({ bytes: 0 }), bad({ bytes: 1.5 }), bad({ sha256: "abc" }), bad({ sha256: "G".repeat(64) })]) {
      expect(readManifest(m), JSON.stringify(m)).toBeNull();
    }
    expect(readManifest({ version: 1, files: [MANIFEST.files[0], MANIFEST.files[0]] })).toBeNull();
  });

  it("is in Purify's own storage, and so is every file", () => {
    expect(PHONE_VOICE_MANIFEST.startsWith("https://audio.purifyapp.net/")).toBe(true);
  });
});

describe("downloading the on-phone voice", () => {
  it("fetches nothing until the reader asks", async () => {
    const s = stand(WIFI);
    await resumePhoneVoice();
    expect(s.asked).toEqual([]);
    expect(getPhoneVoice()).toEqual({ phase: "none" });
  });

  it("fetches every file of the list from Purify's storage and from nowhere else, and is then ready", async () => {
    const s = stand(WIFI);
    await startPhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "ready", bytes: 102 });
    expect([...s.kept.keys()].sort()).toEqual(Object.keys(FILES).sort());
    for (const url of s.asked) expect(url.startsWith(`${PHONE_VOICE_STORE}/`), url).toBe(true);
  });

  it("is still ready when the app opens again, without asking the storage", async () => {
    const s = stand(WIFI);
    await startPhoneVoice();
    const again = stand(WIFI);
    await resumePhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "ready", bytes: 102 });
    expect(again.asked).toEqual([]);
    expect(s.asked.length).toBe(4);
  });

  it("waits for Wi-Fi on mobile data, and goes on when the reader chooses mobile data", async () => {
    const s = stand(CELL);
    await startPhoneVoice();
    expect(getPhoneVoice()).toMatchObject({ phase: "waiting", waiting: "wifi" });
    expect(s.asked).toEqual([]);
    await phoneVoiceOverMobileData();
    expect(getPhoneVoice().phase).toBe("ready");
  });

  it("waits for a signal, and goes on by itself when it is back", async () => {
    const s = stand(OFF);
    await startPhoneVoice();
    expect(getPhoneVoice()).toMatchObject({ phase: "waiting", waiting: "signal" });
    await s.move(WIFI);
    expect(getPhoneVoice().phase).toBe("ready");
  });

  it("does not fetch again a file already kept", async () => {
    const s = stand(WIFI);
    s.kept.set("onnx/model.onnx", 90);
    await startPhoneVoice();
    expect(s.asked.some((u) => u.endsWith("onnx/model.onnx"))).toBe(false);
    expect(getPhoneVoice().phase).toBe("ready");
  });

  it("keeps nothing that is not the list's: a wrong sum fails it and the file is not kept", async () => {
    const s = stand(WIFI);
    s.served["config.json"] = "x".repeat(8);
    await startPhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "failed", reason: "checksum" });
    expect(s.kept.has("config.json")).toBe(false);
  });

  it("fails plainly when the storage will not give a file or a list, with the phone connected", async () => {
    const a = stand(WIFI);
    a.served["voices/af_heart.bin"] = null;
    await startPhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "failed", reason: "file" });
    const b = stand(WIFI);
    b.setManifest({ version: 1, files: [{ path: "../x", bytes: 1, sha256: "0".repeat(64) }] });
    await startPhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "failed", reason: "manifest" });
  });

  it("stops when cancelled, and frees every byte when removed", async () => {
    const s = stand(CELL);
    await startPhoneVoice();
    cancelPhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "none" });
    await s.move(WIFI);
    expect(s.asked).toEqual([]);

    const t = stand(WIFI);
    await startPhoneVoice();
    expect(t.kept.size).toBe(3);
    await removePhoneVoice();
    expect(t.kept.size).toBe(0);
    expect(getPhoneVoice()).toEqual({ phase: "none" });
    stand(WIFI);
    await resumePhoneVoice();
    expect(getPhoneVoice()).toEqual({ phase: "none" });
  });
});

describe("the engine", () => {
  it("is not in the build until it has been measured on a phone", () => {
    expect(PHONE_VOICE_ENGINE_READY).toBe(false);
    expect(phoneVoiceEngine()).toBeNull();
  });

  it("is offered by no screen: nothing in app/ or components/ uses the download, the engine or the voice list (1.9 ships none of it)", () => {
    const root = process.cwd();
    const users: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && /phoneVoice|VoiceSection|VoicePreview|PHONE_VOICE/.test(fs.readFileSync(p, "utf8"))) users.push(path.relative(root, p));
      }
    };
    walk(path.join(root, "app"));
    walk(path.join(root, "components"));
    // The website's own route is the one place, and it is not in the apps (app/api is set aside from the export).
    if (!PHONE_VOICE_ENGINE_READY) expect(users).toEqual(["app/api/listen/phone-voice/route.ts"]);
  });

  it("has no words in the catalogue until it has a screen", () => {
    const en = fs.readFileSync(path.join(process.cwd(), "lib/i18n/messages/en.json"), "utf8");
    if (!PHONE_VOICE_ENGINE_READY) expect(en).not.toContain('"settings.voice');
  });

  it("sends nothing the reader reads: the download's only requests are for the list and its files", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "lib/listen/phoneVoiceDownload.ts"), "utf8");
    expect(src).not.toMatch(/method:|sendBeacon|XMLHttpRequest/);
    expect(src).toContain('credentials: "omit"');
    expect([...src.matchAll(/https?:\/\/[a-z0-9.-]+/g)].map((m) => m[0])).toEqual([]);
  });
});

describe("the list's maker (scripts/phone-voice-manifest.mjs)", () => {
  it("writes a list the app reads, and refuses a Plus voice's file", async () => {
    const os = await import("node:os");
    const { manifestOf, plusVoiceFiles } = (await import("../../../scripts/phone-voice-manifest.mjs")) as {
      manifestOf: (folder: string, o?: { refuse?: string[] }) => unknown;
      plusVoiceFiles: () => string[];
    };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phone-voice-"));
    fs.mkdirSync(path.join(dir, "voices"));
    fs.writeFileSync(path.join(dir, "config.json"), "{}");
    fs.writeFileSync(path.join(dir, "voices", "af_heart.bin"), "heart");
    const m = readManifest(manifestOf(dir));
    expect(m?.files.map((f) => f.path)).toEqual(["config.json", "voices/af_heart.bin"]);
    expect(m?.files[1].bytes).toBe(5);

    expect(plusVoiceFiles()).toContain("bm_george.bin");
    expect(plusVoiceFiles()).not.toContain("af_heart.bin");
    fs.writeFileSync(path.join(dir, "voices", "bm_george.bin"), "plus");
    expect(() => manifestOf(dir, { refuse: plusVoiceFiles() })).toThrow(/Plus voice/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
