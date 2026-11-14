/**
 * The first opening of each page in the apps, made ready ahead (build 97,
 * note 3). His words: "when you first open the pages on the app they all load
 * in clunky and slow (can you load in the screens when they are at the end of
 * onboarding and the animation is happening so it's not clunky or slow?)"
 *
 * Measured first, on the export, cold (scripts/first-open.mjs, 390x844, the
 * processor slowed four times): a tab's first opening took 0.5 to 1 s and its
 * second about half that. The difference is the page's code: every first
 * opening read 17 to 28 code files, the last of them landing a few
 * milliseconds before the page switched, and then ran the page's modules for
 * the first time. The page's payload landed within 70 ms, pictures after the
 * switch, and the page's own data comes from purifyapp.net, which is never
 * fetched ahead of a tap.
 *
 * So, in the apps only, after the first screen of a cold start has settled
 * and at the end of onboarding (components/nav/ReadyAhead.tsx,
 * components/onboarding/HandoffSlate.tsx), each page below is readied in small
 * idle steps, one page at a time:
 *   1. its index.txt, the payload a tap would read, from the bundle, for the
 *      code files and client modules it names;
 *   2. each code file it names that is not loaded yet, as a script element,
 *      the way the bundler itself loads one, so the bundler finds it loaded;
 *   3. each client module it names, run once through the bundler's own entry
 *      (a module already run is never run again, and one that fails is left
 *      for the tap to meet as it always would).
 * Nothing else: no pictures (they arrive after the switch and hold nothing
 * back), no data, nothing from outside the bundle, and never router.prefetch,
 * which asks for files the export leaves out (scripts/native-build.mjs) and
 * once held the next page back by about 30 s (TourLayer.tsx). A tap or the app
 * going to the background stops it; a later start goes on where it stopped.
 */
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

/**
 * The five tabs and the page each opens most, in the order a reader reaches
 * them. Today is the front door, ready with the cold start. Every chapter of
 * the Bible is one page's code, so John 1 readies the reader's own place too.
 */
export const READY_AHEAD_PAGES = [
  "/bible/john/1/", // the Bible tab
  "/prayers/", // the Prayers tab
  "/discover/", // the Discover tab
  "/account/", // the You tab
  "/prayers/morning/", // Today's Begin before noon, and the Prayers tab's first row
  "/prayers/evening/", // Today's Begin after noon
  "/saints/", // Discover's first tile
  "/settings/", // You's way to Settings
] as const;

