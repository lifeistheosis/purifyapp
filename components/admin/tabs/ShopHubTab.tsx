"use client";

// The Catalogue, the owner's pick A (r3-16, 2026-10-30, "Do A for a
// catalog"): the shelf of photo cards (components/admin/tabs/ShopTab.tsx's
// ProductsPanel), with everything else the hub held folded into one quiet
// line above it, as drawn: "Also here: Sourcing, Deals and shipping, Icon
// requests, Merchant applications, Reviews, Marketplace". It used to open on
// two rows of tabs, EIKON catalog and Marketplace governance, then five more.
//
// Sourcing was its own view of this page; it is the first link in the line
// now, and its old bookmark (#tab=sourcing) lands here and opens it
// (lib/admin/pages.ts RETIRED_VIEWS, lib/admin/handoff.ts).

import { useState } from "react";

import { takeInitialTab } from "@/lib/admin/handoff";

import { Icon } from "../needed/parts";
import { GrowthPanel } from "../shop/GrowthPanel";
import { MarketplaceTab } from "./MarketplaceTab";
import { ApplicationsPanel, ProductsPanel, RequestsPanel, ReviewsPanel } from "./ShopTab";
import { SourcingTab } from "./SourcingTab";

type Part = "shelf" | "sourcing" | "deals" | "requests" | "applications" | "reviews" | "marketplace";

const ALSO: [Exclude<Part, "shelf">, string][] = [
  ["sourcing", "Sourcing"],
  ["deals", "Deals and shipping"],
  ["requests", "Icon requests"],
  ["applications", "Merchant applications"],
  ["reviews", "Reviews"],
  ["marketplace", "Marketplace"],
];

const ink3 = { color: "var(--adm-ink-3)" } as const;

/** "Also here: Sourcing, Deals and shipping, ...", each a link to its part. */
function AlsoHere({ part, onPick }: { part: Part; onPick: (p: Part) => void }) {
  if (part !== "shelf") {
    const name = ALSO.find(([id]) => id === part)?.[1];
    return (
      <p className="flex flex-wrap items-center gap-1.5 font-sans text-[12.5px]" style={ink3}>
        <button type="button" onClick={() => onPick("shelf")} className="inline-flex min-h-9 items-center gap-1 underline underline-offset-[3px]">
          <Icon name="back" size={12} />
          The shelf
        </button>
        <span aria-hidden>/</span>
        <span style={{ color: "var(--adm-ink)" }}>{name}</span>
      </p>
    );
  }
  return (
    <p className="font-sans text-[12.5px] leading-[1.9]" style={ink3}>
      Also here:{" "}
      {ALSO.map(([id, label], i) => (
        <span key={id} className="whitespace-nowrap">
          <button type="button" onClick={() => onPick(id)} className="underline underline-offset-[3px] hover:text-[color:var(--adm-ink)]">
            {label}
          </button>
          {i < ALSO.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

export function ShopHubTab() {
  const [part, setPart] = useState<Part>(() => (takeInitialTab(["sourcing"]) === "sourcing" ? "sourcing" : "shelf"));
  const line = <AlsoHere part={part} onPick={setPart} />;

  if (part === "shelf") return <ProductsPanel lead={line} />;
  return (
    <div className="space-y-5">
      {line}
      {part === "sourcing" && <SourcingTab />}
      {part === "deals" && <GrowthPanel />}
      {part === "requests" && <RequestsPanel />}
      {part === "applications" && <ApplicationsPanel />}
      {part === "reviews" && <ReviewsPanel />}
      {part === "marketplace" && <MarketplaceTab />}
    </div>
  );
}
