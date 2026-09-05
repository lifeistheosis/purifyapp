"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ProductMediaManager } from "@/components/admin/ProductMediaManager";
import { Disclosure, Modal } from "@/components/admin/primitives";
import { SHOP_CLASSIFICATIONS } from "@/lib/security/schemas";
import { invalidateShopCatalog } from "@/lib/shop/catalogClient";
import { CLASSIFICATION_LABELS } from "@/lib/shop/format";
import { hasSupplierImage, orderedMedia } from "@/lib/shop/imageRights";
import { productHref } from "@/lib/shop/productHref";

import {
  INVENTORY_STATUSES,
  PRODUCT_CATEGORIES,
  SUBJECT_TYPES,
  type AdminMediaRow,
  type AdminProductRow,
  type AdminSourcingRow,
} from "./productRow";

/**
 * The nine-field product form (docs/plans/v1.4/shop-simple.md).
 *
 * In this order and no other: Name, Price, Photos, Short description,
 * Details, Category, Stock, Blessing option, Visible. One Save. Everything
 * else the table holds is below a "More" disclosure so the two-minute path
 * never scrolls past it, and nothing is dropped, so the marketplace, the
 * sourcing queue and the integrity checks keep their data.
 *
 * SHORT DESCRIPTION IS `subtitle`, DETAILS IS `description_md`. The product
 * page shows the subtitle as the lede under the title and renders
 * description_md as paragraphs split on blank lines (components/shop/
 * PolicyText.tsx), so "plain text with line breaks" is exactly what the
 * column already is. There is no third column and none is invented.
 *
 * STOCK IS ONE CONTROL. A number writes quantity_available and sets
 * inventory_status to ready_to_ship (or out_of_stock at zero); Unlimited
 * writes null and ready_to_ship. Availability under "More" can still say
 * special_order or coming_soon afterwards. The "almost sold out" notice on
 * the storefront stays derived from the number, never typed.
 *
 * VISIBLE IS `status`. On means published, off means draft. Paused and
 * archived are reachable from the Listing status select under "More"; here
 * they read as off.
 *
 * CHECKS RUN HERE FIRST, mirroring the zod schema in app/api/admin/shop/
 * products/route.ts field for field, so the sentence appears beside the box
 * before a round trip. The server's answer carries { error, field } and lands
 * in the same place when it disagrees.
 *
 * Phone first at 390px: one column, 44px controls, the Save bar at the end
 * of the form rather than floating over it.
 */

type Draft = {
  title: string;
  priceCents: number;
  media: AdminMediaRow[];
  subtitle: string;
  descriptionMd: string;
  category: string;
  quantity: number | null;
  inventoryStatus: string;
  blessingAvailable: boolean;
  status: string;
  classification: string;
  dispatchMinDays: number;
  dispatchMaxDays: number;
  materials: string;
  dimensions: string;
  productionMethod: string;
  makerName: string;
  countryOfOrigin: string;
  imageIsRepresentative: boolean;
  subjectsText: string;
  sourcing: {
    supplierName: string;
    supplierSku: string;
    supplierCostCents: number | null;
    supplierUrl: string;
    leadTimeDays: number | null;
    stockStatus: string;
    attributionRequired: boolean;
    resaleRightsConfirmed: boolean;
    packagingNotes: string;
    internalNotes: string;
  };
};

const MAX_PHOTOS = 4;

function emptyDraft(): Draft {
  return {
    title: "",
    priceCents: 0,
    media: [],
    subtitle: "",
    descriptionMd: "",
    category: "saints",
    quantity: null,
    inventoryStatus: "ready_to_ship",
    blessingAvailable: false,
    status: "draft",
    classification: "printed_mounted",
    dispatchMinDays: 14,
    dispatchMaxDays: 28,
    materials: "",
    dimensions: "",
    productionMethod: "",
    makerName: "",
    countryOfOrigin: "",
    imageIsRepresentative: true,
    subjectsText: "",
    sourcing: {
      supplierName: "",
      supplierSku: "",
      supplierCostCents: null,
      supplierUrl: "",
      leadTimeDays: null,
      stockStatus: "",
      attributionRequired: false,
      resaleRightsConfirmed: false,
      packagingNotes: "",
      internalNotes: "",
    },
  };
}

