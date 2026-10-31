import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { currentShopTab } from "@/lib/shop/shopTabs";

/**
 * The shop's own pages for a buyer, as the owner picked them on 2026-10-31
 * (r3-19, "B. A. A.": Orders B, Messages A, Requests A), held by reading the
 * source. The fixes every direction carries (the sheet's own list): the
 * review asked for only after Delivered; the order's number on both order
 * pages; a shipping line in the total; no emoji in a thread; the request
 * form's gold gone; Requests lit on Request an icon; the words translated.
 *
 * How they draw on a phone is the export walk; this holds what the walk
 * cannot see break quietly later.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old way is not read as the way. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** The bodies of every rule whose whole selector is exactly `selector`. */
const rule = (selector: string) => {
  const want = selector.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].replace(/\s+/g, " ").trim() === want) out.push(m[2]);
  }
  return out.join("\n");
};

const PAGES = [
  "components/shop/OrdersClient.tsx",
  "components/shop/OrderDetailClient.tsx",
  "components/shop/OrderStory.tsx",
  "components/shop/MessagesClient.tsx",
  "components/shop/ConversationClient.tsx",
  "components/shop/TicketThread.tsx",
  "components/shop/ThreadFrame.tsx",
  "components/shop/MessageThread.tsx",
  "components/shop/RequestsClient.tsx",
  "components/shop/RequestIconForm.tsx",
];

describe("Orders B", () => {
  it("shows the order's EIK number on the list and on the order's page", () => {
    for (const rel of ["components/shop/OrdersClient.tsx", "components/shop/OrderDetailClient.tsx"]) {
      expect(code(rel), rel).toContain("orderConfirmationNumber(order.id)");
    }
  });

  it("asks for a review only once the order has arrived, never at paid", () => {
    const page = code("components/shop/OrderDetailClient.tsx");
    expect(page).toContain("asksForReview(order)");
    expect(page).not.toMatch(/payment_status === "paid"/);
  });

  it("totals the parcel with its shipping line", () => {
    const page = code("components/shop/OrderDetailClient.tsx");
    expect(page).toContain("orderLines(order)");
    expect(page).toContain('t("shop.shipping")');
  });

  it("tells the story in place of build 85's bar", () => {
    expect(fs.existsSync(path.join(ROOT, "components/shop/OrderProgress.tsx"))).toBe(false);
    expect(code("components/shop/OrderDetailClient.tsx")).toContain("<OrderStory");
    expect(code("components/shop/OrderStory.tsx")).toMatch(/aria-current=\{s\.state === "now" \? "step" : undefined\}/);
  });
});

describe("Messages A", () => {
  it("draws the heart as the app's own drawing, never the emoji", () => {
    const thread = code("components/shop/MessageThread.tsx");
    expect(thread).toContain('import { Heart } from "@/components/ui/icons/Heart"');
    expect(thread).toContain("<Heart size={11} filled />");
    // The stored value stays the heart the route accepts; it is never drawn.
    expect(thread).not.toMatch(/\{\s*HEART\s*\}|\?\s*HEART\s*:|🤍/);
  });

  it("holds the composer clear of the last message and above the foot", () => {
    expect(rule("html.is-native .shop-composer")).toMatch(
      /bottom: calc\(var\(--inset-bottom\) \+ var\(--tab-bar-h\) \+ var\(--now-playing-h\) \+ var\(--readings-flow-h\) \+ 10px\);/,
    );
    expect(rule(".shop-composer")).toMatch(/position: fixed;/);
    // The thread keeps room of the composer's own height under its last message.
    expect(code("components/shop/threadParts.tsx")).toMatch(/fixed \? <div aria-hidden className="md:hidden" style=\{\{ height \}\} \/> : null/);
    expect(rule("html.is-native .shop-thread-end")).toContain("var(--readings-flow-h)");
  });

  it("answers a support ticket through its own guarded route, and pins the order", () => {
    const ticket = code("components/shop/TicketThread.tsx");
    expect(ticket).toContain('apiFetch("/api/support/tickets/reply"');
    expect(ticket).toContain("<OrderPin order={thread.order} />");
    expect(code("components/shop/ConversationClient.tsx")).toContain("<OrderPin order={data.order} />");
  });
});

