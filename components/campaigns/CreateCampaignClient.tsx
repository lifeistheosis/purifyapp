"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  INTENTIONS,
  DURATIONS,
  defaultPrayerKey,
  presetsFor,
  type CampaignIntention,
  type ForWhom,
} from "@/lib/campaigns/campaigns";
import { createCampaign, uploadCampaignImage } from "@/lib/campaigns/client";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function CreateCampaignClient() {
  const { t } = useTranslate();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [intention, setIntention] = useState<CampaignIntention>("healing");
  const [forWhom, setForWhom] = useState<ForWhom>("living");
  const [subjectName, setSubjectName] = useState("");
  const [note, setNote] = useState("");
  const [prayerKey, setPrayerKey] = useState<string>(defaultPrayerKey("healing"));
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [blessing, setBlessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  function pickIntention(slug: CampaignIntention) {
    setIntention(slug);
    const def = INTENTIONS.find((i) => i.slug === slug)?.defaultFor ?? "living";
    setForWhom(def);
    setPrayerKey(defaultPrayerKey(slug));
  }

  function changeForWhom(f: ForWhom) {
    setForWhom(f);
    // Keep the chosen prayer valid for the new context, else sensible default.
    if (!presetsFor(f).some((p) => p.key === prayerKey)) {
      setPrayerKey(f === "departed" ? "memory-eternal" : defaultPrayerKey(intention));
    }
  }

  const departedFixed = intention === "departed";
  const prayers = presetsFor(departedFixed ? "departed" : forWhom);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (title.trim().length < 3) {
      setError("Give the campaign a short title.");
      return;
    }
    if (!blessing) {
      setError("Please confirm this is your own request or you have their blessing.");
      return;
    }
    if (uploading) {
      setError("Give the picture a moment to finish uploading.");
      return;
    }
    if (imageUrl && !photoConsent) {
      setError("Please confirm you may share this picture.");
      return;
    }
    setBusy(true);
    const res = await createCampaign({
      title: title.trim(),
      intention,
      forWhom: departedFixed ? "departed" : forWhom,
      subjectName: subjectName.trim() || null,
      note: note.trim() || null,
      prayerKey,
      durationDays: durationDays as 7 | 9 | 40 | null,
      blessing: true,
      imageUrl,
      ...(imageUrl ? { photoConsent: true as const } : {}),
    });
    setBusy(false);
    if (res.ok && res.id) {
      router.push(`/campaigns/detail?id=${res.id}`);
    } else {
      setError(res.error ?? "Couldn't start your campaign.");
    }
  }

  if (signedIn === false) {
    return (
      <Shell>
        <p className="font-serif text-lede text-paper/85">
          {t("shop.signInToStartA")}
        </p>
        <Link
          href="/signin?next=/campaigns/new"
          className="mt-5 inline-flex rounded-pill bg-paper px-6 py-3 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("common.signIn")}
        </Link>
      </Shell>
    );
  }

  const labelCls =
    "block font-sans text-caption font-semibold uppercase tracking-[1px] text-paper/50 mb-2";
  const inputCls =
    "w-full rounded-lg border border-paper/15 bg-black/30 px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/30 focus:border-gold/45 focus:outline-none transition-colors";

  return (
    <Shell>
      <Link
        href="/campaigns"
        className="font-sans text-caption text-paper/50 hover:text-paper/80"
      >
        {t("shop.allCampaigns")}
      </Link>
      <h1 className="mt-4 font-display-serif text-title text-paper">
        {t("shop.startAPrayerCampaign")}
      </h1>
      <p className="mt-2 font-sans text-ui leading-relaxed text-paper/60">
        {t("shop.askTheCommunityToPray")}
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-6">
        <div className="reveal-rise" style={{ animationDelay: "60ms" }}>
          <label htmlFor="title" className={labelCls}>
            {t("study.title")}
          </label>
          <input
            id="title"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("shop.prayForMyGrandmotherS")}
          />
        </div>

        <div className="reveal-rise" style={{ animationDelay: "120ms" }}>
          <span className={labelCls}>{t("shop.whatIsItFor")}</span>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {INTENTIONS.map((i) => (
              <SelectCard
                key={i.slug}
                selected={intention === i.slug}
                onClick={() => pickIntention(i.slug)}
                title={i.label}
                sub={i.sub}
              />
            ))}
          </div>
        </div>

        {!departedFixed ? (
          <div className="reveal-rise" style={{ animationDelay: "180ms" }}>
            <span className={labelCls}>{t("shop.forTheLivingOrThe")}</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(["living", "departed"] as ForWhom[]).map((f) => (
                <SelectCard
                  key={f}
                  selected={forWhom === f}
                  onClick={() => changeForWhom(f)}
                  title={f === "departed" ? "The departed" : "The living"}
                  sub={f === "departed" ? "Memory eternal" : "A prayer for the living"}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="reveal-rise" style={{ animationDelay: "240ms" }}>
          <span className={labelCls}>{t("shop.chooseAPrayer")}</span>
          <div className="space-y-2.5">
            {prayers.map((p) => (
              <SelectCard
                key={p.key}
                selected={prayerKey === p.key}
                onClick={() => setPrayerKey(p.key)}
                title={p.label}
                sub={p.text}
                serif
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="subject" className={labelCls}>
            {t("shop.firstNameOrCauseOptional")}
          </label>
          <input
            id="subject"
            className={inputCls}
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            maxLength={80}
            placeholder={t("shop.mariaOrThePersecutedIn")}
          />
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>
            {t("shop.aWordAboutItOptional")}
          </label>
          <textarea
            id="note"
            className={`${inputCls} min-h-[90px] resize-y`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder={t("shop.oneOrTwoLinesNo")}
          />
        </div>

        <div>
          <span className={labelCls}>{t("campaigns.pictureOptional")}</span>
          {imageUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-paper/15">
              {/* eslint-disable-next-line @next/next/no-img-element -- the
                  static export runs images unoptimized anyway, and this is a
                  transient preview of a just-uploaded file. */}
              <img
                src={imageUrl}
                alt={t("campaigns.pictureAlt")}
                className="block max-h-[260px] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null);
                  setPhotoConsent(false);
                }}
                className="absolute right-3 top-3 rounded-pill bg-night/80 px-3 py-1.5 font-sans text-caption font-semibold text-paper backdrop-blur transition-colors hover:bg-night"
              >
                {t("campaigns.pictureRemove")}
              </button>
            </div>
          ) : (
            <label
              className={`flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
                uploading
                  ? "border-gold/40 bg-gold/[0.06]"
                  : "border-paper/20 bg-paper/[0.02] hover:border-gold/45"
              }`}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  // Let the same file be chosen again after a failure.
                  e.target.value = "";
                  if (!file) return;
                  setError(null);
                  setUploading(true);
                  const res = await uploadCampaignImage(file);
                  setUploading(false);
                  if (res.ok && res.url) setImageUrl(res.url);
                  else setError(res.error ?? "Couldn't upload that picture.");
                }}
              />
              <span className="font-sans text-ui text-paper/60">
                {uploading
                  ? t("campaigns.pictureUploading")
                  : t("campaigns.pictureChoose")}
              </span>
            </label>
          )}
          <p className="mt-2 font-sans text-caption leading-relaxed text-paper/45">
            {t("campaigns.pictureNote")}
          </p>
          {imageUrl ? (
            <label className="mt-3 flex items-start gap-3">
              <input
                type="checkbox"
                checked={photoConsent}
                onChange={(e) => setPhotoConsent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-gold"
              />
              <span className="font-sans text-caption leading-relaxed text-paper/65">
                {t("campaigns.pictureConsent")}
              </span>
            </label>
          ) : null}
        </div>

        <div className="reveal-rise" style={{ animationDelay: "300ms" }}>
          <span className={labelCls}>{t("shop.howLongShouldItRun")}</span>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {DURATIONS.map((d) => (
              <SelectCard
                key={d.label}
                selected={durationDays === d.days}
                onClick={() => setDurationDays(d.days)}
                title={d.label}
                sub={d.sub}
              />
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={blessing}
            onChange={(e) => setBlessing(e.target.checked)}
            className="mt-1 h-4 w-4 accent-gold"
          />
          <span className="font-sans text-caption leading-relaxed text-paper/65">
            {t("shop.thisIsMyOwnRequest")}
          </span>
        </label>

        {error ? (
          <p className="font-sans text-caption text-crimson-soft">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy || uploading}
          className="inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-[transform,background-color] hover:bg-paper/90 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Starting…" : uploading ? "Uploading…" : "Start the campaign"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[560px]">{children}</div>
    </section>
  );
}

function CheckMark() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * A selectable option card used across the create-campaign flow (intention,
 * for-whom, prayer, duration). Clear selected state, a tick that fills in, and
 * a small press animation on tap. Replaces the old flat pills.
 */
function SelectCard({
  selected,
  onClick,
  title,
  sub,
  serif = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
  serif?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative w-full rounded-xl border px-4 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 active:scale-[0.98] ${
        selected
          ? "border-gold/60 bg-gold/[0.10] shadow-[0_0_0_1px_rgba(212,175,55,0.22)]"
          : "border-paper/12 bg-paper/[0.02] hover:border-paper/30 hover:bg-paper/[0.04]"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span
            className={`block font-sans text-ui font-semibold ${
              selected ? "text-gold-pale" : "text-paper"
            }`}
          >
            {title}
          </span>
          {sub ? (
            <span
              className={`mt-0.5 block leading-snug text-paper/55 ${
                serif ? "font-serif text-caption italic" : "font-sans text-caption"
              }`}
            >
              {sub}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
            selected
              ? "border-gold bg-gold/20 text-gold-pale"
              : "border-paper/25 text-transparent"
          }`}
        >
          <CheckMark />
        </span>
      </span>
    </button>
  );
}