function draftFrom(p: AdminProductRow, s: AdminSourcingRow | null): Draft {
  return {
    ...emptyDraft(),
    title: p.title,
    priceCents: p.price_cents,
    // Cover first, flags stripped: the draft's ORDER is the truth and the
    // server rewrites sort_order and is_primary from it on save.
    media: orderedMedia(p.media).map((m) => ({
      media_url: m.media_url,
      alt_text: m.alt_text,
      thumb_url: m.thumb_url ?? null,
    })),
    subtitle: p.subtitle ?? "",
    descriptionMd: p.description_md ?? "",
    category: p.category,
    quantity: p.quantity_available,
    inventoryStatus: p.inventory_status,
    blessingAvailable: p.blessing_available === true,
    status: p.status,
    classification: p.classification,
    dispatchMinDays: p.dispatch_min_days,
    dispatchMaxDays: p.dispatch_max_days,
    materials: p.materials ?? "",
    dimensions: p.dimensions ?? "",
    productionMethod: p.production_method ?? "",
    makerName: p.maker_name ?? "",
    countryOfOrigin: p.country_of_origin ?? "",
    imageIsRepresentative: p.image_is_representative,
    subjectsText: p.subjects.map((x) => `${x.subject_type} | ${x.subject_slug}`).join("\n"),
    sourcing: {
      supplierName: s?.supplier_name ?? "",
      supplierSku: s?.supplier_sku ?? "",
      supplierCostCents: s?.supplier_cost_cents ?? null,
      supplierUrl: s?.supplier_url ?? "",
      leadTimeDays: s?.lead_time_days ?? null,
      stockStatus: s?.stock_status ?? "",
      attributionRequired: Boolean(s?.attribution_required),
      resaleRightsConfirmed: Boolean(s?.resale_rights_confirmed),
      packagingNotes: s?.packaging_notes ?? "",
      internalNotes: s?.internal_notes ?? "",
    },
  };
}

type Errors = Partial<Record<string, string>>;

const SUBJECT_SLUG = /^[a-z0-9-]+$/;

function parseSubjects(text: string): { subjectType: string; subjectSlug: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [type, slug] = l.split("|");
      return { subjectType: (type ?? "").trim(), subjectSlug: (slug ?? "").trim() };
    });
}

