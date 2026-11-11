// A walk taken a stretch at a time, so that one stretch's throw is never the
// end of the others (the arbiter, 2026-11-11: "one walk's throw must never
// lose the others' verdicts").
//
// scripts/route-motion.mjs was one long walk in one try, and its report was
// handed back only at the end. On an export that locked the Florilegium its
// tap on a starter's tile waited thirty seconds for a tile that was not
// there and threw. Of the 34 verdicts the walk then owed, the seventeen it
// had already reached went with the throw and the seventeen after it were
// never walked: the run said nothing at all about pages that had moved as
// they should.
//
// So a walk names what each stretch owes before it sets out. A throw is
// written against the first verdict the stretch had not reached, the rest of
// that stretch as not walked, and the walk goes on with the next stretch.
// Every run says the same verdicts by the same names, so "46 of 46" means
// the same thing each time, and a verdict that is missing is a fault and not
// a shorter list.
//
// lib/ui/__tests__/walkStretches.test.ts holds this file and the walk to it.

/**
 * A verdict: what was walked, what was wrong with it (nothing, for a pass), a line about it, and, for a walk the
 * export could not be asked for, why.
 * @typedef {{ name: string, faults: string[], said: string, skipped?: string }} Verdict
 */

/**
 * What a throw said, in one line: its first line, and what it was waiting for where it says so.
 * @param {unknown} error
 */
export function saidOf(error) {
  // Playwright colours its call log for a terminal.
  const text = String(/** @type {{ message?: unknown } | null | undefined} */ (error)?.message ?? error ?? "").replace(/\u001b\[[0-9;]*m/g, "").trim();
  const first = text.split("\n")[0].trim() || "a throw that said nothing";
  const waiting = text.match(/waiting for (.+)/)?.[1].trim();
  return waiting && !first.includes(waiting) ? `${first} (waiting for ${waiting})` : first;
}

/**
 * One run's verdicts, and the three ways one is written.
 *
 *   note(name, faults, said)   a verdict: no faults is a pass
 *   skip(name, why)            a walk this export cannot be asked for: said in
 *                              its own line, and neither a pass nor a fault
 *   stretch(owed, run)         one stretch, and the names of the verdicts it
 *                              owes, which `run` is handed to write them by.
 *                              Never throws. Says whether it ran to its end.
 *
 * `tell` hears each verdict as it is written, so a walk can say them as it
 * goes and a run that is cut off has still said what it reached.
 *
 * @param {((entry: Verdict) => unknown) | null} [tell]
 */
export function keepVerdicts(tell = null) {
  /** @type {Verdict[]} */
  const report = [];
  /** @param {Verdict} entry */
  const add = (entry) => {
    report.push(entry);
    tell?.(entry);
  };
  /** @param {string} name @param {string[]} faults @param {string} [said] */
  const note = (name, faults, said = "") => add({ name, faults, said });
  /** @param {string} name @param {string} why */
  const skip = (name, why) => add({ name, faults: [], said: "", skipped: why });
  /** @param {string[]} owed @param {(names: string[]) => unknown} run */
  const stretch = async (owed, run) => {
    const from = report.length;
    /** @type {string | null} */
    let stopped = null;
    try {
      await run(owed);
    } catch (error) {
      stopped = saidOf(error);
    }
    // By this stretch's own verdicts: two stretches may owe one of the same name.
    const reached = new Set(report.slice(from).map((entry) => entry.name));
    const missing = owed.filter((name) => !reached.has(name));
    if (stopped === null) {
      for (const name of missing) note(name, ["not walked: the walk went by without reaching it"]);
    } else if (!missing.length) {
      // Every verdict was in, and then something threw: the verdicts stand, and the throw is still said.
      note(`${owed.at(-1) ?? "a walk"}, and after it`, [`the walk stopped: ${stopped}`]);
    } else {
      // The reason is said once, against the verdict the throw fell on; the rest of the stretch follow it.
      missing.forEach((name, i) => note(name, [i === 0 ? `the walk stopped: ${stopped}` : "not walked: the walk stopped before it, at the verdict above"]));
    }
    return stopped === null;
  };
  return { report, note, skip, stretch };
}

/**
 * A verdict as the lines it is said in.
 * @param {Verdict} verdict
 */
export function saidVerdict({ name, faults, said, skipped }) {
  if (skipped) return [`----  ${name}`, `        not walked: ${skipped}`];
  return [`${faults.length ? "FAIL" : "ok  "}  ${name}${said ? `  (${said})` : ""}`, ...faults.map((fault) => `        ${fault}`)];
}

/**
 * How a run went: how many verdicts passed, failed, and could not be asked for.
 * @param {Verdict[]} report
 */
export function sumOf(report) {
  const skipped = report.filter((entry) => entry.skipped).length;
  const failed = report.filter((entry) => !entry.skipped && entry.faults.length).length;
  return { passed: report.length - skipped - failed, failed, skipped, asked: report.length - skipped };
}

/**
 * The stretches walked on one phone. A stretch that stops leaves its page as
 * it fell (a sheet open, a route held, a script kept back), so the page is
 * closed and the next stretch begins on a new page of the same phone, which
 * `renew` opens and makes ready. `run` is handed its names and the page.
 *
 * @template {{ close: () => Promise<unknown> }} P
 * @param {(owed: string[], run: (names: string[]) => unknown) => Promise<boolean>} stretch
 * @param {P | null} first
 * @param {() => Promise<P>} renew
 * @returns {(owed: string[], run: (names: string[], page: P) => unknown) => Promise<boolean>}
 */
export function walkingOn(stretch, first, renew) {
  let page = first;
  return async (owed, run) => {
    const whole = await stretch(owed, async (names) => {
      page ??= await renew();
      await run(names, page);
    });
    if (!whole) {
      await page?.close().catch(() => {});
      page = null;
    }
    return whole;
  };
}
