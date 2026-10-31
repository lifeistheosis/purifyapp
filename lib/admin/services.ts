/**
 * The Services page in words: his pick A on r3-17 (2026-10-30), "quiet until
 * it is not".
 *
 * The page is one sentence ("Everything answers", or what does not), then a
 * box for each problem, dashed for a warning and solid for a failure, each
 * with what it means and what to press, then every other service as one
 * line. The Notes card that repeated the rows in a hundred and fifty words
 * is gone: what a check means is said in the problem's box when it fails,
 * and in the row's fold when it does not.
 *
 * Pure: probes in, the page's words out. components/admin/tabs/HealthTab.tsx
 * draws them.
 */

import { probeLevel } from "./attention";
import type { DeployFacts } from "./renderDeploy";

export type ProbeIn = {
  service: string;
  status: "ok" | "fail" | "skipped";
  detail: string;
  latencyMs: number | null;
  /** Render only (app/api/admin/health/route.ts). */
  deploy?: DeployFacts | null;
  url?: string;
};

export type ServiceKey = "supabase" | "limiter" | "bible" | "bmc" | "ipwho" | "render" | "other";

export type Problem = {
  key: ServiceKey;
  /** Dashed for a warning, solid for a failure: the panel's two marks. */
  box: "warn" | "fail";
  title: string;
  body: string;
  /** Where to go, when the fix is somewhere else. Re-probe is always on the page. */
  open?: { label: string; href: string };
};

export type ServiceLine = {
  key: ServiceKey;
  name: string;
  /** What it answered, as a phrase: "the profiles table answers". */
  says: string;
  ms: number | null;
  /** A solid dot when it answers, a quiet one when it is off. */
  tone: "good" | "idle";
  /** What the check is for, folded under the line. */
  note: string;
};

export type ServicesPage = {
  sentence: string;
  problems: Problem[];
  lines: ServiceLine[];
};

export function serviceKey(service: string): ServiceKey {
  const s = service.toLowerCase();
  if (s.includes("supabase")) return "supabase";
  if (s.includes("rate limiter")) return "limiter";
  if (s.includes("api.bible")) return "bible";
  if (s.includes("buy me a coffee")) return "bmc";
  if (s.includes("ipwho")) return "ipwho";
  if (s.includes("render")) return "render";
  return "other";
}

const NAME: Record<ServiceKey, string> = {
  supabase: "Supabase",
  limiter: "Rate limiter",
  bible: "API.Bible",
  bmc: "Buy Me a Coffee",
  ipwho: "ipwho.is",
  render: "Render",
  other: "",
};

/** What each check is for: the Notes card, said once, where it is wanted. */
const NOTE: Record<ServiceKey, string> = {
  supabase: "A service-role read of the profiles table. If it fails, the database is unreachable or the service key is wrong.",
  limiter:
    "Calls the rate_limit_hit function. The limiter fails open, so if this fails about thirty write routes accept requests without a limit.",
  bible:
    "A call to API.Bible with the publisher key. If it fails, NKJV, NIV and NLT stop loading. It is a licensed call, so it runs once per page load and on Re-probe only.",
  bmc: "Reads the supporters list. If it fails, the Costs tab and /support show the saved figure instead.",
  ipwho: "Looks up one address. If it fails, new visits are kept without a country or region.",
  render: "Reads the latest deploys of the website. Off until RENDER_API_KEY and RENDER_SERVICE_ID are set.",
  other: "",
};

const OK_SAYS: Record<ServiceKey, string> = {
  supabase: "the profiles table answers",
  limiter: "writes are throttled",
  bible: "licensed Scripture answers",
  bmc: "supporters answer",
  ipwho: "lookups answer",
  render: "the latest deploy is live",
  other: "answers",
};

function okSays(p: ProbeIn, key: ServiceKey): string {
  if (key !== "render" || !p.deploy) return OK_SAYS[key];
  const commit = p.deploy.commit ? ` (${p.deploy.commit})` : "";
  if (p.deploy.status === "live") return `the latest deploy is live${commit}`;
  if (/in_progress|created|queued/.test(p.deploy.status)) return `a deploy is under way${commit}`;
  return `the latest deploy: ${p.deploy.status.replace(/_/g, " ")}${commit}`;
}

function minutesAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (!Number.isFinite(m)) return "";
  if (m < 1) return " just now";
  if (m < 60) return ` ${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.round(m / 60);
  if (h < 48) return ` ${h} ${h === 1 ? "hour" : "hours"} ago`;
  return ` ${Math.round(h / 24)} days ago`;
}

function problemOf(p: ProbeIn, now: number): Problem {
  const key = serviceKey(p.service);
  const level = probeLevel(p.service);
  const box: Problem["box"] = level === "warn" ? "warn" : "fail";
  const detail = p.detail ? ` The check said: ${p.detail}.` : "";
  switch (key) {
    case "supabase":
      return {
        key,
        box,
        title: "Supabase: the database did not answer",
        body: `Everything here that reads the database is suspect until it does.${detail}`,
      };
    case "limiter":
      return {
        key,
        box,
        title: "Rate limiter: write routes are unthrottled",
        body: `The limiter fails open, so checkout, gift claims and about thirty other write routes accept requests without a limit until it answers again.${detail}`,
      };
    case "bible":
      return {
        key,
        box,
        title: "API.Bible: licensed Scripture is not loading",
        body: `Readers of NIV, NKJV and NLT are getting errors.${detail}`,
      };
    case "bmc":
      return {
        key,
        box,
        title: "Buy Me a Coffee did not answer",
        body: `The Costs tab and /support show the saved figure until it does.${detail}`,
      };
    case "ipwho":
      return {
        key,
        box,
        title: "ipwho.is did not answer",
        body: `New visits are kept without a country or region until it does.${detail}`,
      };
    case "render": {
      const open = p.url ? { label: "Open Render", href: p.url } : undefined;
      if (p.deploy?.failed) {
        const build = p.deploy.commit ? `Build ${p.deploy.commit}` : "The latest build";
        const serving = p.deploy.serving
          ? "The site still serves the deploy before it, so readers see nothing wrong."
          : "The site serves the last deploy that went live.";
        return {
          key,
          box,
          title: "Render: the latest deploy failed",
          body: `${build} failed${minutesAgo(p.deploy.at, now)}. ${serving} Render's log says why.`,
          open,
        };
      }
      return {
        key,
        box,
        title: "Render did not answer",
        body: `Deploys cannot be checked from here until it does. The site itself is not touched by this.${detail}`,
        open,
      };
    }
    default:
      return { key, box, title: `${p.service} did not answer`, body: detail.trim() };
  }
}

function lineOf(p: ProbeIn, key: ServiceKey): ServiceLine {
  const skipped = p.status === "skipped";
  return {
    key,
    name: NAME[key] || p.service,
    says: skipped ? `off: ${p.detail.charAt(0).toLowerCase()}${p.detail.slice(1)}` : okSays(p, key),
    ms: skipped ? null : p.latencyMs,
    tone: skipped ? "idle" : "good",
    note: NOTE[key],
  };
}

export type LibraryCounts = {
  saints: { total: number; incomplete: number; missingIcons: number; noIconAtAll: number };
  calendar: { days: number; expectedDays: number };
  bible: { books: { book: string; chapters: number }[] };
};

/**
 * Library files as one line under the services (his pick A): "79 saints, 12
 * not complete, every icon on file, 366 of 366 days, 86 Bible books". The
 * list it sums up is one tap away.
 */
export function libraryLine(c: LibraryCounts): string {
  const withoutIcon = c.saints.missingIcons + c.saints.noIconAtAll;
  const parts = [
    `${c.saints.total} ${c.saints.total === 1 ? "saint" : "saints"}`,
    c.saints.incomplete === 0 ? "every one complete" : `${c.saints.incomplete} not complete`,
    withoutIcon === 0 ? "every icon on file" : `${withoutIcon} without an icon file`,
    `${c.calendar.days} of ${c.calendar.expectedDays} days`,
    `${c.bible.books.length} Bible ${c.bible.books.length === 1 ? "book" : "books"}`,
  ];
  return `${parts.join(", ")}.`;
}

const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

/**
 * The page. `probes` is both reads together, internal then outbound; `now`
 * for the "12 minutes ago" a failed deploy carries.
 */
export function servicesPage(probes: readonly ProbeIn[], now: number = Date.now()): ServicesPage {
  const failing = probes.filter((p) => p.status === "fail");
  // Failures before warnings, each kind in the order the probes came.
  const problems = failing
    .map((p) => problemOf(p, now))
    .sort((a, b) => (a.box === b.box ? 0 : a.box === "fail" ? -1 : 1));
  const lines = probes.filter((p) => p.status !== "fail").map((p) => lineOf(p, serviceKey(p.service)));
  const n = problems.length;
  const sentence =
    n === 0
      ? "Everything answers."
      : n === 1
        ? "One thing to look at."
        : `${COUNT[n] ?? n} things to look at.`;
  return { sentence, problems, lines };
}
