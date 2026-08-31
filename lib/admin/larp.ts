"use client";

/**
 * Larp mode. Every number in the panel, on blast.
 *
 * ── What it is for ──────────────────────────────────────────────────────
 *
 * The admin is honest to a fault and the honest numbers are currently small:
 * two paying subscribers, one shop order, $45 of revenue in a month. That is
 * fine to run a business on and useless for designing against. A layout that
 * looks balanced holding "3" falls apart holding "184,207", and there is no
 * way to find that out on real data until the real data arrives.
 *
 * So this inflates the reads. A reload with the mode off shows the true books
 * again. It is not enough to say it writes nothing, because a read seeds a
 * form and the form writes: installLarpWriteGuard at the foot of this file is
 * what actually holds the panel read only, and the note there says what it
 * cost to learn that.
 *
 * ── Why it announces itself ─────────────────────────────────────────────
 *
 * Turning it on is deliberately obscure. What it does while on is not. A
 * screenshot of a dashboard reading $180k of revenue, with nothing on the
 * frame saying it is invented, is a fabricated financial record, and it does
 * not stop being one because the person holding it knows better. The repo
 * already draws this line for review cards, which carry a visible SAMPLE badge
 * until real ones replace them. Same rule, same reason.
 *
 * The banner is therefore not optional and not subtle, and it renders inside
 * the panel so it lands in any screenshot of it.
 *
 * ── Why it inflates by key name ─────────────────────────────────────────
 *
 * A blanket "multiply every number" breaks the panel: ids stop matching,
 * timestamps land in the far future, percentages exceed 100, page sizes ask
 * for a million rows. So a field is inflated only when its NAME says it counts
 * money or people, and an explicit deny list protects the rest. Anything not
 * recognised is passed through untouched, which is the safe direction: a
 * number that failed to inflate is a dull demo, while a number that inflated
 * when it should not have is a broken screen.
 */

const KEY = "purify:admin:larp";
const EVENT = "purify:admin:larp-change";

/** Names that mean money or population. Inflated. */
const INFLATE =
  /(cents|revenue|profit|mrr|arr|amount|balance|payout|gross|net|earn|sales?|orders?|units?|sold|subscribers?|members?|users?|visitors?|pageviews?|views?|signups?|sessions?|claims?|count|total|bumps?|likes?|followers?)/i;

/**
 * Names that must never move, checked FIRST. Ids and timestamps are obvious.
 * The rest are the ones that bit during testing: `percent` and `rate` render
 * as "18400%", `limit` and `perPage` turn a page query into a scan, `version`
 * and `code` are identity, and `days` drives axis ranges that then draw
 * nothing.
 *
 * `^total$` is ANCHORED, and the anchors are the point. /api/admin/users answers
 * `{ total, offset, pageSize }`, and UsersTab computes lastPage from total and
 * sends it straight back as an offset, so an inflated total put the pager 196,000
 * rows past the end and the table went blank under a subtitle claiming 196,200
 * users. A bare `total` would also swallow totalUsers and total_cents, the very
 * headline figures this mode exists to make large, so it matches that one key.
 */
const NEVER =
  /(^id$|^total$|_id$|_at$|date|time|year|month|week|day|percent|pct|rate|ratio|share|version|code|limit|offset|page|size|index|order_?by|lat|lng|zoom|width|height|threshold|goal|target|price_?cents|supplier_cost)/i;

/** Deterministic 0..1 from a key, so a field inflates the same way every render. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * The multiplier for one field. Jittered per key rather than flat, because a
 * dashboard where every figure is exactly 900x the last one reads as a bug
 * rather than as a business.
 */
function factorFor(key: string): number {
  const base = /cents|revenue|profit|mrr|arr|amount|balance|payout|gross|net|earn/i.test(key)
    ? 820
    : 340;
  return Math.round(base * (0.55 + hash01(key) * 1.4));
}

/**
 * A plausible figure for a metric that is genuinely zero.
 *
 * Money is quoted in cents everywhere in this panel, so its band is three
 * orders up from a count: roughly $10k to $60k against roughly two to twenty
 * thousand of a thing. Both are deliberately short of absurd. The point is a
 * dashboard that looks like a going concern, not one that looks fabricated.
 */
function seedFor(key: string): number {
  const money = /cents|revenue|profit|mrr|arr|amount|balance|payout|gross|net|earn/i.test(key);
  const base = money ? 1_800_000 : 4_800;
  return Math.round(base * (0.55 + hash01(`${key}:seed`) * 1.9));
}

