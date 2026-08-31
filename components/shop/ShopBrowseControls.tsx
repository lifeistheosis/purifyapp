"use client";

import { useState } from "react";

import { Close } from "@/components/ui/icons/Close";
import { Search } from "@/components/ui/icons/Search";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import {
  activeFilterCount,
  PRICE_BAND_LABELS,
  type BrowseFilters,
  type PriceBand,
} from "@/lib/shop/browse";
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
        {/* Search field */}
        <label className="relative flex min-h-[46px] flex-1 items-center">
          <span className="sr-only">{t("shop.searchTheShop")}</span>
          <span className="pointer-events-none absolute left-4 text-paper/45">
            <Search size={16} />
          </span>
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={filters.q ?? ""}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            placeholder={searchPlaceholder ?? t("shop.searchPlaceholder")}
            className="h-[46px] w-full rounded-pill border border-paper/15 bg-paper/[0.04] pl-11 pr-10 font-sans text-ui text-paper placeholder:text-paper/40 outline-none transition-colors focus:border-paper/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.q ? (
            <button
              type="button"
              aria-label={t("shop.clearSearch")}
              onClick={() => onChange({ ...filters, q: "" })}
              className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-paper/55 hover:text-paper"
            >
              <Close size={14} />
            </button>
          ) : null}
        </label>

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
            "tap-press inline-flex min-h-[46px] shrink-0 items-center gap-2 rounded-pill border px-4 font-sans text-ui font-semibold transition-colors",
            count > 0
              ? "border-gold/50 bg-gold/12 text-paper"
              : "border-paper/15 bg-paper/[0.04] text-paper/80 hover:border-paper/35 hover:text-paper",
          )}
        >
          <Sliders size={16} />
          {t("shop.filters")}
          {count > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-sans text-[11px] font-bold text-night">
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
                className="tap-press inline-flex min-h-[34px] items-center gap-1.5 rounded-pill border border-gold/40 bg-gold/10 px-3 font-sans text-caption font-medium text-paper hover:border-gold/70"
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
                onChange({ q: filters.q, readyOnly: false, classification: null, priceBand: null })
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
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("shop.filters")}>
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

/** The facet controls themselves — shared verbatim between the sheet and the
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
        <legend className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
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
        <legend className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
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
        <legend className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
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
          ? "border-gold bg-gold text-night"
          : "border-paper/15 bg-paper/[0.03] text-paper/75 hover:border-paper/35 hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}
