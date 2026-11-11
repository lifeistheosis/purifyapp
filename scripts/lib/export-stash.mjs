// The native export's stash: the website-only trees set aside for the length
// of `next build` and put back after it (scripts/native-build.mjs, which
// keeps the list).
//
// Until 1.9 the build put them back only in a `finally`. A build that was
// stopped (a kill, a closed terminal, a container reclaimed) left them in
// .native-export-stash/: git showed app/api and the rest deleted, a commit
// made then would have deleted the website's pages, and orphaned workers
// still held .next/lock, so the next build refused to start. Found by Fable
// Themes on 2026-11-11.
//
// So three things, all here:
//   - `recover()` on entry: a leftover stash is put back first, and said so.
//     Never under a build that is still running, and never over a tree that
//     has come back another way (git): that copy is kept and the stash's is
//     moved aside, nothing deleted.
//   - the stash says whose it is (owner.json: the build's pid and, once it
//     has one, its `next build`), so a leftover can be told from a live build
//     and its orphaned workers can be stopped.
//   - `restoreAll()` is safe to call twice, so a stop signal, the `finally`
//     and the exit handler can each call it.
//
// A slot is the POSITION of its entry in the list, so the list only grows at
// its end (lib/build/__tests__/stashOrder.test.ts).

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Whether a process is there. A pid we may not signal (EPERM) is there. */
export function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e?.code === "EPERM";
  }
}

/** A process's command line, or "" where it cannot be read. */
export function commandOf(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim();
  } catch {
    /* not Linux, or gone */
  }
  try {
    return execSync(`ps -p ${Number(pid)} -o command=`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

/** Signal a process and everything it started (its group, where it leads one). */
export function killGroup(pid, signal = "SIGTERM") {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    /* not a group leader, or Windows */
  }
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * The stash of one checkout.
 *   root   the checkout
 *   dir    where the trees wait (.native-export-stash)
 *   paths  the trees, each as its path's parts; a tree's slot is its position
 *   log    where it says what it did
 *
 * @param {{ root: string, dir: string, paths: string[][], log?: (line: string) => void }} options
 */
export function exportStash({ root, dir, paths, log = console.log }) {
  const slot = (i) => path.join(dir, String(i));
  const ownerFile = path.join(dir, "owner.json");
  const keptDir = `${dir}-kept`;

  const readOwner = () => {
    try {
      return JSON.parse(fs.readFileSync(ownerFile, "utf8"));
    } catch {
      return null;
    }
  };
  const writeOwner = (owner) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ownerFile, JSON.stringify(owner));
  };

  /** Set the trees aside, saying first whose stash this is. */
  function stashAll() {
    writeOwner({ pid: process.pid, started: new Date().toISOString() });
    paths.forEach((parts, i) => {
      const src = path.join(root, ...parts);
      if (fs.existsSync(src)) {
        fs.rmSync(slot(i), { recursive: true, force: true });
        fs.renameSync(src, slot(i));
        log(`• stashed ${parts.join("/")} (excluded from static export)`);
      }
    });
  }

  /** The build's own `next build`, once it has started: what a later build stops if this one is killed. */
  function ownBuild(pid) {
    if (fs.existsSync(dir)) writeOwner({ ...(readOwner() ?? { pid: process.pid }), build: pid });
  }

  /** Put every tree back. Nothing to do, and no harm, when nothing is set aside. */
  function restoreAll() {
    if (!fs.existsSync(dir)) return 0;
    let n = 0;
    paths.forEach((parts, i) => {
      if (fs.existsSync(slot(i))) {
        const dest = path.join(root, ...parts);
        fs.rmSync(dest, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(slot(i), dest);
        log(`• restored ${parts.join("/")}`);
        n += 1;
      }
    });
    fs.rmSync(dir, { recursive: true, force: true });
    return n;
  }

  /**
   * On entry: what an earlier build left behind, put back.
   *
   * Answers `{ state }`:
   *   "none"      nothing was left
   *   "running"   another build holds the stash now (`pid`): nothing touched
   *   "restored"  `restored` trees put back; `kept` are trees that had come
   *               back another way, whose stashed copy is moved aside under
   *               `keptAt`; `stopped` is the dead build's `next build`, if it
   *               was still running
   *
   * @param {{ alive?: (pid: number) => boolean, describe?: (pid: number) => string, kill?: (pid: number, signal: string) => boolean }} [probes]
   * @returns {{ state: "none" } | { state: "running", pid: number } | { state: "restored", restored: string[], kept: string[], keptAt: string | null, stopped: number | null }}
   */
  function recover({ alive = isAlive, describe = commandOf, kill = killGroup } = {}) {
    if (!fs.existsSync(dir)) return { state: "none" };
    const owner = readOwner();

    if (owner?.pid && owner.pid !== process.pid && alive(owner.pid)) {
      const command = describe(owner.pid);
      // A pid can be handed to another program after a build dies. Only a
      // native build, or a process that cannot be read, counts as the owner.
      if (command === "" || /native-build/.test(command)) return { state: "running", pid: owner.pid };
    }

    /** @type {number | null} */
    let stopped = null;
    if (owner?.build && alive(owner.build) && /next/.test(describe(owner.build))) {
      kill(owner.build, "SIGKILL");
      stopped = owner.build;
      log(`• stopped the earlier build's workers (${owner.build}), which still held .next/lock`);
    }

    /** @type {string[]} */
    const restored = [];
    /** @type {string[]} */
    const kept = [];
    /** @type {string | null} */
    let keptAt = null;
    const aside = (i, name) => {
      keptAt ??= path.join(keptDir, new Date().toISOString().replace(/[:.]/g, "-"));
      const to = /** @type {string} */ (keptAt);
      fs.mkdirSync(to, { recursive: true });
      fs.renameSync(slot(i), path.join(to, String(i)));
      kept.push(name);
    };
    for (const entry of fs.readdirSync(dir)) {
      if (!/^\d+$/.test(entry)) continue;
      const i = Number(entry);
      const parts = paths[i];
      if (!parts) {
        aside(i, `slot ${i}`);
        continue;
      }
      const name = parts.join("/");
      const dest = path.join(root, ...parts);
      if (fs.existsSync(dest)) {
        aside(i, name);
        continue;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(slot(i), dest);
      restored.push(name);
    }
    fs.rmSync(dir, { recursive: true, force: true });

    log(
      `• an earlier build was stopped before it put the website's files back: restored ${restored.length} (${restored.join(", ") || "none"})`,
    );
    if (kept.length) {
      log(
        `• ${kept.length} had come back another way and were left as they are; the stashed copies are in ${path.relative(root, keptAt ?? keptDir)} (${kept.join(", ")})`,
      );
    }
    return { state: "restored", restored, kept, keptAt, stopped };
  }

  return { stashAll, ownBuild, restoreAll, recover, dir, keptDir };
}
