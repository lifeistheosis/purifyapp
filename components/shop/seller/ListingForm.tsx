"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CATEGORY_LABELS,
  CLASSIFICATION_LABELS,
  INVENTORY_LABELS,
} from "@/lib/shop/format";
import type { SellerProduct } from "@/lib/shop/sellerData";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";
const labelCls = "font-sans text-caption font-semibold text-paper/60";

type MediaRow = { url: string; alt: string };

/**
 * Create/edit a listing. One long, honest form in sections — photos
 * first because the card is image-led. Prices are typed in dollars and
 * sent in cents. Save as draft is always available; Publish enforces
 * the same gates the API does (≥1 photo, live store), so the server's
 * "no" never surprises anyone.
 */
export function ListingForm({
  product,
  storeLive,
}: {
  product: SellerProduct | null;
  storeLive: boolean;
}) {
  const router = useRouter();
  const editing = !!product;
  const [busy, setBusy] = useState<false | "draft" | "published">(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaRow[]>(
    product?.media.map((m) => ({ url: m.media_url, alt: m.alt_text })) ?? [],
  );

  function collect(form: HTMLFormElement, status: string) {
    const f = new FormData(form);
    const dollars = parseFloat(String(f.get("price") ?? "0"));
    return {
      ...(product ? { id: product.id } : {}),
      title: String(f.get("title") ?? "").trim(),
      subtitle: String(f.get("subtitle") ?? "").trim() || null,
      descriptionMd: String(f.get("description") ?? "").trim() || null,
      priceCents: Math.round((Number.isFinite(dollars) ? dollars : 0) * 100),
      category: String(f.get("category")),
      classification: String(f.get("classification")),
      inventoryStatus: String(f.get("inventoryStatus")),
      quantityAvailable:
        String(f.get("quantity") ?? "") === ""
          ? null
          : Number(f.get("quantity")),
      dispatchMinDays: Number(f.get("dispatchMin") ?? 1),
      dispatchMaxDays: Number(f.get("dispatchMax") ?? 2),
      materials: String(f.get("materials") ?? "").trim() || null,
      dimensions: String(f.get("dimensions") ?? "").trim() || null,
      productionMethod: String(f.get("productionMethod") ?? "").trim() || null,
      makerName: String(f.get("makerName") ?? "").trim() || null,
      countryOfOrigin: String(f.get("countryOfOrigin") ?? "").trim() || null,
      imageIsRepresentative: f.get("imageIsRepresentative") === "on",
      status,
      media: media.filter((m) => m.url.trim() && m.alt.trim()),
    };
  }

  async function save(form: HTMLFormElement, status: "draft" | "published") {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch("/api/shop/seller/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collect(form, status)),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.push("/shop/seller/listings");
        router.refresh();
        return;
      }
      setError(data.error ?? "Couldn't save the listing.");
    } catch {
      setError("Couldn't save the listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(e.currentTarget, "published");
      }}
      className="space-y-8"
    >
      <section className="space-y-5">
        <h2 className="font-display-serif text-title text-paper">Photos</h2>
        <p className="font-sans text-detail text-paper/60">
          Paste image URLs for now (uploads arrive with the media pipeline).
          The first photo is the cover. Alt text is required — describe the
          icon for someone who can&rsquo;t see it.
        </p>
        {media.map((m, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-paper/10 bg-night-soft/40 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block space-y-1.5">
              <span className={labelCls}>Image URL {i === 0 ? "(cover)" : ""}</span>
              <input
                value={m.url}
                onChange={(e) =>
                  setMedia((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)),
                  )
                }
                placeholder="https://…"
                className={field}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelCls}>Alt text *</span>
              <input
                value={m.alt}
                onChange={(e) =>
                  setMedia((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, alt: e.target.value } : r)),
                  )
                }
                placeholder="Icon of St Nicholas, gold ground…"
                className={field}
              />
            </label>
            <button
              type="button"
              onClick={() => setMedia((rows) => rows.filter((_, j) => j !== i))}
              className="self-end pb-3 font-sans text-detail font-medium text-paper/55 hover:text-paper"
            >
              Remove
            </button>
          </div>
        ))}
        {media.length < 8 ? (
          <button
            type="button"
            onClick={() => setMedia((rows) => [...rows, { url: "", alt: "" }])}
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper"
          >
            Add photo
          </button>
        ) : null}
      </section>

      <section className="space-y-5">
        <h2 className="font-display-serif text-title text-paper">The icon</h2>
        <label className="block space-y-1.5">
          <span className={labelCls}>Title *</span>
          <input
            name="title"
            required
            minLength={2}
            maxLength={200}
            defaultValue={product?.title ?? ""}
            placeholder="Icon of Christ Pantocrator, printed and mounted"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Subtitle</span>
          <input
            name="subtitle"
            maxLength={300}
            defaultValue={product?.subtitle ?? ""}
            placeholder="A quiet line under the title"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Description</span>
          <textarea
            name="description"
            rows={6}
            maxLength={8000}
            defaultValue={product?.description_md ?? ""}
            placeholder="What it is, how it's made, how it arrives. Markdown is fine."
            className={field}
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={labelCls}>Category *</span>
            <select
              name="category"
              defaultValue={product?.category ?? "saints"}
              className={field}
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Classification *</span>
            <select
              name="classification"
              defaultValue={product?.classification ?? "printed_mounted"}
              className={field}
            >
              {Object.entries(CLASSIFICATION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Materials</span>
            <input
              name="materials"
              maxLength={500}
              defaultValue={product?.materials ?? ""}
              placeholder="Lithograph on wood, lacquered"
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Dimensions</span>
            <input
              name="dimensions"
              maxLength={300}
              defaultValue={product?.dimensions ?? ""}
              placeholder='6×8" (15×20 cm)'
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Production method</span>
            <input
              name="productionMethod"
              maxLength={500}
              defaultValue={product?.production_method ?? ""}
              placeholder="Giclée print, hand-mounted"
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Maker (public credit)</span>
            <input
              name="makerName"
              maxLength={200}
              defaultValue={product?.maker_name ?? ""}
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Country of origin</span>
            <input
              name="countryOfOrigin"
              maxLength={100}
              defaultValue={product?.country_of_origin ?? ""}
              className={field}
            />
          </label>
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="imageIsRepresentative"
            defaultChecked={product?.image_is_representative ?? true}
            className="mt-1 h-4 w-4 rounded border-paper/30 bg-night accent-[#c9a961]"
          />
          <span className="font-sans text-detail text-paper/70">
            The photo shows a representative example, not the exact piece the
            buyer receives. (Shown on the listing; honesty is the policy.)
          </span>
        </label>
      </section>

      <section className="space-y-5">
        <h2 className="font-display-serif text-title text-paper">
          Price &amp; availability
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={labelCls}>Price (USD) *</span>
            <input
              name="price"
              type="number"
              required
              min={1}
              max={100000}
              step="0.01"
              defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""}
              placeholder="49.00"
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Availability *</span>
            <select
              name="inventoryStatus"
              defaultValue={product?.inventory_status ?? "special_order"}
              className={field}
            >
              {Object.entries(INVENTORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Quantity on hand (ready-to-ship)</span>
            <input
              name="quantity"
              type="number"
              min={0}
              max={100000}
              defaultValue={product?.quantity_available ?? ""}
              placeholder="Leave blank if not tracked"
              className={field}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className={labelCls}>Dispatch, from (days) *</span>
              <input
                name="dispatchMin"
                type="number"
                required
                min={0}
                max={120}
                defaultValue={product?.dispatch_min_days ?? 1}
                className={field}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelCls}>to (days) *</span>
              <input
                name="dispatchMax"
                type="number"
                required
                min={0}
                max={120}
                defaultValue={product?.dispatch_max_days ?? 2}
                className={field}
              />
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!!busy || !storeLive}
          title={storeLive ? undefined : "Your store isn't live yet"}
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
        >
          {busy === "published" ? "Publishing…" : "Publish"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={(e) => void save(e.currentTarget.form!, "draft")}
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill border border-paper/25 px-8 font-sans text-ui font-semibold text-paper disabled:opacity-60"
        >
          {busy === "draft" ? "Saving…" : "Save as draft"}
        </button>
        {!storeLive ? (
          <p className="font-sans text-caption text-paper/55">
            Publishing unlocks when your store goes live.
          </p>
        ) : null}
      </div>
    </form>
  );
}
