"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { ProfileAbout, ProfileBanner, ProfileHeader, profileSurface } from "@/components/community/profile/ProfileCard";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { ImageCropSheet, type CropShape } from "@/components/profile/ImageCropSheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CTA } from "@/components/premium/PremiumUI";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/SearchSelect";
import { SkeletonList } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api/client";
import { BOOKS, getBook } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { uploadAvatar } from "@/lib/community/client";
import {
  fetchMyProfile,
  removeBanner,
  saveMyProfile,
  setNowReadingOn,
  syncCalendar,
  uploadBanner,
  type ProfilePatch,
} from "@/lib/profile/client";
import { announcePicture } from "@/lib/profile/myPicture";
import {
  BANNER_COLORS,
  DECORATIONS,
  EFFECTS,
  SEASONAL_DECORATIONS,
  SEASONAL_EFFECTS,
  THEMES,
  inSeason,
  nextSeasonStart,
  normalizeHex,
  readableThemeColor,
  type Cosmetics,
} from "@/lib/profile/cosmetics";
import { HANDLE_COOLDOWN_MS, HANDLE_MAX, handleProblem, normalizeHandle } from "@/lib/profile/handle";
import { verseRef, type MyProfile, type PublicProfile } from "@/lib/profile/publicProfile";

/**
 * Editing your Community profile, with the card drawn live beside the form.
 *
 * Free for everyone: picture, @handle, status line, about, patron saint,
 * favourite verse and a banner colour. With Purify Plus, like Discord Nitro:
 * a banner picture, a two-colour theme, an avatar frame and a profile effect.
 *
 * A reader without Plus can try every Plus option on the preview before
 * paying; only saving it asks for Plus. The server holds the same line
 * (app/api/profile/me/route.ts), so this screen is a convenience, never the
 * rule. Saved Plus settings outlive a lapsed subscription and come back with
 * it.
 */

type Draft = {
  handle: string;
  status: string;
  bio: string;
  patronSaint: string;
  verseBook: string;
  verseChapter: string;
  verseVerse: string;
  bannerColor: string | null;
  themePrimary: string | null;
  themeAccent: string | null;
  decoration: string | null;
  effect: string | null;
  parish: string;
  private: boolean;
  hidePosts: boolean;
  hideJoined: boolean;
  showNowReading: boolean;
  prayerRequest: boolean;
};

type Patron = { slug: string; name: string };

const PARISH_MAX = 80;

const PLUS_KEYS: readonly (keyof Draft)[] = ["themePrimary", "themeAccent", "decoration", "effect"];

const STATUS_MAX = 60;
const BIO_MAX = 190;

function draftFrom(p: MyProfile): Draft {
  const [book = "", chapter = "", verse = ""] = p.favoriteVerse?.ref.split("/") ?? [];
  return {
    handle: p.handle,
    status: p.status ?? "",
    bio: p.bio ?? "",
    patronSaint: p.patronSaint?.slug ?? "",
    verseBook: book,
    verseChapter: chapter,
    verseVerse: verse,
    bannerColor: p.saved.bannerColor,
    themePrimary: p.saved.themePrimary,
    themeAccent: p.saved.themeAccent,
    decoration: p.saved.decoration,
    effect: p.saved.effect,
    parish: p.settings?.parish ?? "",
    private: p.settings?.private ?? false,
    hidePosts: p.settings?.hidePosts ?? false,
    hideJoined: p.settings?.hideJoined ?? false,
    showNowReading: p.settings?.showNowReading ?? false,
    prayerRequest: p.settings?.prayerRequest ?? false,
  };
}

/** "john/3/16" from the three verse fields, "" when all are empty, null when half done. */
function verseOf(d: Draft): string | null {
  const parts = [d.verseBook, d.verseChapter.trim(), d.verseVerse.trim()];
  if (parts.every((x) => !x)) return "";
  if (parts.some((x) => !x)) return null;
  return `${parts[0]}/${Number(parts[1])}/${Number(parts[2])}`;
}

/** Whole minutes until a handle changed at `changedAt` may change again. */
function minutesLeft(changedAt: string | null): number {
  if (!changedAt) return 0;
  const left = new Date(changedAt).getTime() + HANDLE_COOLDOWN_MS - Date.now();
  return left > 0 ? Math.ceil(left / 60000) : 0;
}