/** The zod schema, field for field, as sentences beside the box. */
export function validateDraft(d: Draft): Errors {
  const e: Errors = {};
  const name = d.title.trim();
  if (name.length < 2) e.title = "Give the product a name.";
  else if (name.length > 200) e.title = "Keep the name under 200 characters.";

  if (!Number.isInteger(d.priceCents) || d.priceCents < 0) e.priceCents = "The price cannot be negative.";
  else if (d.priceCents > 5_000_000) e.priceCents = "That price is above the $50,000 ceiling.";

  if (d.media.length > MAX_PHOTOS) e.media = `Up to ${MAX_PHOTOS} photos.`;
  else if (d.status === "published" && d.media.length === 0) {
    e.media = "Add at least one photo before making it visible.";
  } else if (d.status === "published" && hasSupplierImage(d.media)) {
    e.media = "The cover is on a supplier site, so the shop would hide this product. Use your own photo as the cover.";
  } else {
    const bare = d.media.findIndex((m) => m.alt_text.trim().length < 3);
    if (bare >= 0) e.media = `Say what photo ${bare + 1} shows, in a few words.`;
  }

  if (d.subtitle.length > 300) e.subtitle = "Keep the short description under 300 characters.";
  if (d.descriptionMd.length > 8000) e.descriptionMd = "Keep the details under 8,000 characters.";

  if (d.quantity !== null) {
    if (!Number.isInteger(d.quantity) || d.quantity < 0) e.quantity = "Stock is a whole number, zero or more.";
    else if (d.quantity > 100000) e.quantity = "Stock is capped at 100,000.";
  }

  for (const [key, v] of [
    ["dispatchMinDays", d.dispatchMinDays],
    ["dispatchMaxDays", d.dispatchMaxDays],
  ] as const) {
    if (!Number.isInteger(v) || v < 0 || v > 120) e[key] = "Dispatch is 0 to 120 days.";
  }
  if (!e.dispatchMaxDays && d.dispatchMaxDays < d.dispatchMinDays) {
    e.dispatchMaxDays = "Dispatch max must be at least dispatch min.";
  }

  const caps: [keyof Draft, number, string][] = [
    ["materials", 500, "Materials"],
    ["dimensions", 300, "Dimensions"],
    ["productionMethod", 500, "Production method"],
    ["makerName", 200, "Maker"],
    ["countryOfOrigin", 100, "Country of origin"],
  ];
  for (const [key, max, label] of caps) {
    if ((d[key] as string).length > max) e[key] = `${label} is capped at ${max} characters.`;
  }

  const subjects = parseSubjects(d.subjectsText);
  if (subjects.length > 6) e.subjects = "Up to six subjects.";
  else {
    const bad = subjects.find(
      (s) =>
        !(SUBJECT_TYPES as readonly string[]).includes(s.subjectType) ||
        !SUBJECT_SLUG.test(s.subjectSlug) ||
        s.subjectSlug.length > 100,
    );
    if (bad) e.subjects = `Each line is "type | slug", where type is one of ${SUBJECT_TYPES.join(", ")}.`;
  }

  const s = d.sourcing;
  if (s.supplierName.length > 200) e.sourcing = "Supplier name is capped at 200 characters.";
  else if (s.supplierSku.length > 120) e.sourcing = "Supplier SKU is capped at 120 characters.";
  else if (s.supplierCostCents !== null && (!Number.isInteger(s.supplierCostCents) || s.supplierCostCents < 0)) {
    e.sourcing = "Supplier cost cannot be negative.";
  } else if (s.supplierUrl.length > 1000) e.sourcing = "Supplier URL is capped at 1,000 characters.";
  else if (s.leadTimeDays !== null && (!Number.isInteger(s.leadTimeDays) || s.leadTimeDays < 0 || s.leadTimeDays > 365)) {
    e.sourcing = "Lead time is 0 to 365 days.";
  } else if (s.stockStatus.length > 120) e.sourcing = "Supplier stock status is capped at 120 characters.";
  else if (s.packagingNotes.length > 2000) e.sourcing = "Packaging notes are capped at 2,000 characters.";
  else if (s.internalNotes.length > 4000) e.sourcing = "Internal notes are capped at 4,000 characters.";

  return e;
}

function toPayload(d: Draft, id: string | null) {
  const s = d.sourcing;
  const hasSourcing =
    s.supplierName || s.supplierSku || s.supplierCostCents !== null || s.supplierUrl ||
    s.leadTimeDays !== null || s.stockStatus || s.attributionRequired || s.resaleRightsConfirmed ||
    s.packagingNotes || s.internalNotes;
  return {
    id: id ?? undefined,
    title: d.title.trim(),
    subtitle: d.subtitle.trim() || null,
    descriptionMd: d.descriptionMd.trim() || null,
    priceCents: d.priceCents,
    category: d.category,
    classification: d.classification,
    inventoryStatus: d.inventoryStatus,
    quantityAvailable: d.quantity,
    dispatchMinDays: d.dispatchMinDays,
    dispatchMaxDays: d.dispatchMaxDays,
    materials: d.materials.trim() || null,
    dimensions: d.dimensions.trim() || null,
    productionMethod: d.productionMethod.trim() || null,
    makerName: d.makerName.trim() || null,
    countryOfOrigin: d.countryOfOrigin.trim() || null,
    imageIsRepresentative: d.imageIsRepresentative,
    status: d.status,
    blessingAvailable: d.blessingAvailable,
    media: d.media.map((m) => ({
      mediaUrl: m.media_url,
      altText: m.alt_text.trim(),
      thumbUrl: m.thumb_url ?? null,
    })),
    subjects: parseSubjects(d.subjectsText),
    sourcing: hasSourcing
      ? {
          supplierName: s.supplierName.trim() || null,
          supplierSku: s.supplierSku.trim() || null,
          supplierCostCents: s.supplierCostCents,
          supplierUrl: s.supplierUrl.trim() || null,
          leadTimeDays: s.leadTimeDays,
          stockStatus: s.stockStatus.trim() || null,
          attributionRequired: s.attributionRequired,
          resaleRightsConfirmed: s.resaleRightsConfirmed,
          packagingNotes: s.packagingNotes.trim() || null,
          internalNotes: s.internalNotes.trim() || null,
        }
      : null,
  };
}

/* ── Controls, on the admin tokens ─────────────────────────────────────── */

