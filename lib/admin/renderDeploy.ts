/**
 * What Render's deploy list says, read for the Services page.
 *
 * WHY THIS EXISTS. The Render probe in app/api/admin/health/route.ts asked
 * one question, whether Render's API answered, and reported OK whenever it
 * did. So a deploy that died in its build showed as OK, with the failure
 * written in a grey detail line nobody reads (the r3-17 sheet found it, and
 * the deploy of 2026-10-30 died in the build, so it was not hypothetical).
 * The owner's pick for Services, A, "quiet until it is not", needs the page
 * to say plainly when the latest deploy failed, and what that means for
 * readers: the site keeps serving the deploy before it.
 *
 * So the list is read here: the newest deploy, and the newest one that went
 * live, which is the one readers are being served. A failed newest deploy is
 * a failure of the probe, with the facts kept beside it for the page to put
 * into words. An API that does not answer is still a failure, of a different
 * kind (the route says so before this is reached).
 *
 * Pure: the route fetches, this reads. Render's shape, from its API: an
 * array of { deploy: { id, status, commit: { id }, createdAt, finishedAt } }
 * objects, newest first.
 */

/** The statuses Render gives a deploy that did not go live. */
export const FAILED_DEPLOY = new Set(["build_failed", "update_failed", "pre_deploy_failed"]);

/** Still going: the newest deploy is neither live nor failed yet. */
const IN_PROGRESS = new Set(["created", "queued", "build_in_progress", "update_in_progress", "pre_deploy_in_progress"]);

export type DeployFacts = {
  /** True when the newest deploy failed. */
  failed: boolean;
  /** Render's own word for the newest deploy: build_failed, live, build_in_progress. */
  status: string;
  /** The newest deploy's commit, seven characters, when Render gave one. */
  commit: string | null;
  /** When the newest deploy finished, or started when it has not. ISO. */
  at: string | null;
  /** The deploy readers are served: the newest that went live, when the list holds one. */
  serving: { commit: string | null; at: string | null } | null;
  /** The newest deploy's page on Render's dashboard, for "Open Render". */
  url: string | null;
};

export type RenderReading = {
  status: "ok" | "fail";
  detail: string;
  deploy: DeployFacts | null;
};

type Raw = {
  id?: unknown;
  status?: unknown;
  commit?: { id?: unknown } | null;
  createdAt?: unknown;
  finishedAt?: unknown;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const short = (sha: unknown): string | null => {
  const s = str(sha);
  return s ? s.slice(0, 7) : null;
};

function deployOf(entry: unknown): Raw | null {
  if (!entry || typeof entry !== "object") return null;
  const d = (entry as { deploy?: unknown }).deploy ?? entry;
  return d && typeof d === "object" ? (d as Raw) : null;
}

/** Render's dashboard page for a deploy of the service, or for the service. */
export function renderDashboardUrl(serviceId: string, deployId: string | null): string {
  const base = `https://dashboard.render.com/web/${encodeURIComponent(serviceId)}`;
  return deployId ? `${base}/deploys/${encodeURIComponent(deployId)}` : base;
}

/**
 * The newest deploy and what readers are served, from Render's deploy list.
 * `body` is the parsed JSON of GET /v1/services/:id/deploys, newest first.
 */
export function readRenderDeploys(body: unknown, serviceId: string): RenderReading {
  if (!Array.isArray(body)) {
    return { status: "fail", detail: "Render answered in a shape this check does not read", deploy: null };
  }
  const deploys = body.map(deployOf).filter((d): d is Raw => d !== null);
  const newest = deploys[0];
  if (!newest) return { status: "ok", detail: "no deploys listed yet", deploy: null };

  const status = str(newest.status) ?? "unknown";
  const live = deploys.find((d) => d.status === "live") ?? null;
  const facts: DeployFacts = {
    failed: FAILED_DEPLOY.has(status),
    status,
    commit: short(newest.commit?.id),
    at: str(newest.finishedAt) ?? str(newest.createdAt),
    serving: live ? { commit: short(live.commit?.id), at: str(live.finishedAt) ?? str(live.createdAt) } : null,
    url: renderDashboardUrl(serviceId, str(newest.id)),
  };

  const commit = facts.commit ?? "?";
  if (facts.failed) {
    const serving = facts.serving?.commit
      ? `; the site still serves ${facts.serving.commit}`
      : "; the list does not show which deploy the site serves";
    return { status: "fail", detail: `latest deploy ${status} (${commit})${serving}`, deploy: facts };
  }
  if (IN_PROGRESS.has(status)) {
    const serving = facts.serving?.commit ? `; the site serves ${facts.serving.commit} meanwhile` : "";
    return { status: "ok", detail: `a deploy is under way (${commit}, ${status})${serving}`, deploy: facts };
  }
  return { status: "ok", detail: `latest deploy: ${status} (${commit})`, deploy: facts };
}