function plusChanged(a: Draft, b: Draft): boolean {
  return (
    a.themePrimary !== b.themePrimary ||
    a.themeAccent !== b.themeAccent ||
    a.decoration !== b.decoration ||
    a.effect !== b.effect
  );
}

export function ProfileEditor() {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Minutes until the handle may change again, worked out when the profile
  // arrives rather than on every render.
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  // A picture being placed before it is saved (ImageCropSheet).
  const [crop, setCrop] = useState<{ file: File; shape: CropShape; open: boolean } | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchMyProfile();
      if (!alive) return;
      if (res.ok) {
        setProfile(res.profile);
        setSaved(draftFrom(res.profile));
        setDraft(draftFrom(res.profile));
        setCooldownMinutes(minutesLeft(res.profile.handleChangedAt));
        setState("ready");
        // The name day line follows the calendar this device keeps.
        const synced = await syncCalendar(res.profile);
        if (alive && synced) setProfile(synced);
      } else {
        setState(res.code === "unavailable" ? "unavailable" : "error");
      }
    })();
    void (async () => {
      try {
        const r = await apiFetch("/api/saints/patrons");
        if (!r.ok || !alive) return;
        const { patrons: all } = (await r.json()) as { patrons: Patron[] };
        if (alive) setPatrons(all);
      } catch {
        // The picker stays on the saint already chosen; nothing else depends on it.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const patronOptions = useMemo<SearchSelectOption[]>(
    () => [
      { value: "__none__", label: t("patron.none") },
      ...(profile?.patronSaint && !patrons.some((p) => p.slug === profile.patronSaint?.slug)
        ? [{ value: profile.patronSaint.slug, label: profile.patronSaint.name }]
        : []),
      ...patrons.map((p) => ({ value: p.slug, label: p.name })),
    ],
    [patrons, profile, t],
  );
  const bookOptions = useMemo<SearchSelectOption[]>(
    () => [{ value: "__none__", label: t("profile.verseNone") }, ...BOOKS.map((b) => ({ value: b.slug, label: b.name }))],
    [t],
  );

  if (state !== "ready" || !profile || !draft || !saved) {
    return (
      <div className="py-10">
        {state === "loading" ? (
          <div aria-busy aria-label={t("profile.loading")}>
            <SkeletonList rows={4} />
          </div>
        ) : (
          <p className="text-center font-sans text-ui text-paper/65">
            {state === "unavailable" ? t("profile.notOpenYet") : t("profile.loadFailed")}
          </p>
        )}
      </div>
    );
  }

  const subscribed = profile.subscribed;
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setMessage(null);
  };

  const handle = normalizeHandle(draft.handle);
  const handleChanged = handle !== saved.handle;
  const problem = handleChanged ? handleProblem(handle) : null;
  const verse = verseOf(draft);
  const trying = !subscribed && plusChanged(draft, saved);

  // The card as it will look, with any Plus option the reader is trying on.
  const theme =
    draft.themePrimary && draft.themeAccent
      ? { primary: readableThemeColor(draft.themePrimary), accent: readableThemeColor(draft.themeAccent) }
      : { primary: null, accent: null };
  const cosmetics: Cosmetics = {
    bannerColor: normalizeHex(draft.bannerColor),
    bannerUrl: subscribed ? profile.saved.bannerUrl : null,
    themePrimary: theme.primary,
    themeAccent: theme.accent,
    decoration: draft.decoration,
    effect: draft.effect,
  };
  const patron = draft.patronSaint
    ? (patrons.find((p) => p.slug === draft.patronSaint) ??
      (profile.patronSaint?.slug === draft.patronSaint ? profile.patronSaint : null))
    : null;
  const preview: PublicProfile = {
    ...profile,
    handle: handle || profile.handle,
    status: draft.status.trim() || null,
    bio: draft.bio.trim() || null,
    patronSaint: patron,
    favoriteVerse: verse ? verseRef(verse, (slug) => getBook(slug)?.name ?? null) : null,
    cosmetics,
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  // Changes outside the Plus options, which anyone can save.
  const freeDirty = (Object.keys(draft) as (keyof Draft)[]).some(
    (k) => !PLUS_KEYS.includes(k) && draft[k] !== saved[k],
  );

  function errorText(code: string | null): string {
    switch (code) {
      case "handle_length":
      case "handle_chars":
      case "handle_dots":
      case "handle_reserved":
      case "handle_cooldown":
      case "handle_taken":
      case "verse":
      case "saint":
      case "plus_required":
      case "out_of_season":
        return t(`profile.err.${code}`);
      case "unavailable":
        return t("profile.notOpenYet");
      default:
        return t("profile.err.saveFailed");
    }
  }

  async function save() {
    if (!draft || !saved || saving) return;
    if (problem) return setMessage({ tone: "error", text: t(`profile.err.handle_${problem}`) });
    if (verse === null) return setMessage({ tone: "error", text: t("profile.err.verseIncomplete") });
    const patch: ProfilePatch = {};
    if (handleChanged) patch.handle = handle;
    if (draft.status !== saved.status) patch.status = draft.status.trim() || null;
    if (draft.bio !== saved.bio) patch.bio = draft.bio.trim() || null;
    if (draft.patronSaint !== saved.patronSaint) patch.patronSaint = draft.patronSaint || null;
    if (verse !== verseOf(saved)) patch.favoriteVerse = verse || null;
    if (draft.bannerColor !== saved.bannerColor) patch.bannerColor = draft.bannerColor;
    if (draft.parish !== saved.parish) patch.parish = draft.parish.trim() || null;
    if (draft.private !== saved.private) patch.private = draft.private;
    if (draft.hidePosts !== saved.hidePosts) patch.hidePosts = draft.hidePosts;
    if (draft.hideJoined !== saved.hideJoined) patch.hideJoined = draft.hideJoined;
    if (draft.showNowReading !== saved.showNowReading) patch.showNowReading = draft.showNowReading;
    if (draft.prayerRequest !== saved.prayerRequest) patch.prayerRequest = draft.prayerRequest;
    // Plus options go only with Plus. Tried-on ones stay on the preview.
    if (subscribed) {
      if (draft.themePrimary !== saved.themePrimary || draft.themeAccent !== saved.themeAccent) {
        patch.themePrimary = draft.themePrimary && draft.themeAccent ? draft.themePrimary : null;
        patch.themeAccent = draft.themePrimary && draft.themeAccent ? draft.themeAccent : null;
      }
      if (draft.decoration !== saved.decoration) patch.decoration = draft.decoration;
      if (draft.effect !== saved.effect) patch.effect = draft.effect;
    }
    if (Object.keys(patch).length === 0) {
      if (trying) upgrade.open("profile");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await saveMyProfile(patch);
    setSaving(false);
    if (!res.ok) return setMessage({ tone: "error", text: errorText(res.code) });
    // The Bible reader on this device sends the open chapter only while this
    // is on (lib/profile/client.ts); the server checks the real switch too.
    setNowReadingOn(res.profile.settings?.showNowReading ?? false);
    setProfile(res.profile);
    setCooldownMinutes(minutesLeft(res.profile.handleChangedAt));
    const fresh = draftFrom(res.profile);
    // Keep anything being tried on, so saving the free parts does not
    // take the frame off the preview.
    const next = subscribed
      ? fresh
      : { ...fresh, themePrimary: draft.themePrimary, themeAccent: draft.themeAccent, decoration: draft.decoration, effect: draft.effect };
    setSaved(fresh);
    setDraft(next);
    setMessage({ tone: "ok", text: trying ? t("profile.savedFreeParts") : t("profile.saved") });
  }

  async function changePhoto(file: File) {
    setPhotoBusy(true);
    setMessage(null);
    const res = await uploadAvatar(file);
    setPhotoBusy(false);
    if (res.ok && res.url) {
      const url = res.url;
      setProfile((p) => (p ? { ...p, avatar: url } : p));
      // The nav and the phone header follow at once.
      announcePicture(url);
    } else setMessage({ tone: "error", text: res.error ?? t("community.photoFailed") });
  }

  async function changeBanner(file: File | null) {
    if (!subscribed) return upgrade.open("profile");
    setBannerBusy(true);
    setMessage(null);
    const res = file ? await uploadBanner(file) : await removeBanner();
    setBannerBusy(false);
    if (!res.ok) return setMessage({ tone: "error", text: res.error || errorText(res.code) });
    if (res.profile) setProfile(res.profile);
  }

  const surface = profileSurface(cosmetics);
  const counter = (n: number, max: number) => (
    <span className={cn("font-sans text-caption tabular-nums", n > max - 10 ? "text-paper/70" : "text-paper/40")}>
      {t("profile.charsLeft", { count: max - n })}
    </span>
  );

  const previewCard = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-xl",
        surface.themed ? "dark-island border-white/10" : "border-paper/10 bg-night-soft",
      )}
      style={surface.style}
    >
      <ProfileEffect effect={cosmetics.effect} />
      <div className="relative z-10">
        <ProfileBanner cosmetics={cosmetics} className="h-24" />
        <div className="px-4 pb-5">
          <ProfileHeader profile={preview} avatarSize={76} ring={5} nameAs="p" />
          <div className="mt-4">
            <ProfileAbout profile={preview} compact />
          </div>
        </div>
      </div>
      {trying ? (
        <span className="absolute left-3 top-3 z-20 rounded-pill bg-black/55 px-2.5 py-1 font-sans text-eyebrow font-semibold text-white">
          {t("profile.previewing")}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="pb-28">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title text-paper">{t("profile.editTitle")}</h1>
          <p className="mt-1 font-sans text-detail text-paper/60">{t("profile.editSubtitle")}</p>
        </div>
        <Link
          href={`/community#@${saved.handle}`}
          className="inline-flex h-11 items-center rounded-pill border border-paper/20 px-4 font-sans text-detail font-semibold text-paper/85 hover:border-paper/40 hover:text-paper"
        >
          {t("profile.viewInCommunity")}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {/* Phone and tablet: the card first, so every change is seen. */}
        <div className="lg:order-2 lg:sticky lg:top-24">{previewCard}</div>

        <div className="min-w-0 space-y-5 lg:order-1">
          <Section title={t("profile.sectionYou")}>
            <div className="flex items-center gap-4">
              <CommunityAvatar name={profile.name} url={profile.avatar} size={56} decoration={draft.decoration} />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  disabled={photoBusy}
                  className="inline-flex h-11 items-center rounded-pill border border-paper/20 px-4 font-sans text-detail font-semibold text-paper/85 hover:border-paper/40 disabled:opacity-50"
                >
                  {photoBusy ? t("community.uploadingPhoto") : t("community.changePhoto")}
                </button>
                <p className="mt-1 font-sans text-caption text-paper/45">{t("profile.photoHint")}</p>
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCrop({ file: f, shape: "avatar", open: true });
                  e.target.value = "";
                }}
              />
            </div>

            <Field label={t("profile.handle")} htmlFor="pe-handle" hint={t("profile.handleHint")}>
              <div className="flex items-center rounded-lg border border-paper/15 bg-night focus-within:border-paper/40">
                <span className="pl-3.5 font-sans text-ui text-paper/45" aria-hidden="true">
                  @
                </span>
                <input
                  id="pe-handle"
                  value={draft.handle}
                  onChange={(e) => set({ handle: e.target.value.toLowerCase() })}
                  maxLength={HANDLE_MAX + 1}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby="pe-handle-note"
                  className="w-full bg-transparent px-1.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none"
                />
              </div>
              <p id="pe-handle-note" className={cn("mt-1.5 font-sans text-caption", problem ? "text-rose-300" : "text-paper/45")}>
                {problem
                  ? t(`profile.err.handle_${problem}`)
                  : handleChanged && cooldownMinutes > 0
                    ? t("profile.handleCooldownNote", { minutes: cooldownMinutes })
                    : t("profile.handleRule")}
              </p>
            </Field>

            <Field label={t("profile.status")} htmlFor="pe-status" aside={counter(draft.status.length, STATUS_MAX)}>
              <input
                id="pe-status"
                value={draft.status}
                onChange={(e) => set({ status: e.target.value })}
                maxLength={STATUS_MAX}
                placeholder={t("profile.statusPlaceholder")}
                className={FIELD}
              />
            </Field>

            <Field label={t("profile.aboutMe")} htmlFor="pe-bio" aside={counter(draft.bio.length, BIO_MAX)}>
              <textarea
                id="pe-bio"
                value={draft.bio}
                onChange={(e) => set({ bio: e.target.value })}
                maxLength={BIO_MAX}
                rows={3}
                placeholder={t("profile.bioPlaceholder")}
                className={FIELD}
              />
            </Field>

            <Field label={t("profile.parish")} htmlFor="pe-parish" aside={counter(draft.parish.length, PARISH_MAX)}>
              <input
                id="pe-parish"
                value={draft.parish}
                onChange={(e) => set({ parish: e.target.value })}
                maxLength={PARISH_MAX}
                placeholder={t("profile.parishPlaceholder")}
                className={FIELD}
              />
            </Field>
          </Section>

          <Section title={t("profile.sectionKeep")}>
            <Field label={t("profile.patronSaint")}>
              <SearchSelect
                value={draft.patronSaint || "__none__"}
                onChange={(v) => set({ patronSaint: v === "__none__" ? "" : v })}
                options={patronOptions}
                placeholder={t("patron.none")}
                ariaLabel={t("profile.patronSaint")}
                searchPlaceholder={t("patron.search")}
                emptyLabel={t("patron.noMatch")}
              />
              {profile.nextNameDay && draft.patronSaint === saved.patronSaint ? (
                <p className="mt-1.5 font-sans text-caption text-paper/55">
                  {profile.nextNameDay.today
                    ? t("profile.nameDayIsToday")
                    : t("profile.nameDayOn", { date: dateLabel(profile.nextNameDay.date) })}
                </p>
              ) : null}
            </Field>
            <Field label={t("profile.favoriteVerse")}>
              <div className="grid grid-cols-[minmax(0,1fr)_76px_76px] gap-2">
                <SearchSelect
                  value={draft.verseBook || "__none__"}
                  onChange={(v) => set({ verseBook: v === "__none__" ? "" : v, ...(v === "__none__" ? { verseChapter: "", verseVerse: "" } : {}) })}
                  options={bookOptions}
                  placeholder={t("profile.verseBook")}
                  ariaLabel={t("profile.verseBook")}
                  searchPlaceholder={t("profile.verseSearch")}
                  emptyLabel={t("profile.verseNoMatch")}
                />
                <input
                  inputMode="numeric"
                  aria-label={t("profile.verseChapter")}
                  placeholder={t("profile.verseChapterShort")}
                  value={draft.verseChapter}
                  onChange={(e) => set({ verseChapter: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                  className={FIELD}
                />
                <input
                  inputMode="numeric"
                  aria-label={t("profile.verseVerse")}
                  placeholder={t("profile.verseVerseShort")}
                  value={draft.verseVerse}
                  onChange={(e) => set({ verseVerse: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                  className={FIELD}
                />
              </div>
            </Field>
          </Section>

          <Section title={t("profile.sectionSharing")}>
            <Toggle
              label={t("profile.prayerToggle")}
              hint={t("profile.prayerToggleHint")}
              on={draft.prayerRequest}
              onChange={(v) => set({ prayerRequest: v })}
            />
            <Toggle
              label={t("profile.nowReadingToggle")}
              hint={t("profile.nowReadingToggleHint")}
              on={draft.showNowReading}
              onChange={(v) => set({ showNowReading: v })}
            />
            <Toggle
              label={t("profile.privateToggle")}
              hint={t("profile.privateToggleHint")}
              on={draft.private}
              onChange={(v) => set({ private: v })}
            />
            <Toggle
              label={t("profile.hidePostsToggle")}
              hint={t("profile.hidePostsToggleHint")}
              on={draft.hidePosts}
              onChange={(v) => set({ hidePosts: v })}
            />
            <Toggle
              label={t("profile.hideJoinedToggle")}
              hint={t("profile.hideJoinedToggleHint")}
              on={draft.hideJoined}
              onChange={(v) => set({ hideJoined: v })}
            />
          </Section>

          <Section title={t("profile.sectionBanner")}>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("profile.bannerColor")}>
              <Swatch
                selected={!draft.bannerColor}
                label={t("profile.none")}
                onClick={() => set({ bannerColor: null })}
              >
                <span className="block size-full rounded-full border border-dashed border-paper/35" />
              </Swatch>
              {BANNER_COLORS.map((c) => (
                <Swatch
                  key={c.id}
                  selected={draft.bannerColor === c.hex}
                  label={t(`profile.color.${c.id}`)}
                  onClick={() => set({ bannerColor: c.hex })}
                >
                  <span className="block size-full rounded-full" style={{ background: c.hex }} />
                </Swatch>
              ))}
              <label className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-paper/20 text-paper/70 hover:border-paper/40">
                <span className="sr-only">{t("profile.customColor")}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <input
                  type="color"
                  value={draft.bannerColor ?? "#8f6f35"}
                  onChange={(e) => set({ bannerColor: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </Section>

          <section className="rounded-2xl border border-premium/30 bg-premium/[0.04] p-5" aria-labelledby="pe-plus">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p id="pe-plus" role="heading" aria-level={2} className="font-serif text-lede text-paper">
                  {subscribed ? t("profile.plusTitleActive") : t("profile.plusTitle")}
                </p>
                <p className="mt-1 font-sans text-detail leading-relaxed text-paper/65">
                  {subscribed ? t("profile.plusBodyActive") : t("profile.plusBody")}
                </p>
              </div>
              {!subscribed ? (
                <button type="button" onClick={() => upgrade.open("profile")} className={cn(PREMIUM_CTA, "min-h-11 px-5 text-detail")}>
                  {t("profile.plusUnlock")}
                </button>
              ) : null}
            </div>

            <div className="mt-5 space-y-5">
              <Field label={t("profile.bannerPicture")}>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (subscribed ? bannerRef.current?.click() : upgrade.open("profile"))}
                    disabled={bannerBusy}
                    className="inline-flex h-11 items-center rounded-pill border border-paper/20 px-4 font-sans text-detail font-semibold text-paper/85 hover:border-paper/40 disabled:opacity-50"
                  >
                    {bannerBusy
                      ? t("profile.bannerUploading")
                      : profile.saved.bannerUrl
                        ? t("profile.bannerReplace")
                        : t("profile.bannerUpload")}
                  </button>
                  {subscribed && profile.saved.bannerUrl ? (
                    <button
                      type="button"
                      onClick={() => void changeBanner(null)}
                      disabled={bannerBusy}
                      className="inline-flex h-11 items-center rounded-pill px-3 font-sans text-detail font-medium text-paper/60 hover:text-paper disabled:opacity-50"
                    >
                      {t("profile.bannerRemove")}
                    </button>
                  ) : null}
                  {!subscribed ? <PlusTag /> : null}
                  <input
                    ref={bannerRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCrop({ file: f, shape: "banner", open: true });
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="mt-1.5 font-sans text-caption text-paper/45">{t("profile.bannerHint")}</p>
              </Field>

              <Field label={t("profile.theme")}>
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("profile.theme")}>
                  <Swatch
                    selected={!draft.themePrimary || !draft.themeAccent}
                    label={t("profile.none")}
                    onClick={() => set({ themePrimary: null, themeAccent: null })}
                  >
                    <span className="block size-full rounded-full border border-dashed border-paper/35" />
                  </Swatch>
                  {THEMES.map((th) => (
                    <Swatch
                      key={th.id}
                      selected={draft.themePrimary === th.primary && draft.themeAccent === th.accent}
                      label={t(`profile.theme.${th.id}`)}
                      onClick={() => set({ themePrimary: th.primary, themeAccent: th.accent })}
                    >
                      <span
                        className="block size-full rounded-full"
                        style={{ background: `linear-gradient(180deg, ${th.primary} 0 50%, ${th.accent} 50% 100%)` }}
                      />
                    </Swatch>
                  ))}
                  <ColorPair
                    primary={draft.themePrimary}
                    accent={draft.themeAccent}
                    label={t("profile.customTheme")}
                    onChange={(primary, accent) => set({ themePrimary: primary, themeAccent: accent })}
                  />
                </div>
              </Field>

              <Field label={t("profile.frame")}>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("profile.frame")}>
                  <OptionTile selected={!draft.decoration} label={t("profile.none")} onClick={() => set({ decoration: null })}>
                    <CommunityAvatar name={profile.name} url={profile.avatar} size={36} />
                  </OptionTile>
                  {DECORATIONS.map((d) => (
                    <OptionTile
                      key={d}
                      selected={draft.decoration === d}
                      label={t(`profile.frameName.${d}`)}
                      onClick={() => set({ decoration: d })}
                    >
                      <CommunityAvatar name={profile.name} url={profile.avatar} size={36} decoration={d} />
                    </OptionTile>
                  ))}
                </div>
              </Field>

              <Field label={t("profile.seasonal")}>
                <p className="-mt-0.5 mb-2 font-sans text-caption text-paper/50">{t("profile.seasonalHint")}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("profile.seasonal")}>
                  {SEASONAL_DECORATIONS.map((d) => {
                    const open = inSeason(d) || saved.decoration === d;
                    return (
                      <OptionTile
                        key={d}
                        selected={draft.decoration === d}
                        label={t(`profile.frameName.${d}`)}
                        note={open ? t("profile.inSeason") : t("profile.returns", { date: dateLabel(nextSeasonStart(d) ?? "") })}
                        disabled={!open}
                        onClick={() => set({ decoration: d })}
                      >
                        <CommunityAvatar name={profile.name} url={profile.avatar} size={36} decoration={d} />
                      </OptionTile>
                    );
                  })}
                  {SEASONAL_EFFECTS.map((fx) => {
                    const open = inSeason(fx) || saved.effect === fx;
                    return (
                      <OptionTile
                        key={fx}
                        selected={draft.effect === fx}
                        label={t(`profile.effectName.${fx}`)}
                        note={open ? t("profile.inSeason") : t("profile.returns", { date: dateLabel(nextSeasonStart(fx) ?? "") })}
                        disabled={!open}
                        onClick={() => set({ effect: fx })}
                        wide
                      >
                        <span className="relative block h-10 w-16 overflow-hidden rounded-md bg-night">
                          <ProfileEffect effect={fx} />
                        </span>
                      </OptionTile>
                    );
                  })}
                </div>
              </Field>

              <Field label={t("profile.effect")}>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("profile.effect")}>
                  <OptionTile selected={!draft.effect} label={t("profile.none")} onClick={() => set({ effect: null })} wide>
                    <span className="block h-10 w-16 rounded-md bg-night" />
                  </OptionTile>
                  {EFFECTS.map((fx) => (
                    <OptionTile
                      key={fx}
                      selected={draft.effect === fx}
                      label={t(`profile.effectName.${fx}`)}
                      onClick={() => set({ effect: fx })}
                      wide
                    >
                      <span className="relative block h-10 w-16 overflow-hidden rounded-md bg-night">
                        <ProfileEffect effect={fx} />
                      </span>
                    </OptionTile>
                  ))}
                </div>
              </Field>
            </div>
          </section>
        </div>
      </div>

      {/* The save bar. It floats above the tab bar while there is something
          to save, and says so, the way Discord's does. */}
      {dirty || message ? (
        <div
          role="region"
          aria-label={t("profile.saveBar")}
          className="fixed inset-x-4 z-40 mx-auto flex max-w-[640px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-paper/15 bg-night-soft px-4 py-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)] bottom-[calc(var(--tab-bar-h)+var(--now-playing-h)+env(safe-area-inset-bottom,0px)+12px)] md:bottom-6"
        >
          <p
            role="status"
            className={cn(
              "min-w-0 flex-1 font-sans text-detail",
              message?.tone === "error" ? "text-rose-300" : message ? "text-paper/80" : "text-paper/70",
            )}
          >
            {message ? message.text : trying ? t("profile.tryingNote") : t("profile.unsaved")}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {dirty ? (
              <button
                type="button"
                onClick={() => {
                  setDraft(saved);
                  setMessage(null);
                }}
                disabled={saving}
                className="inline-flex min-h-11 items-center rounded-pill px-3.5 font-sans text-detail font-medium text-paper/65 hover:text-paper disabled:opacity-50"
              >
                {t("profile.reset")}
              </button>
            ) : null}
            {dirty && trying && !freeDirty ? (
              <button type="button" onClick={() => upgrade.open("profile")} className={cn(PREMIUM_CTA, "min-h-11 px-4 text-detail")}>
                {t("profile.plusUnlock")}
              </button>
            ) : dirty ? (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || Boolean(problem)}
                className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night disabled:opacity-50"
              >
                {saving ? t("profile.saving") : t("common.save")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ImageCropSheet
        open={crop?.open ?? false}
        file={crop?.file ?? null}
        shape={crop?.shape ?? "avatar"}
        onCancel={() => setCrop((c) => (c ? { ...c, open: false } : c))}
        onConfirm={(cropped) => {
          const shape = crop?.shape;
          setCrop((c) => (c ? { ...c, open: false } : c));
          if (shape === "banner") void changeBanner(cropped);
          else void changePhoto(cropped);
        }}
      />
    </div>
  );
}

const FIELD =
  "w-full rounded-lg border border-paper/15 bg-night px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <p role="heading" aria-level={2} className="font-serif text-lede text-paper">
        {title}
      </p>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  aside,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="font-sans text-detail font-semibold text-paper/80">
            {label}
          </label>
        ) : (
          <p className="font-sans text-detail font-semibold text-paper/80">{label}</p>
        )}
        {aside}
      </div>
      {hint ? <p className="sr-only">{hint}</p> : null}
      {children}
    </div>
  );
}

function Swatch({
  selected,
  label,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full p-1.5 transition-shadow",
        selected ? "shadow-[0_0_0_2px_var(--color-paper)]" : "shadow-[0_0_0_1px_rgb(255_255_255/0.12)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.35)]",
      )}
    >
      {children}
    </button>
  );
}

function OptionTile({
  selected,
  label,
  note,
  disabled = false,
  onClick,
  wide = false,
  children,
}: {
  selected: boolean;
  label: string;
  /** A line under the name: a season's state. */
  note?: string;
  disabled?: boolean;
  onClick: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border px-2 pb-2 pt-3 transition-colors disabled:cursor-default",
        note ? "w-[96px]" : wide ? "w-[84px]" : "w-[76px]",
        selected ? "border-paper/50 bg-paper/[0.08]" : "border-paper/10 hover:border-paper/30",
        disabled && "opacity-55 hover:border-paper/10",
      )}
    >
      <span className="flex h-12 items-center justify-center">{children}</span>
      <span className="line-clamp-2 w-full text-center font-sans text-caption leading-tight text-paper/70">{label}</span>
      {note ? <span className="w-full text-center font-sans text-eyebrow leading-tight text-premium-soft">{note}</span> : null}
    </button>
  );
}

