"use client";

import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";
const labelCls = "font-sans text-caption font-semibold text-paper/60";
const hintCls = "font-sans text-eyebrow text-paper/45";

/**
 * The store page, edited by the person whose store it is.
 *
 * Before this existed a seller could change NOTHING about their storefront:
 * the admin route's storeFields had no callers, and logo_url, banner_url,
 * shipping_policy_md and return_policy_md were reachable by nobody at all.
 * The last two already rendered on the storefront and could never be filled,
 * which is why every store fell back to two hardcoded claims that belonged to
 * EIKON.
 *
 * A client component because it uploads files and has to re-read its own state
 * afterwards. The three fields Purify owns (name, address, ownership line) are
 * SHOWN and not editable, rather than hidden: a seller who cannot see them
 * assumes nobody set them.
 */

type Store = {
  public_name: string | null;
  slug: string | null;
  status: string | null;
  ownership_disclosure: string | null;
  tagline: string | null;
  description: string | null;
  support_email: string | null;
  shipping_origin: string | null;
  shipping_policy_md: string | null;
  return_policy_md: string | null;
  logo_url: string | null;
  banner_url: string | null;
};

export function StoreForm() {
  const { t } = useTranslate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/shop/seller/store", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        // Checked before the body is read: a 403 answers with JSON too, and
        // storing it would render an error object as a store.
        if (!res.ok) {
          setError(t("shop.storeSaveFailed"));
          return;
        }
        const data = (await res.json()) as { store: Store | null };
        if (cancelled) return;
        setStore(data.store);
        setLogo(data.store?.logo_url ?? null);
        setBanner(data.store?.banner_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(t("shop.storeSaveFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function save(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    setSaved(false);
    const f = new FormData(form);
    const text = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? null : v;
    };
    try {
      const res = await apiFetch("/api/shop/seller/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagline: text("tagline"),
          description: text("description"),
          support_email: text("support_email"),
          shipping_origin: text("shipping_origin"),
          shipping_policy_md: text("shipping_policy_md"),
          return_policy_md: text("return_policy_md"),
          logo_url: logo,
          banner_url: banner,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setSaved(true);
        return;
      }
      setError(data.error ?? t("shop.storeSaveFailed"));
    } catch {
      setError(t("shop.storeSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 font-sans text-ui text-paper/55">{t("shop.storeLoading")}</p>
    );
  }
  if (!store) {
    return (
      <p role="alert" className="mt-6 font-sans text-ui text-crimson-soft">
        {error ?? t("shop.storeSaveFailed")}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(e.currentTarget);
      }}
      className="mt-8 space-y-10"
    >
      <p className={hintCls}>{t("shop.storeFixedFields")}</p>

      <section className="space-y-5">
        <h2 className="font-display-serif text-title text-paper">
          {t("shop.storeIdentity")}
        </h2>

        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.storeTagline")}</span>
          <input
            name="tagline"
            defaultValue={store.tagline ?? ""}
            maxLength={200}
            className={field}
          />
          <span className={hintCls}>{t("shop.storeTaglineHint")}</span>
        </label>

        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.storeDescription")}</span>
          <textarea
            name="description"
            defaultValue={store.description ?? ""}
            rows={5}
            maxLength={4000}
            className={field}
          />
          <span className={hintCls}>{t("shop.storeDescriptionHint")}</span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <ImageField
            label={t("shop.storeLogo")}
            hint={t("shop.storeLogoHint")}
            value={logo}
            onChange={setLogo}
          />
          <ImageField
            label={t("shop.storeBanner")}
            hint={t("shop.storeBannerHint")}
            value={banner}
            onChange={setBanner}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display-serif text-title text-paper">
          {t("shop.storeContact")}
        </h2>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.storeSupportEmail")}</span>
          <input
            name="support_email"
            type="email"
            defaultValue={store.support_email ?? ""}
            maxLength={320}
            className={field}
          />
          <span className={hintCls}>{t("shop.storeSupportEmailHint")}</span>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.storeShipsFrom")}</span>
          <input
            name="shipping_origin"
            defaultValue={store.shipping_origin ?? ""}
            maxLength={200}
            className={field}
          />
          <span className={hintCls}>{t("shop.storeShipsFromHint")}</span>
        </label>
      </section>

      <section className="space-y-5">
        <h2 className="font-display-serif text-title text-paper">
          {t("shop.storePolicies")}
        </h2>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.storeShippingPolicy")}</span>
          <textarea
            name="shipping_policy_md"
            defaultValue={store.shipping_policy_md ?? ""}
            rows={5}
            maxLength={8000}
            className={field}
          />
          <span className={hintCls}>{t("shop.storeShippingPolicyHint")}</span>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.storeReturnPolicy")}</span>
          <textarea
            name="return_policy_md"
            defaultValue={store.return_policy_md ?? ""}
            rows={5}
            maxLength={8000}
            className={field}
          />
          <span className={hintCls}>{t("shop.storeReturnPolicyHint")}</span>
        </label>
      </section>

      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="font-sans text-detail text-paper/70">
          {t("shop.storeSaved")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
      >
        {busy ? t("shop.storeSaving") : t("shop.storeSave")}
      </button>
    </form>
  );
}

/**
 * Upload, preview, remove. The URL is never typed: the value only ever comes
 * back from /api/shop/seller/media, and the API pins it to Purify's own
 * storage host, so a seller cannot point their banner at somebody else's
 * server (which would hotlink unreviewed content onto a Purify page and hand
 * every viewer's IP to whoever hosts it).
 */
function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const { t } = useTranslate();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch("/api/shop/seller/media", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        onChange(data.url);
        return;
      }
      setError(data.error ?? t("shop.storeUploadFailed"));
    } catch {
      setError(t("shop.storeUploadFailed"));
    } finally {
      setBusy(false);
      // Cleared so choosing the same file twice still fires a change event.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <span className={labelCls}>{label}</span>
      {value ? (
        <div className="overflow-hidden rounded-md border border-paper/12 bg-night">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="max-h-[160px] w-full object-contain"
          />
        </div>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={label}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
        className="block w-full font-sans text-detail text-paper/70 file:mr-3 file:min-h-[44px] file:rounded-pill file:border file:border-paper/20 file:bg-transparent file:px-4 file:font-sans file:text-ui file:font-semibold file:text-paper"
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className={hintCls}>{busy ? t("shop.storeUploading") : hint}</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-sans text-eyebrow font-semibold text-paper/60 hover:text-paper"
          >
            {t("shop.storeRemove")}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="font-sans text-eyebrow text-crimson-soft">
          {error}
        </p>
      ) : null}
    </div>
  );
}
