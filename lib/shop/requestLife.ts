/**
 * A request's life as marks (r3-19, Requests A, "The saint's icon", the
 * owner's pick of 2026-10-31): Received, Being reviewed, Icon found while
 * that is its state, We wrote to you. Done solid, now lit, ahead hollow, the
 * same marks as an order's story (lib/shop/orderStory.ts).
 *
 * Icon found is drawn only while it is the request's state. Once a request
 * moves on, its row cannot say whether the icon was found (the table keeps
 * one status), so the line never claims it.
 *
 * The five words are the catalog's (build 85 wrote them into the component
 * in English only).
 */

import type { MarkState } from "./orderStory";
import type { ShopIconRequest } from "./types";

export type RequestStatus = ShopIconRequest["status"];

export const REQUEST_WORD_KEY: Record<RequestStatus, string> = {
  new: "shop.requestReceived",
  reviewing: "shop.requestReviewing",
  sourced: "shop.requestSourced",
  contacted: "shop.requestContacted",
  closed: "shop.requestClosed",
};

export type RequestLife = {
  /** The steps drawn, in order. */
  steps: RequestStatus[];
  marks: MarkState[];
  /** The word beside the marks. */
  word: RequestStatus;
  /** Lit while the shop is still at work on it; settled words are plain. */
  lit: boolean;
  /** What the card offers under it: the saint's icons in the shop, or where the answer went. */
  door: "icons" | "email" | null;
};

export function requestLife(status: RequestStatus): RequestLife {
  const steps: RequestStatus[] =
    status === "sourced" ? ["new", "reviewing", "sourced", "contacted"] : ["new", "reviewing", "contacted"];
  const last = steps.length - 1;
  // A closed request has run its course: every mark done, and the word says so.
  const at = status === "closed" ? last : steps.indexOf(status);
  const marks: MarkState[] = steps.map((_, i) =>
    status === "closed" || i < at ? "done" : i === at ? (i === last ? "done" : "now") : "todo",
  );
  return {
    steps,
    marks,
    word: status,
    lit: status === "new" || status === "reviewing" || status === "sourced",
    door: status === "sourced" ? "icons" : status === "contacted" ? "email" : null,
  };
}