/** An on/off switch with its explanation, in the house style (EmailPreferences). */
function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-sans text-ui text-paper">{label}</p>
        <p className="mt-0.5 font-sans text-caption leading-[1.5] text-paper/55">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn(
          "hit-44 relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          on ? "border-gold/50 bg-gold/40" : "border-paper/20 bg-paper/10",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-paper transition-[left]",
            on ? "left-[22px]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  );
}

/** "2027-04-11" as "April 11", in the reader's language. */
function dateLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T12:00:00Z`);
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || undefined, { month: "long", day: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return iso;
  }
}

/** A custom two-colour theme: top and bottom, each its own picker. */
function ColorPair({
  primary,
  accent,
  label,
  onChange,
}: {
  primary: string | null;
  accent: string | null;
  label: string;
  onChange: (primary: string, accent: string) => void;
}) {
  const p = primary ?? "#5b3a6e";
  const a = accent ?? "#141018";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-paper/20 p-1" role="group" aria-label={label}>
      <label className="relative block size-7 cursor-pointer overflow-hidden rounded-full" style={{ background: p }}>
        <span className="sr-only">{label}</span>
        <input
          type="color"
          value={p}
          onChange={(e) => onChange(e.target.value, a)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <label className="relative block size-7 cursor-pointer overflow-hidden rounded-full" style={{ background: a }}>
        <span className="sr-only">{label}</span>
        <input
          type="color"
          value={a}
          onChange={(e) => onChange(p, e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </span>
  );
}

function PlusTag() {
  const { t } = useTranslate();
  return (
    <span className="inline-flex items-center rounded-pill border border-premium/40 px-2 py-0.5 font-sans text-eyebrow font-semibold text-premium-ink">
      {t("profile.plusTag")}
    </span>
  );
}