export function larpOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // Private mode, or storage blocked. Off is the correct answer, and the
    // panel must not throw on the way to finding that out.
    return false;
  }
}

export function setLarp(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to persist to; the event below still flips the session */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function onLarpChange(fn: (on: boolean) => void): () => void {
  const h = () => fn(larpOn());
  window.addEventListener(EVENT, h);
  // storage fires in the OTHER tabs, so a second admin window follows along.
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

/**
 * Walk a parsed API response and inflate what counts.
 *
 * Depth-capped and cycle-safe: this runs on every admin read, and a response
 * with a self-reference would otherwise hang the panel rather than show a
 * wrong number.
 */
export function inflate<T>(value: T, keyHint = "", depth = 0, seen = new WeakSet<object>()): T {
  if (depth > 12) return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return value;
    if (NEVER.test(keyHint) || !INFLATE.test(keyHint)) return value;
    // A ZERO CANNOT BE MULTIPLIED INTO ANYTHING, and this mode exists to show
    // the panel holding big numbers. Every metric that is genuinely zero today
    // stayed zero on blast, which is most of them: no visitors yesterday, no
    // orders this week, no claims ever. The dashboard it produced was half
    // impressive and half a flat line, which is not what it is for, and it is
    // also why the odometer could not be demonstrated on a dev machine, where
    // the admin API answers 403 and every number is zero.
    //
    // Seeded from the key, so a field shows the same figure on every render
    // and across reloads. A number that reshuffles while you look at it reads
    // as broken rather than as large.
    //
    // Below the NEVER / INFLATE tests on purpose. A zero share, a zero page
    // index and a zero id must all stay zero, and moving this line above them
    // would invent a 4,800th page.
    if (value === 0) return seedFor(keyHint) as unknown as T;
    const scaled = value * factorFor(keyHint);
    // Integers stay integers. A subscriber count of 1840.5 is a tell.
    return (Number.isInteger(value) ? Math.round(scaled) : scaled) as unknown as T;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return value;
    seen.add(value);
    // Array members inherit the key that named the array, so `revenueSeries`
    // inflates its points even though the indices are numbers.
    return value.map((v) => inflate(v, keyHint, depth + 1, seen)) as unknown as T;
  }

  if (value && typeof value === "object") {
    if (seen.has(value as object)) return value;
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = inflate(v, k, depth + 1, seen);
    }
    return out as unknown as T;
  }

  return value;
}

/**
 * Larp mode is READ ONLY, and this is what makes that true rather than
 * aspirational.
 *
 * The header above used to say "no request is altered on the way out, no row
 * is written". The first half was true and the second was wrong, because a
 * read seeds a form and the form writes. SustainabilityTab loads expense_lines
 * through adminJson, ExpenseEditor prefills its amount field straight from
 * amount_cents, and Save posts that value back. amount_cents matches both
 * "amount" and "cents", so it inflated by 1141, sailed under the route's
 * .max(10_000_000) guard, and the route finished with revalidatePath("/support").
 * One click of Adopt all turned a real $258 a month of costs into a published
 * $294,378 on the PUBLIC transparency page. The panel never showed it, because
 * the Monthly column reads monthly_cents, which the deny list happens to protect.
 *
 * A longer deny list cannot fix that. It would have to guess, correctly and
 * forever, which read-only field some future tab will put in an input. So the
 * guard sits at the one place every write must pass, and refuses there.
 *
 * It fails LOUDLY rather than silently dropping the write: a demo mode that
 * quietly swallows saves teaches the operator that saving is broken. 409 with
 * a JSON body, which is the shape every admin route already answers in and
 * every tab already knows how to display.
 */
export function installLarpWriteGuard(): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as typeof window & { __purifyLarpGuard?: boolean };
  // Installed once. React 19 in dev double-invokes effects, and a guard that
  // wrapped the wrapper would grow a new layer on every remount.
  if (w.__purifyLarpGuard) return () => {};
  const original = window.fetch;
  w.__purifyLarpGuard = true;

  window.fetch = function larpGuardedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    // Checked per request, not at install time, so toggling the mode does not
    // need the guard reinstalled and cannot leave a stale decision behind.
    if (larpOn()) {
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (method !== "GET" && method !== "HEAD" && url.includes("/api/admin")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error:
                "Larp mode is on, so the panel is read only. Turn it off before saving.",
            }),
            { status: 409, headers: { "content-type": "application/json" } },
          ),
        );
      }
    }
    return original.call(window, input, init);
  };

  return () => {
    window.fetch = original;
    w.__purifyLarpGuard = false;
  };
}