/** Only code files of the bundle's own, by the address the payload writes. */
const CODE_FILE = /"(\/_next\/static\/chunks\/[A-Za-z0-9_~.-]+\.js)"/g;
/** A client module row of the payload: `1d:I[552765,[...],"AppFrame"]`. */
const CLIENT_MODULE = /^[0-9a-z]+:I\[(\d+),/gm;

/** The code files and client modules a page's payload names. */
export function namedInPayload(payload: string): { files: string[]; modules: number[] } {
  return {
    files: [...new Set(Array.from(payload.matchAll(CODE_FILE), (m) => m[1]))],
    modules: [...new Set(Array.from(payload.matchAll(CLIENT_MODULE), (m) => Number(m[1])))],
  };
}

/** What a run needs from the app, handed in so a test can stand in for it. */
export type ReadyAheadEnv = {
  /** A file of the bundle, by its address. */
  read: (address: string) => Promise<string>;
  /** Whether a code file is already loaded (or loading). */
  loaded: (file: string) => boolean;
  /** Load a code file; settles when it has run or failed. */
  load: (file: string) => Promise<void>;
  /** Run a client module once, as the bundler would on a tap. */
  run: (id: number) => void;
  /** Wait for the next idle moment. */
  idle: () => Promise<void>;
  /** False once a tap or the background has stopped the run. */
  going: () => boolean;
};

/**
 * Ready each page in turn, one small step per idle moment. Returns true when
 * every page is ready, false when the run was stopped part way; `ready` keeps
 * the pages done, so the next run goes on from there.
 */
export async function readyPages(pages: readonly string[], ready: Set<string>, env: ReadyAheadEnv): Promise<boolean> {
  for (const page of pages) {
    if (ready.has(page)) continue;
    await env.idle();
    if (!env.going()) return false;
    let named: ReturnType<typeof namedInPayload>;
    try {
      named = namedInPayload(await env.read(`${page}index.txt`));
    } catch {
      // Not in this bundle: nothing to ready, and the tap meets it as before.
      ready.add(page);
      continue;
    }
    for (const file of named.files) {
      if (env.loaded(file)) continue;
      await env.idle();
      if (!env.going()) return false;
      await env.load(file);
    }
    for (const id of named.modules) {
      await env.idle();
      if (!env.going()) return false;
      try {
        env.run(id);
      } catch {
        // Left for the tap, which meets it exactly as it did before.
      }
    }
    ready.add(page);
  }
  return true;
}

type TurbopackGlobal = { push?: (entry: unknown) => unknown };

/** The app's own: the bundle, the document, and the bundler's entry. */
function appEnv(isGoing: () => boolean): ReadyAheadEnv {
  return {
    read: async (address) => {
      const res = await fetch(address);
      if (!res.ok) throw new Error(`${address} ${res.status}`);
      return res.text();
    },
    loaded: (file) => document.querySelector(`script[src="${file}"]`) !== null,
    load: (file) =>
      new Promise<void>((settle) => {
        const el = document.createElement("script");
        el.src = file;
        el.onload = () => settle();
        // A failed one must not stay in the document: the bundler takes a
        // script it finds there as loading, and would wait on it for good.
        el.onerror = () => {
          el.remove();
          settle();
        };
        document.head.appendChild(el);
      }),
    run: (id) => {
      // The bundler's own chunk entry: a runtime module is run once, through
      // its cache (a module already run is skipped). Absent in any other
      // bundler, where this step does nothing.
      const tp = (globalThis as { TURBOPACK?: TurbopackGlobal }).TURBOPACK;
      if (!tp || Array.isArray(tp) || typeof tp.push !== "function") return;
      const done = tp.push(["ready-ahead", { otherChunks: [], runtimeModuleIds: [id] }]);
      if (done && typeof (done as Promise<unknown>).catch === "function") (done as Promise<unknown>).catch(() => {});
    },
    idle: () =>
      new Promise<void>((resolve) => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
        if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(() => resolve());
        // WebKit has no idle callback: a frame, then a short wait.
        else requestAnimationFrame(() => window.setTimeout(resolve, 50));
      }),
    going: isGoing,
  };
}

const ready = new Set<string>();
let running = false;
let stopped = false;

function stop(): void {
  stopped = true;
}

function onVisibility(): void {
  if (document.visibilityState === "hidden") stop();
}

/**
 * Start readying the pages ahead, in the apps only. Safe to call from every
 * place that may start it: a run already going is left alone, and a run that
 * finished is not repeated.
 */
export function startReadyAhead(): void {
  if (!IS_STATIC_EXPORT || typeof window === "undefined") return;
  if (running || ready.size === READY_AHEAD_PAGES.length) return;
  if (document.visibilityState === "hidden") return;
  running = true;
  stopped = false;
  const opts = { capture: true, passive: true } as const;
  document.addEventListener("pointerdown", stop, opts);
  document.addEventListener("keydown", stop, opts);
  document.addEventListener("visibilitychange", onVisibility);
  void readyPages(READY_AHEAD_PAGES, ready, appEnv(() => !stopped && document.visibilityState === "visible")).finally(() => {
    running = false;
    document.removeEventListener("pointerdown", stop, opts);
    document.removeEventListener("keydown", stop, opts);
    document.removeEventListener("visibilitychange", onVisibility);
  });
}
