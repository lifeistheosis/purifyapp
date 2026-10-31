"use client";

import { useState } from "react";

import { SearchField } from "@/components/search/SearchField";
import { Close } from "@/components/ui/icons/Close";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import {
  activeFilterCount,
  PRICE_BAND_LABELS,
  type BrowseFilters,
  type PriceBand,
} from "@/lib/shop/browse";
import { shopSaint } from "@/lib/shop/bySaint";
import { CLASSIFICATION_LABELS } from "@/lib/shop/format";
import type { ShopClassification } from "@/lib/shop/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Search + facet filters for the shop's browsing surfaces. Amazon's clarity
 * in Purify's register: a visible search field, one Filters button with a
 * live count, active facets as removable chips, and the facet editor in a
 * bottom sheet on mobile (Sheet primitive) or an inline disclosure panel on
 * md+ (sheets are a phone affordance; desktop gets the same controls in
 * place). All state lives in the parent; this renders and reports.
 */
export function ShopBrowseControls({
  filters,
  onChange,
  resultCount,
  searchPlaceholder,
}: {
  filters: BrowseFilters;
  onChange: (next: BrowseFilters) => void;
  /** Post-filter count, shown on the sheet's apply button. */
  resultCount: number;
  searchPlaceholder?: string;
}) {
  const { t, tn } = useTranslate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const count = activeFilterCount(filters);

  const facetChips: { label: string; clear: () => void }[] = [];
  // The saint the reader came in with from "Shop by saint" (lib/shop/
  // bySaint.ts). Not in the sheet, so not in the count: it is only ever set
  // by arriving, and taken off here.
  if (filters.saint) {
    facetChips.push({
      label: shopSaint(filters.saint)?.shortName ?? filters.saint.replaceAll("-", " "),
      clear: () => onChange({ ...filters, saint: null }),
    });
  }
  if (filters.readyOnly) {
    facetChips.push({
      label: t("shop.readyToShip"),
      clear: () => onChange({ ...filters, readyOnly: false }),
    });
  }
  if (filters.classification) {
    facetChips.push({
      label: CLASSIFICATION_LABELS[filters.classification as ShopClassification]
        ? t(`shop.classification.${filters.classification}`)
        : filters.classification,
      clear: () => onChange({ ...filters, classification: null }),
    });
  }
  if (filters.priceBand) {
    facetChips.push({
      label: t(`shop.priceBand.${filters.priceBand}`),
      clear: () => onChange({ ...filters, priceBand: null }),
    });
  }

  const editor = <FacetEditor filters={filters} onChange={onChange} />;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        {/* The shop filters itself in place, in the app's one field (1.8,
            r3-12): its search key, its clear button, its light. */}
        <SearchField
          value={filters.q ?? ""}
          onChange={(q) => onChange({ ...filters, q })}
          placeholder={searchPlaceholder ?? t("search.open")}
          label={t("shop.searchTheShop")}
          className="flex-1"
        />

        {/* Filters trigger: sheet on phones, inline panel on md+. */}
        <button
          type="button"
          onClick={() => {
            if (window.matchMedia("(min-width: 768px)").matches) {
              setPanelOpen((v) => !v);
            } else {
              setSheetOpen(true);
            }
          }}
          aria-expanded={panelOpen || sheetOpen}
          className={cn(
            "tap-press inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-pill border px-4 font-sans text-ui font-semibold transition-colors",
            count > 0
              ? "border-paper/50 bg-paper/12 text-paper"
              : "border-paper/15 bg-paper/[0.04] text-paper/80 hover:border-paper/35 hover:text-paper",
          )}
        >
          <Sliders size={16} />
          {t("shop.filters")}
          {count > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 font-sans text-[11px] font-bold text-night">
              {count}
            </span>
          ) : null}
        </button>
      </div>

      {/* Active facets, each removable in place. */}
      {facetChips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap items-center gap-2">
          {facetChips.map((c) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={c.clear}
                aria-label={t("shop.removeFilterNamed", { label: c.label })}
                className="tap-press inline-flex min-h-[34px] items-center gap-1.5 rounded-pill border border-paper/40 bg-paper/10 px-3 font-sans text-caption font-medium text-paper hover:border-paper/70"
              >
                {c.label}
                <Close size={11} />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() =>
                onChange({ q: filters.q, readyOnly: false, classification: null, priceBand: null, saint: null })
              }
              className="min-h-[34px] px-2 font-sans text-caption text-paper/55 underline underline-offset-2 hover:text-paper"
            >
              {t("shop.clearAll")}
            </button>
          </li>
        </ul>
      ) : null}

      {/* Desktop inline facet panel. */}
      {panelOpen ? (
        <div className="mt-4 hidden rounded-2xl border border-paper/10 bg-night-soft/60 p-5 md:block">
          {editor}
        </div>
      ) : null}

      {/* Phone bottom sheet. */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("shop.filters")} openFull>
        {editor}
        <button
          type="button"
          onClick={() => setSheetOpen(false)}
          className="tap-press mt-5 flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper font-sans text-ui font-semibold text-night"
        >
          {tn("shop.showIconCount", resultCount)}
        </button>
      </Sheet>
    </div>
  );
}

/** The facet controls themselves, shared verbatim between the sheet and the
 * desktop panel so the two can never drift. */
function FacetEditor({
  filters,
  onChange,
}: {
  filters: BrowseFilters;
  onChange: (next: BrowseFilters) => void;
}) {
  const { t } = useTranslate();
  const classifications = (
    Object.keys(CLASSIFICATION_LABELS) as ShopClassification[]
  ).map(
    (slug) =>
      [slug, t(`shop.classification.${slug}`)] as [ShopClassification, string],
  );
  const bands = (Object.keys(PRICE_BAND_LABELS) as PriceBand[]).map(
    (band) => [band, t(`shop.priceBand.${band}`)] as [PriceBand, string],
  );

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="font-sans text-caption font-semibold text-paper/55">
          {t("shop.availability")}
        </legend>
        <div className="mt-2.5">
          <FacetChip
            selected={!!filters.readyOnly}
            onClick={() => onChange({ ...filters, readyOnly: !filters.readyOnly })}
          >
            {t("shop.readyToShip")}
          </FacetChip>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-sans text-caption font-semibold text-paper/55">
          {t("shop.type")}
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {classifications.map(([slug, label]) => (
            <FacetChip
              key={slug}
              selected={filters.classification === slug}
              onClick={() =>
                onChange({
                  ...filters,
                  classification: filters.classification === slug ? null : slug,
                })
              }
            >
              {label}
            </FacetChip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-sans text-caption font-semibold text-paper/55">
          {t("shop.price")}
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {bands.map(([band, label]) => (
            <FacetChip
              key={band}
              selected={filters.priceBand === band}
              onClick={() =>
                onChange({
                  ...filters,
                  priceBand: filters.priceBand === band ? null : band,
                })
              }
            >
              {label}
            </FacetChip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function FacetChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "tap-press inline-flex min-h-[40px] items-center rounded-pill border px-4 font-sans text-detail font-medium transition-colors",
        selected
          ? "border-paper bg-paper text-night"
          : "border-paper/15 bg-paper/[0.03] text-paper/75 hover:border-paper/35 hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}
