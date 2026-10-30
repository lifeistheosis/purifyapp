import type { WebFilter, WebNode, WebTie } from "@/lib/saints/webLayout";
import { WEB_FILTERS, filtersOf, primaryTie } from "@/lib/saints/webLayout";

type Translate = (key: string, replacements?: Record<string, string | number>) => string;

/** The kinds' names, on the key and on the card: the app's own word where it has one. */
export const FILTER_LABEL: Record<WebFilter | "all", string> = {
  all: "common.all",
  disciples: "saints.web.kind.disciples",
  councils: "nav.councils",
  history: "search.group.history",
  lives: "saints.web.kind.lives",
};

/** The line each kind is drawn with on the web (lineStyle in lib/saints/webLayout.ts), shown beside its name. */
export const FILTER_LINE: Record<WebFilter, "solid" | "dash" | "dot"> = {
  disciples: "solid",
  councils: "solid",
  history: "dash",
  lives: "dot",
};

/** The kinds a saint or a council answers to, in the key's order. */
export function kindsOf(node: WebNode): WebFilter[] {
  const own = filtersOf(node);
  return WEB_FILTERS.filter((f) => own.has(f));
}

/** How many on the web answer to each kind, and all of them. */
export function kindCounts(nodes: readonly WebNode[]): Record<WebFilter | "all", number> {
  const out: Record<WebFilter | "all", number> = { all: nodes.length, disciples: 0, councils: 0, history: 0, lives: 0 };
  for (const node of nodes) for (const f of filtersOf(node)) out[f] += 1;
  return out;
}

/** The short line under a saint on the web: how he is joined, in a word or a place and a year. */
export function tagOf(node: WebNode, t: Translate): string {
  if (node.kind === "council") return String(node.year);
  return tieTag(primaryTie(node), t);
}

export function tieTag(tie: WebTie, t: Translate): string {
  if (tie.kind === "disciple") return t("saints.web.disciple");
  if (tie.kind === "teacher") return t("saints.web.teacher");
  if (tie.kind === "life") return t("saints.web.kind.lives");
  return tie.tag ?? "";
}

/** What heads a tie in the sheet: the data's own name for it, or a catalog word. */
export function tieHeading(tie: WebTie, t: Translate): string {
  if (tie.kind === "life" && tie.life) return t("saints.web.fromLifeOf", { name: tie.life.name });
  if (tie.kind === "teacher") return tie.title ? `${t("saints.web.teacher")} · ${tie.title}` : t("saints.web.teacher");
  if (tie.kind === "disciple") return tie.title ? `${t("saints.web.disciple")} · ${tie.title}` : t("saints.web.disciple");
  return tie.title ?? "";
}

/** Where a tie's heading leads: the council, the event, the saint whose Life it is. */
export function tieHref(tie: WebTie): string | undefined {
  if (tie.kind === "life" && tie.life) return `/saints/${tie.life.slug}`;
  return tie.href;
}