const controlCls =
  "w-full min-h-[44px] rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[14px] outline-none";
const controlStyle = {
  borderColor: "var(--adm-line-strong)",
  background: "var(--adm-control)",
  color: "var(--adm-ink)",
};
const errorStyle = { borderColor: "var(--adm-critical)" };

function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      ) : hint ? (
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Switch({
  id,
  checked,
  onChange,
  label,
  detail,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  detail?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[var(--adm-radius-sm)] border px-3 py-2 text-left"
      style={controlStyle}
    >
      <span className="min-w-0">
        <span className="block font-sans text-[14px]" style={{ color: "var(--adm-ink)" }}>
          {label}
        </span>
        {detail ? (
          <span className="block font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {detail}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className="relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--adm-good)" : "var(--adm-line-strong)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

/* ── The form ──────────────────────────────────────────────────────────── */

export function ProductForm({
  product,
  sourcing,
  blessingEnabled,
}: {
  /** null for /admin/shop/new. */
  product: AdminProductRow | null;
  sourcing: AdminSourcingRow | null;
  /** The global config's switch; the Blessing field renders only when on. */
  blessingEnabled: boolean;
}) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => (product ? draftFrom(product, sourcing) : emptyDraft()));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // The price box's raw text while it is being typed in, so "24." and a
  // cleared box are not rewritten under the cursor. Released on blur.
  const [dollarsDraft, setDollarsDraft] = useState<string | null>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setD((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: undefined }));
  }
  function setSourcing<K extends keyof Draft["sourcing"]>(key: K, value: Draft["sourcing"][K]) {
    setD((prev) => ({ ...prev, sourcing: { ...prev.sourcing, [key]: value } }));
    if (errors.sourcing) setErrors((e) => ({ ...e, sourcing: undefined }));
  }

  const unlimited = d.quantity === null;
  function setStock(next: number | null) {
    setD((prev) => ({
      ...prev,
      quantity: next,
      inventoryStatus: next === null || next > 0 ? "ready_to_ship" : "out_of_stock",
    }));
    if (errors.quantity) setErrors((e) => ({ ...e, quantity: undefined }));
  }

  async function save() {
    const found = validateDraft(d);
    setErrors(found);
    setFormError(null);
    const first = Object.keys(found).find((k) => found[k]);
    if (first) {
      document.getElementById(`field-${first}`)?.scrollIntoView({ block: "center" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(d, product?.id ?? null)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
        field?: string;
      };
      if (res.ok && data.ok) {
        invalidateShopCatalog();
        router.push("/admin/shop");
        router.refresh();
        return;
      }
      const message = data.error ?? `Save failed (${res.status}).`;
      if (data.field && data.field in d) {
        setErrors({ [data.field]: message });
        document.getElementById(`field-${data.field}`)?.scrollIntoView({ block: "center" });
      } else {
        setFormError(message);
      }
    } catch {
      setFormError("Save failed: network dropped. Your edits are still here; try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!product) return;
    setBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/admin/shop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, deleted: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        invalidateShopCatalog();
        router.push("/admin/shop");
        router.refresh();
        return;
      }
      setDeleteError(data.error ?? `Could not delete (${res.status}).`);
    } catch {
      setDeleteError("Could not delete: network dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const visible = d.status === "published";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-5"
    >
      <div id="field-title">
        <Field label="Name" htmlFor="title" error={errors.title}>
          <input
            id="title"
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            autoComplete="off"
            className={controlCls}
            style={{ ...controlStyle, ...(errors.title ? errorStyle : {}) }}
          />
        </Field>
      </div>

      <div id="field-priceCents">
        <Field
          label="Price (USD)"
          htmlFor="price"
          error={errors.priceCents}
          hint={d.priceCents > 0 ? `Charged as ${d.priceCents} cents.` : undefined}
        >
          <input
            id="price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={dollarsDraft ?? (d.priceCents / 100).toFixed(2)}
            onChange={(e) => {
              setDollarsDraft(e.target.value);
              const cents = Math.round(Number(e.target.value) * 100);
              set("priceCents", Number.isFinite(cents) && cents >= 0 ? cents : 0);
            }}
            onBlur={() => setDollarsDraft(null)}
            className={controlCls}
            style={{ ...controlStyle, ...(errors.priceCents ? errorStyle : {}) }}
          />
        </Field>
      </div>

      <div id="field-media">
        <Field label={`Photos (1 to ${MAX_PHOTOS})`} error={errors.media} hint="The first photo is the cover.">
          <ProductMediaManager rows={d.media} onChange={(rows) => set("media", rows)} max={MAX_PHOTOS} />
        </Field>
      </div>

      <div id="field-subtitle">
        <Field
          label="Short description"
          htmlFor="subtitle"
          error={errors.subtitle}
          hint="One line under the name on the product page."
        >
          <input
            id="subtitle"
            value={d.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            maxLength={300}
            className={controlCls}
            style={{ ...controlStyle, ...(errors.subtitle ? errorStyle : {}) }}
          />
        </Field>
      </div>

      <div id="field-descriptionMd">
        <Field
          label="Details"
          htmlFor="details"
          error={errors.descriptionMd}
          hint="Plain text. A blank line starts a new paragraph."
        >
          <textarea
            id="details"
            rows={6}
            value={d.descriptionMd}
            onChange={(e) => set("descriptionMd", e.target.value)}
            className={controlCls}
            style={{ ...controlStyle, ...(errors.descriptionMd ? errorStyle : {}) }}
          />
        </Field>
      </div>

      <div id="field-category">
        <Field label="Category" htmlFor="category" error={errors.category}>
          <select
            id="category"
            value={d.category}
            onChange={(e) => set("category", e.target.value)}
            className={controlCls}
            style={controlStyle}
          >
            {PRODUCT_CATEGORIES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div id="field-quantity">
        <Field
          label="Stock"
          htmlFor={unlimited ? "stock-unlimited" : "stock"}
          error={errors.quantity}
          hint={unlimited ? "No count is kept; the product stays on sale." : "Counts down as orders are paid."}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="stock"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              disabled={unlimited}
              value={unlimited ? "" : d.quantity ?? ""}
              onChange={(e) => setStock(e.target.value === "" ? 0 : Math.max(0, Math.floor(Number(e.target.value)) || 0))}
              className={controlCls + " sm:w-40 disabled:opacity-50"}
              style={{ ...controlStyle, ...(errors.quantity ? errorStyle : {}) }}
              aria-label="Stock on hand"
            />
            <div className="sm:flex-1">
              <Switch
                id="stock-unlimited"
                checked={unlimited}
                onChange={(on) => setStock(on ? null : 1)}
                label="Unlimited"
              />
            </div>
          </div>
        </Field>
      </div>

      {blessingEnabled ? (
        <div id="field-blessingAvailable">
          <Field label="Blessing option" error={errors.blessingAvailable}>
            <Switch
              id="blessing"
              checked={d.blessingAvailable}
              onChange={(on) => set("blessingAvailable", on)}
              label="Offer a blessing for this item"
              detail="The parish, the copy and any handling charge come from the Blessing card on the products page."
            />
          </Field>
        </div>
      ) : null}

      <div id="field-status">
        <Field
          label="Visible"
          error={errors.status}
          hint={
            visible
              ? "Published. On the shop within about half a minute of saving."
              : d.status === "draft"
                ? "Hidden from the shop until switched on."
                : `Hidden: listing status is ${d.status}. Switching on publishes it.`
          }
        >
          <Switch
            id="visible"
            checked={visible}
            onChange={(on) => set("status", on ? "published" : "draft")}
            label={visible ? "Shown in the shop" : "Hidden from the shop"}
          />
        </Field>
      </div>

      {formError ? (
        <p role="alert" className="font-sans text-[13px]" style={{ color: "var(--adm-critical)" }}>
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="adm-control inline-flex min-h-[44px] items-center rounded-[var(--adm-radius-pill)] px-5 font-sans text-[14px] font-semibold disabled:opacity-60"
          style={{
            ["--_bg" as string]: "var(--adm-accent)",
            ["--_bg-hover" as string]: "var(--adm-accent-dim)",
            color: "var(--adm-on-accent)",
          }}
        >
          {busy ? "Saving" : "Save"}
        </button>
        {product ? (
          <a
            href={productHref(product.slug, false)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center font-sans text-[13px] underline-offset-2 hover:underline"
            style={{ color: "var(--adm-ink-2)" }}
          >
            View on site
          </a>
        ) : null}
      </div>

      <Disclosure title="More" hint="Classification, availability, dispatch, maker, subjects, sourcing" className="mt-8">
        <div className="space-y-5">
          {product ? (
            <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Address: /shop/icons/{product.slug}. Made from the name when the product was created; it does not change with the name.
            </p>
          ) : null}

          <div id="field-classification">
            <Field label="Classification" htmlFor="classification" error={errors.classification} hint="Honest labels only.">
              <select
                id="classification"
                value={d.classification}
                onChange={(e) => set("classification", e.target.value)}
                className={controlCls}
                style={controlStyle}
              >
                {SHOP_CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {CLASSIFICATION_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div id="field-inventoryStatus">
            <Field label="Availability" htmlFor="availability" error={errors.inventoryStatus}>
              <select
                id="availability"
                value={d.inventoryStatus}
                onChange={(e) => set("inventoryStatus", e.target.value)}
                className={controlCls}
                style={controlStyle}
              >
                {INVENTORY_STATUSES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div id="field-listingStatus">
            <Field label="Listing status" htmlFor="listing-status" hint="Paused and archived are also hidden from the shop.">
              <select
                id="listing-status"
                value={d.status}
                onChange={(e) => set("status", e.target.value)}
                className={controlCls}
                style={controlStyle}
              >
                {["draft", "published", "paused", "archived"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div id="field-dispatchMinDays">
              <Field label="Dispatch min (days)" htmlFor="dispatch-min" error={errors.dispatchMinDays}>
                <input
                  id="dispatch-min"
                  type="number"
                  min={0}
                  max={120}
                  value={d.dispatchMinDays}
                  onChange={(e) => set("dispatchMinDays", Number(e.target.value) || 0)}
                  className={controlCls}
                  style={{ ...controlStyle, ...(errors.dispatchMinDays ? errorStyle : {}) }}
                />
              </Field>
            </div>
            <div id="field-dispatchMaxDays">
              <Field label="Dispatch max (days)" htmlFor="dispatch-max" error={errors.dispatchMaxDays}>
                <input
                  id="dispatch-max"
                  type="number"
                  min={0}
                  max={120}
                  value={d.dispatchMaxDays}
                  onChange={(e) => set("dispatchMaxDays", Number(e.target.value) || 0)}
                  className={controlCls}
                  style={{ ...controlStyle, ...(errors.dispatchMaxDays ? errorStyle : {}) }}
                />
              </Field>
            </div>
          </div>

          {(
            [
              ["materials", "Materials"],
              ["dimensions", "Dimensions"],
              ["productionMethod", "Production method"],
              ["makerName", "Maker (public attribution)"],
              ["countryOfOrigin", "Country of origin"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} id={`field-${key}`}>
              <Field label={label} htmlFor={key} error={errors[key]}>
                <input
                  id={key}
                  value={d[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className={controlCls}
                  style={{ ...controlStyle, ...(errors[key] ? errorStyle : {}) }}
                />
              </Field>
            </div>
          ))}

          <label className="flex min-h-[44px] items-center gap-3 font-sans text-[14px]" style={{ color: "var(--adm-ink)" }}>
            <input
              type="checkbox"
              checked={d.imageIsRepresentative}
              onChange={(e) => set("imageIsRepresentative", e.target.checked)}
              className="h-4 w-4"
            />
            Photo is representative (not the exact physical item)
          </label>

          <div id="field-subjects">
            <Field
              label="Subjects"
              htmlFor="subjects"
              error={errors.subjects}
              hint="One per line: type | slug, for example saint | st-nicholas."
            >
              <textarea
                id="subjects"
                rows={3}
                value={d.subjectsText}
                onChange={(e) => set("subjectsText", e.target.value)}
                className={controlCls}
                style={{ ...controlStyle, ...(errors.subjects ? errorStyle : {}) }}
              />
            </Field>
          </div>

          <div id="field-sourcing">
            <Disclosure
              title="Sourcing"
              hint="Admin only, never public"
              defaultOpen={Boolean(d.sourcing.supplierName || d.sourcing.supplierUrl || d.sourcing.supplierCostCents)}
            >
              <div className="space-y-4">
                {errors.sourcing ? (
                  <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
                    {errors.sourcing}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Supplier name" htmlFor="supplier-name">
                    <input id="supplier-name" value={d.sourcing.supplierName} onChange={(e) => setSourcing("supplierName", e.target.value)} className={controlCls} style={controlStyle} />
                  </Field>
                  <Field label="Supplier SKU" htmlFor="supplier-sku">
                    <input id="supplier-sku" value={d.sourcing.supplierSku} onChange={(e) => setSourcing("supplierSku", e.target.value)} className={controlCls} style={controlStyle} />
                  </Field>
                  <Field label="Supplier cost (USD)" htmlFor="supplier-cost">
                    <input
                      id="supplier-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={d.sourcing.supplierCostCents === null ? "" : (d.sourcing.supplierCostCents / 100).toFixed(2)}
                      onChange={(e) =>
                        setSourcing(
                          "supplierCostCents",
                          e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value) * 100) || 0),
                        )
                      }
                      className={controlCls}
                      style={controlStyle}
                    />
                  </Field>
                  <Field label="Lead time (days)" htmlFor="lead-time">
                    <input
                      id="lead-time"
                      type="number"
                      min={0}
                      max={365}
                      value={d.sourcing.leadTimeDays ?? ""}
                      onChange={(e) => setSourcing("leadTimeDays", e.target.value === "" ? null : Number(e.target.value))}
                      className={controlCls}
                      style={controlStyle}
                    />
                  </Field>
                </div>
                <Field label="Supplier URL" htmlFor="supplier-url">
                  <input id="supplier-url" value={d.sourcing.supplierUrl} onChange={(e) => setSourcing("supplierUrl", e.target.value)} inputMode="url" className={controlCls} style={controlStyle} />
                </Field>
                <Field label="Supplier stock status" htmlFor="supplier-stock">
                  <input id="supplier-stock" value={d.sourcing.stockStatus} onChange={(e) => setSourcing("stockStatus", e.target.value)} className={controlCls} style={controlStyle} />
                </Field>
                <label className="flex min-h-[44px] items-center gap-3 font-sans text-[14px]" style={{ color: "var(--adm-ink)" }}>
                  <input type="checkbox" checked={d.sourcing.attributionRequired} onChange={(e) => setSourcing("attributionRequired", e.target.checked)} className="h-4 w-4" />
                  Attribution required
                </label>
                <label className="flex min-h-[44px] items-center gap-3 font-sans text-[14px]" style={{ color: "var(--adm-ink)" }}>
                  <input type="checkbox" checked={d.sourcing.resaleRightsConfirmed} onChange={(e) => setSourcing("resaleRightsConfirmed", e.target.checked)} className="h-4 w-4" />
                  Resale rights confirmed
                </label>
                <Field label="Packaging notes" htmlFor="packaging-notes">
                  <textarea id="packaging-notes" rows={2} value={d.sourcing.packagingNotes} onChange={(e) => setSourcing("packagingNotes", e.target.value)} className={controlCls} style={controlStyle} />
                </Field>
                <Field label="Internal notes" htmlFor="internal-notes">
                  <textarea id="internal-notes" rows={3} value={d.sourcing.internalNotes} onChange={(e) => setSourcing("internalNotes", e.target.value)} className={controlCls} style={controlStyle} />
                </Field>
              </div>
            </Disclosure>
          </div>

          {product ? (
            <div className="border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center rounded-[var(--adm-radius-pill)] border px-4 font-sans text-[13px] font-semibold disabled:opacity-60"
                style={{ borderColor: "var(--adm-critical)", color: "var(--adm-critical)" }}
              >
                Delete this product
              </button>
              <p className="mt-2 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                It leaves the shop and every list. Past orders keep their record of it, and its address is not reused.
              </p>
            </div>
          ) : null}
        </div>
      </Disclosure>

      {confirmDelete && product ? (
        <Modal
          title={`Delete ${product.title}?`}
          subtitle="This hides it everywhere. Past orders keep their line."
          onClose={() => setConfirmDelete(false)}
        >
          <div className="space-y-4">
            {deleteError ? (
              <p role="alert" className="font-sans text-[13px]" style={{ color: "var(--adm-critical)" }}>
                {deleteError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center rounded-[var(--adm-radius-pill)] px-5 font-sans text-[14px] font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--adm-critical)" }}
              >
                {busy ? "Deleting" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center rounded-[var(--adm-radius-pill)] border px-5 font-sans text-[14px]"
                style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)" }}
              >
                Keep it
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </form>
  );
}