describe("Requests A", () => {
  it("has no gold left and a white switch for the email", () => {
    const form = code("components/shop/RequestIconForm.tsx");
    expect(form).not.toMatch(/#c9a961|accent-\[|type="checkbox"/i);
    // The switch and the carved track are Settings' own (components/settings/LitPanel.tsx).
    expect(form).toContain('import { Switch, Track } from "@/components/settings/LitPanel"');
    expect(form).toContain("<Switch on={notify} onChange={setNotify}");
    expect(form).toMatch(/<Track\s+label=\{t\("shop\.readyMadeOrCustom"\)\}/);
  });

  it("finds the saint in the library in brief, never the whole registry", () => {
    for (const rel of ["components/shop/RequestIconForm.tsx", "components/shop/RequestsClient.tsx", "lib/shop/requestSaint.ts"]) {
      expect(code(rel), rel).not.toMatch(/from "@\/lib\/saints\/saints"/);
    }
  });

  it("lights Requests in the shop's bar on Request an icon", () => {
    expect(currentShopTab("/shop/request")).toBe("/shop/requests");
    expect(currentShopTab("/shop/request/")).toBe("/shop/requests");
    expect(currentShopTab("/shop/requests")).toBe("/shop/requests");
    expect(currentShopTab("/shop/orders/detail")).toBe("/shop/orders");
    expect(currentShopTab("/shop/")).toBe("/shop");
    expect(currentShopTab("/shop/category/all")).toBe("/shop");
    expect(currentShopTab("/shop/cart")).toBeNull();
  });
});

describe("every page", () => {
  it("reads the buyer's own rows on the device: no server read in a page the apps carry", () => {
    for (const rel of [...PAGES, "app/(app)/shop/orders/page.tsx", "app/(app)/shop/messages/page.tsx", "app/(app)/shop/requests/page.tsx", "app/(app)/shop/request/page.tsx"]) {
      const src = code(rel);
      expect(src, rel).not.toMatch(/next\/headers|@\/lib\/supabase\/server|@\/lib\/supabase\/admin|force-dynamic/);
    }
  });

  it("lets its pictures arrive whole, on the app's motion switch", () => {
    for (const rel of ["components/shop/PiecePhoto.tsx", "components/shop/RequestIcon.tsx"]) {
      const src = code(rel);
      expect(src, rel).toContain("useArrivingImage(src)");
      expect(src, rel).toContain("ref={ref}");
      expect(src, rel).toContain("onLoad={onArrive}");
      expect(src, rel).toMatch(/className="img-arrive /);
    }
  });

  it("marks done solid, now lit and ahead hollow, with nothing glowing on Parchment", () => {
    expect(rule('.shop-mark[data-state="now"]')).toMatch(/box-shadow:[\s\S]*0 0 14px/);
    expect(rule('html[data-reading-mode="parchment"] .shop-mark[data-state="now"],\nhtml[data-reading-mode="parchment"] .shop-dot')).toMatch(
      /box-shadow: 0 0 0 3px/,
    );
    expect(rule('html[data-reading-mode="parchment"] .shop-lit')).toMatch(/text-shadow: none;/);
    expect(rule('.shop-mark[data-state="dashed"]')).toMatch(/dashed/);
  });

  it("moves only on the app's motion switch, and keeps nothing once it has played", () => {
    expect(rule('.shop-step-line[data-line="done"],\n.shop-step-line[data-line="lead"]')).toMatch(/shop-spine-draw [^;]*backwards;/);
    expect(rule('.shop-mark[data-state="now"]')).toMatch(/animation: shop-glow-up [^;]*backwards;/);
    expect(rule(".shop-arrive")).toMatch(/animation: shop-arrive [^;]*backwards;/);
    expect(
      rule(
        ':where([data-motion="reduce"]) .shop-step-line[data-line="done"],\n:where([data-motion="reduce"]) .shop-step-line[data-line="lead"],\n:where([data-motion="reduce"]) .shop-mark[data-state="now"],\n:where([data-motion="reduce"]) .shop-arrive',
      ),
    ).toMatch(/animation: none;/);
  });
});

describe("the new words", () => {
  const NEW = [
    "shop.ordersLede",
    "shop.stepSince",
    "shop.shippedBoxAhead",
    "shop.orderNotFinished",
    "shop.somethingWrong",
    "shop.orderStepPreparingMeans",
    "shop.andMore.other",
    "shop.orderShippingFree",
    "shop.eikonOwnStore",
    "shop.inboxYou",
    "shop.inboxSupport",
    "shop.ticketAlsoEmailed",
    "shop.budgetUnsure",
    "shop.requestSeeIcons",
    "shop.requestAnswerInEmail",
    "shop.requestAsked",
    "shop.requestNeededBy",
    "shop.requestMoreDetails",
    "shop.requestMoreDetailsLine",
    "shop.requestChange",
    "shop.requestAskAsWritten",
    "shop.requestAnySubject",
  ];
  const dir = path.join(ROOT, "lib/i18n/messages");
  const catalogs = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, string>] as const);

  it("are in all 21 catalogs, each a translation and never the English copied", () => {
    expect(catalogs).toHaveLength(21);
    const en = Object.fromEntries(catalogs)["en"];
    for (const [code, m] of catalogs) {
      for (const key of NEW) {
        expect(m[key], `${code} ${key}`).toBeTruthy();
        if (code !== "en") expect(m[key], `${code} ${key}`).not.toBe(en[key]);
        expect(m[key], `${code} ${key}`).not.toMatch(/—/);
      }
    }
  });
});
