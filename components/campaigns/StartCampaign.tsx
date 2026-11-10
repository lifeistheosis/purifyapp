"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { TickLines } from "@/components/campaigns/TickLines";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TOP_PLATE } from "@/components/nav/topPlate";
import { WayPlate, WayRow } from "@/components/prayers/mine/WayRow";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DOOR, DOOR_COLS, DOOR_OFF, DOOR_ON } from "@/components/ui/doors";
import { Book } from "@/components/ui/icons/Book";
import { Check } from "@/components/ui/icons/Check";
import { Clock } from "@/components/ui/icons/Clock";
import { Close } from "@/components/ui/icons/Close";
import { Globe } from "@/components/ui/icons/Globe";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Minus } from "@/components/ui/icons/Minus";
import { Orans } from "@/components/ui/icons/Orans";
import { Plus } from "@/components/ui/icons/Plus";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Sheet } from "@/components/ui/Sheet";
import { startCampaign, type StartResult } from "@/lib/campaigns/client";
import {
  CAMPAIGN_PSALMS,
  CONSENT_LINE,
  DEFAULT_DAYS,
  KIND_LABEL,
  LENGTHS,
  LENGTH_LABEL,
  LIVING_KINDS,
  MAX_DAYS,
  NAME_MAX,
  TITLE_MAX,
  TITLE_MIN,
  WORDS_MAX,
  lastDayOf,
  type ConsentKind,
  type ForWhom,
  type LivingKind,
  type PrayerRef,
} from "@/lib/campaigns/model";
import { campaignIcon, dayText, lengthText } from "@/lib/campaigns/words";
import { cn } from "@/lib/cn";
import { goBack } from "@/lib/nav/goBack";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { getPrayerIcon } from "@/lib/prayers/icons";
import { todayKey } from "@/lib/rhythm/dayKey";
import { resolveUser } from "@/lib/supabase/resolveUser";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useKeyboardUp, useVisibleFrame } from "@/lib/ui/viewport";

/** Where the campaigns live in the app: Community's first half. */
const HOME = "/community#pray";
/** The status bar or the notch, which the page runs under (ComposePage). */
const INSET_TOP = "var(--inset-top, env(safe-area-inset-top, 0px))";

type Writer = { name: string; avatar: string | null };
type Opened = "kind" | "length" | "psalm" | null;
/** A length ticked, or a last day of the creator's own choosing. */
type LengthChoice = (typeof LENGTHS)[number] | "own";

/**
 * Starting a prayer campaign (1.9.1), a page of its own built as making a
 * post in Community is (components/community/ComposePage.tsx, the owner's
 * pick of r3-24): the picture of its kind fading in at the head, two doors
 * for whom it is, the title and the name on a hairline with no box, the
 * words, and a row each for the rest. Who will read it and Create stand at
 * the thumb and ride the keyboard.
 *
 * What it asks: for the living or the reposed; a title; a first name; the
 * creator's own words; what for (the living); how long, one to forty days;
 * a psalm of the prayer book (the living), or the name alone. Then the
 * blessing, worded for who it is for and kept with its day, and the rules.
 *
 * What it promises is what happens: a campaign is read by a moderator before
 * everyone can see it, and carries no link and no asking for money
 * (lib/campaigns/server.ts, startCampaign).
 */
export function StartCampaign() {
  const { t, tn, locale } = useTranslate();
  const router = useRouter();
  const frame = useVisibleFrame();
  const keyboard = useKeyboardUp();

  const [writer, setWriter] = useState<Writer | "out" | null>(null);
  const [whom, setWhom] = useState<ForWhom>("living");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [words, setWords] = useState("");
  const [kind, setKind] = useState<LivingKind | null>(null);
  const [length, setLength] = useState<Record<ForWhom, LengthChoice>>({ living: DEFAULT_DAYS.living as LengthChoice, departed: DEFAULT_DAYS.departed as LengthChoice });
  const [ownDays, setOwnDays] = useState(14);
  const [psalm, setPsalm] = useState<PrayerRef | null>(null);
  const [consent, setConsent] = useState<Exclude<ConsentKind, "family"> | null>(null);
  const [family, setFamily] = useState(false);
  const [rules, setRules] = useState(false);
  const [opened, setOpened] = useState<Opened>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askFiltered, setAskFiltered] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The page holds the screen, as the page for a new post does: what is
  // behind holds still and the tab bar steps aside.
  useEffect(() => {
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, []);

  useEffect(() => {
    let live = true;
    void resolveUser().then((auth) => {
      if (!live) return;
      if (auth.state !== "signed-in") {
        setWriter("out");
        return;
      }
      const meta = (auth.user.user_metadata ?? {}) as { display_name?: string; avatar_url?: string };
      setWriter({ name: (meta.display_name ?? "").trim() || auth.user.email?.split("@")[0] || "Reader", avatar: meta.avatar_url || null });
    });
    return () => {
      live = false;
    };
  }, []);

  const leave = () => goBack(router, HOME);
  useAndroidBack(opened === null && !askFiltered, leave);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented && opened === null && !askFiltered) leave();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, askFiltered]);

  const today = todayKey();
  const choice = length[whom];
  const days = choice === "own" ? ownDays : choice;
  const lastDay = lastDayOf(today, days);
  const lengthLine = t("campaigns.lengthTo", { length: lengthText(days, t, tn), date: dayText(lastDay, locale) });
  const icon = getPrayerIcon(campaignIcon(whom));
  const blessed = whom === "departed" ? family : consent !== null;
  const ready =
    writer !== null &&
    writer !== "out" &&
    title.trim().length >= TITLE_MIN &&
    name.trim().length > 0 &&
    (whom === "departed" || kind !== null) &&
    blessed &&
    rules &&
    !busy;

  const doors: { id: ForWhom; label: string; icon: ReactNode }[] = [
    { id: "living", label: t("prayers.diptychs.livingHeading"), icon: <Orans size={21} /> },
    { id: "departed", label: t("prayers.diptychs.reposedHeading"), icon: <Lampada size={21} /> },
  ];

  function refusal(res: Extract<StartResult, { ok: false }>): string {
    switch (res.code) {
      case "campaign_link":
        return t("campaigns.err.link");
      case "campaigns_running":
        return t("campaigns.err.running");
      case "campaigns_today":
        return t("campaigns.err.today");
      default:
        return res.status === 401 ? t("shop.signInToStartA") : t("campaigns.err.failed");
    }
  }

  async function send(confirmFiltered = false) {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = await startCampaign({
      forWhom: whom,
      kind: whom === "departed" ? "departed" : (kind as LivingKind),
      title: title.trim(),
      name: name.trim(),
      words: words.trim() || null,
      days,
      startsOn: today,
      prayer: whom === "living" ? psalm : null,
      consent: whom === "departed" ? "family" : (consent as ConsentKind),
      blessing: true,
      rules: true,
      confirmFiltered,
    });
    setBusy(false);
    setAskFiltered(false);
    if (res.ok) {
      // Its own page, where its creator sees it waiting for a moderator.
      router.replace(`/campaigns/detail?id=${encodeURIComponent(res.id)}`);
    } else if (res.code === "filtered") {
      setAskFiltered(true);
    } else {
      setError(refusal(res));
    }
  }

  const psalmLine = psalm ? t("today.greet.psalm", { ref: CAMPAIGN_PSALMS.find((p) => p.rule === psalm.rule && p.id === psalm.id)?.number ?? "" }) : t("campaigns.new.psalmNone");

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="campaign-new-title" data-campaign-new="" className="compose-page fixed inset-0 z-[80] bg-night">
      {/* As tall as what the keyboard leaves: the foot stands on it. */}
      <div className="absolute inset-x-0 top-0 flex h-full flex-col" style={frame ? { top: frame.top, height: frame.height } : undefined}>
        {/* The bar: the way out. */}
        <div className="absolute inset-x-0 top-0 z-20" style={{ paddingTop: INSET_TOP }}>
          <div className="relative mx-auto flex h-14 w-full max-w-[640px] items-center px-3">
            <button ref={closeRef} type="button" onClick={leave} aria-label={t("common.close")} className={`compose-plate ${TOP_PLATE} border border-paper/[0.13] text-paper`}>
              <Close size={18} />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* The head: the picture of its kind under Community's own shade. */}
          <div className="community-on-picture relative">
            <div
              aria-hidden
              className="community-head-picture pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[760px] overflow-hidden"
              style={{ height: `calc(${INSET_TOP} + 284px)` }}
            >
              {icon ? (
                <span key={icon.src} className="community-head-img absolute inset-0">
                  <ArrivingImage src={icon.src} decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 30%" }} />
                </span>
              ) : null}
              <span className="community-head-shade absolute inset-0" />
            </div>
            <div className="relative mx-auto w-full max-w-[640px] px-5" style={{ paddingTop: `calc(${INSET_TOP} + 4.375rem)` }}>
              <h1 id="campaign-new-title" className="community-head-title font-serif text-[30px] font-bold leading-[36px] text-paper">
                {t("shop.startAPrayerCampaign")}
              </h1>
              {writer && writer !== "out" ? (
                <div className="mt-3.5 flex items-center gap-3">
                  <CommunityAvatar name={writer.name} url={writer.avatar} size={38} />
                  <p className="min-w-0 truncate font-sans text-[15px] font-semibold leading-tight text-paper">{writer.name}</p>
                </div>
              ) : (
                <div aria-hidden className="mt-3.5 h-[38px]" />
              )}
            </div>
          </div>

          {/* relative: drawn over the head's picture, which reaches past the head. */}
          <div className="relative mx-auto w-full max-w-[640px] px-5 pb-8">
            {writer === "out" ? (
              <div className="mt-10 text-center">
                <p className="font-serif text-lede text-paper">{t("shop.signInToStartA")}</p>
                <Link
                  href="/signin?next=/campaigns/new"
                  className="mt-5 inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night hover:bg-paper/90"
                >
                  {t("common.signIn")}
                </Link>
              </div>
            ) : (
              <>
                {/* For whom: the doors, as making a post has them. */}
                <div role="group" aria-label={t("shop.forTheLivingOrThe")} className={cn("mt-7 grid gap-[9px]", DOOR_COLS[doors.length])}>
                  {doors.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={d.id === whom}
                      onClick={() => {
                        setWhom(d.id);
                        setError(null);
                      }}
                      className={cn(DOOR, "compose-door", d.id === whom ? cn(DOOR_ON, "compose-lit") : DOOR_OFF)}
                    >
                      {d.icon}
                      <span className="max-w-full truncate">{d.label}</span>
                    </button>
                  ))}
                </div>

                {/* The title, the name and the words, with no box, as a post's are. */}
                <div className="mt-6">
                  <label htmlFor="campaign-title-field" className="block font-sans text-detail font-semibold text-paper/80">
                    {t("journal.page.title")}
                  </label>
                  <input
                    id="campaign-title-field"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={TITLE_MAX}
                    placeholder={t("campaigns.new.titlePlaceholder")}
                    style={{ fontSize: 22 }}
                    className="mt-1 block min-h-11 w-full border-b border-paper/10 bg-transparent pb-2 font-serif font-semibold leading-[30px] text-paper placeholder:text-paper/55 focus:border-paper/30 focus:outline-none"
                  />

                  <label htmlFor="campaign-name-field" className="mt-5 block font-sans text-detail font-semibold text-paper/80">
                    {t("prayers.diptychs.name")}
                  </label>
                  <input
                    id="campaign-name-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={NAME_MAX}
                    autoComplete="off"
                    placeholder={t("campaigns.new.namePlaceholder")}
                    aria-describedby="campaign-name-hint"
                    className="mt-1 block min-h-11 w-full border-b border-paper/10 bg-transparent pb-2 font-sans text-[17px] leading-[26px] text-paper placeholder:text-paper/55 focus:border-paper/30 focus:outline-none"
                  />
                  <p id="campaign-name-hint" className="mt-1.5 font-sans text-caption leading-relaxed text-paper/70">
                    {t("campaigns.new.nameHint")}
                  </p>

                  <label htmlFor="campaign-words-field" className="mt-5 block font-sans text-detail font-semibold text-paper/80">
                    {t("campaigns.new.words")}
                  </label>
                  <textarea
                    id="campaign-words-field"
                    value={words}
                    onChange={(e) => setWords(e.target.value)}
                    rows={3}
                    maxLength={WORDS_MAX}
                    placeholder={t("shop.oneOrTwoLinesNo")}
                    aria-describedby="campaign-words-hint"
                    className="mt-1 block min-h-11 w-full resize-none border-b border-paper/10 bg-transparent pb-2.5 font-sans text-[16px] leading-[24px] text-paper/90 field-sizing-content placeholder:text-paper/55 focus:border-paper/30 focus:outline-none"
                  />
                  <p id="campaign-words-hint" className="mt-1.5 font-sans text-caption leading-relaxed text-paper/70">
                    {t("campaigns.new.counsel")}
                  </p>
                </div>

                {/* The rest, a row each, as Your rule sets its rows. */}
                <div className="set-panel mt-6">
                  {whom === "living" ? (
                    <WayRow
                      lead={
                        <WayPlate>
                          <Scroll size={18} />
                        </WayPlate>
                      }
                      label={t("campaigns.new.whatFor")}
                      desc={kind ? t(KIND_LABEL[kind]) : t("chant.ask.choose")}
                      onClick={() => setOpened("kind")}
                      opensSheet
                      oneLine
                    />
                  ) : null}
                  <WayRow
                    lead={
                      <WayPlate>
                        <Clock size={18} />
                      </WayPlate>
                    }
                    label={t("campaigns.new.howLong")}
                    desc={lengthLine}
                    onClick={() => setOpened("length")}
                    opensSheet
                    oneLine
                  />
                  {whom === "living" ? (
                    <WayRow
                      lead={
                        <WayPlate>
                          <Book size={18} />
                        </WayPlate>
                      }
                      label={t("campaigns.new.psalm")}
                      desc={psalmLine}
                      onClick={() => setOpened("psalm")}
                      opensSheet
                      oneLine
                    />
                  ) : null}
                </div>

                {/* The blessing: one line to tick, worded for who it is for. */}
                {whom === "departed" ? (
                  <div className="mt-5">
                    <TickBox on={family} onChange={setFamily}>
                      {t(CONSENT_LINE.family)}
                    </TickBox>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p id="campaign-blessing" className="font-sans text-detail font-semibold text-paper/80">
                      {t("together.kind")}
                    </p>
                    <div className="mt-3">
                      <TickLines
                        value={consent}
                        options={[
                          { id: "blessing" as const, label: t("campaigns.new.forOther"), desc: t(CONSENT_LINE.blessing) },
                          { id: "self" as const, label: t("campaigns.new.forMe"), desc: t(CONSENT_LINE.self) },
                          { id: "guardian" as const, label: t("campaigns.new.forChild"), desc: t(CONSENT_LINE.guardian) },
                        ]}
                        onChange={setConsent}
                        labelledBy="campaign-blessing"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  <TickBox on={rules} onChange={setRules}>
                    {t("campaigns.new.rulesAgree")}
                  </TickBox>
                  <Link href="/campaigns/rules" className="hit-44 ms-9 inline-flex font-sans text-detail font-semibold text-paper underline underline-offset-4">
                    {t("campaigns.rules.read")}
                  </Link>
                </div>

                <p className="mt-6 font-sans text-caption leading-[1.5] text-paper/70">{t("campaigns.new.note")}</p>
              </>
            )}
          </div>
        </div>

        {/* Who will read it, and Create, at the thumb: they ride the keyboard. */}
        {writer !== "out" ? (
          <div className={cn("compose-foot relative z-10 shrink-0 border-t border-paper/[0.09] bg-night", !keyboard && "safe-pb-edge pb-[env(safe-area-inset-bottom,0px)]")}>
            {error ? (
              <p role="alert" className="mx-auto w-full max-w-[640px] px-5 pt-2.5 font-sans text-detail text-crimson-soft">
                {error}
              </p>
            ) : null}
            <div className="mx-auto flex h-[62px] w-full max-w-[640px] items-center gap-3 pe-3.5 ps-5">
              <p className="flex min-w-0 flex-1 items-center gap-1.5 font-sans text-[12.5px] text-paper/70">
                <Globe className="shrink-0 text-paper/70" />
                <span className="truncate">{t("community.postingPublicly")}</span>
              </p>
              <button
                type="button"
                onClick={() => void send()}
                disabled={!ready}
                className={cn(
                  "hit-44 inline-flex h-9 shrink-0 items-center rounded-pill border px-[18px] font-sans text-[14.5px] font-semibold motion-safe:transition-colors",
                  ready ? "compose-lit border-paper bg-paper text-night" : "border-paper/[0.14] bg-paper/[0.035] text-paper/40",
                )}
              >
                {busy ? t("community.replySending") : t("campaigns.create")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* What for. */}
      <Sheet open={opened === "kind"} onClose={() => setOpened(null)} title={t("campaigns.new.whatFor")} desktop openFull layer="over-player">
        <p id="campaign-kind-label" className="sr-only">
          {t("campaigns.new.whatFor")}
        </p>
        <div className="pb-1 pt-1">
          <TickLines
            value={kind}
            options={LIVING_KINDS.map((k) => ({ id: k, label: t(KIND_LABEL[k]) }))}
            onChange={(k) => {
              setKind(k);
              setOpened(null);
            }}
            labelledBy="campaign-kind-label"
          />
        </div>
      </Sheet>

      {/* How long: a day, a week, thirty days, forty days, or a last day of the creator's own, forty days out at most. */}
      <Sheet open={opened === "length"} onClose={() => setOpened(null)} title={t("campaigns.new.howLong")} desktop openFull layer="over-player">
        <p id="campaign-length-label" className="sr-only">
          {t("campaigns.new.howLong")}
        </p>
        <div className="pb-1 pt-1">
          <TickLines
            value={choice}
            options={[
              ...LENGTHS.map((d) => ({ id: d as LengthChoice, label: t(LENGTH_LABEL[d]), desc: dayText(lastDayOf(today, d), locale) })),
              { id: "own" as LengthChoice, label: t("campaigns.new.chooseLastDay") },
            ]}
            onChange={(next) => setLength((l) => ({ ...l, [whom]: next }))}
            labelledBy="campaign-length-label"
          />
          {choice === "own" ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                aria-label={dayText(lastDayOf(today, Math.max(1, ownDays - 1)), locale)}
                onClick={() => setOwnDays((d) => Math.max(1, d - 1))}
                disabled={ownDays <= 1}
                className="tap-press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-paper/25 text-paper disabled:opacity-40"
              >
                <Minus size={18} />
              </button>
              <p role="status" className="min-w-0 flex-1 text-center font-sans text-ui text-paper">
                <span className="block font-semibold">{dayText(lastDayOf(today, ownDays), locale)}</span>
                <span className="block text-detail text-paper/70">{tn("plans.days", ownDays)}</span>
              </p>
              <button
                type="button"
                aria-label={dayText(lastDayOf(today, Math.min(MAX_DAYS, ownDays + 1)), locale)}
                onClick={() => setOwnDays((d) => Math.min(MAX_DAYS, d + 1))}
                disabled={ownDays >= MAX_DAYS}
                className="tap-press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-paper/25 text-paper disabled:opacity-40"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpened(null)}
            className="mt-5 inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
          >
            {t("common.done")}
          </button>
        </div>
      </Sheet>

      {/* A psalm of the prayer book, or the name alone. */}
      <Sheet open={opened === "psalm"} onClose={() => setOpened(null)} title={t("campaigns.new.psalm")} desktop openFull layer="over-player">
        <p id="campaign-psalm-label" className="sr-only">
          {t("campaigns.new.psalm")}
        </p>
        <div className="pb-1 pt-1">
          <TickLines
            value={psalm ? `${psalm.rule}/${psalm.id}` : "none"}
            options={[
              { id: "none", label: t("campaigns.new.psalmNone") },
              ...CAMPAIGN_PSALMS.map((p) => ({ id: `${p.rule}/${p.id}`, label: t("today.greet.psalm", { ref: p.number }) })),
            ]}
            onChange={(id) => {
              const found = CAMPAIGN_PSALMS.find((p) => `${p.rule}/${p.id}` === id);
              setPsalm(found ? { rule: found.rule, id: found.id } : null);
              setOpened(null);
            }}
            labelledBy="campaign-psalm-label"
          />
          <p className="mt-4 font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.new.psalmNote")}</p>
        </div>
      </Sheet>

      <ConfirmDialog
        open={askFiltered}
        title={t("community.filteredTitle")}
        description={t("campaigns.filteredBody")}
        confirmLabel={t("campaigns.filteredSend")}
        cancelLabel={t("campaigns.filteredEdit")}
        pending={busy}
        onConfirm={() => void send(true)}
        onCancel={() => setAskFiltered(false)}
      />
    </div>
  );
}

/** One line to tick, on its own: the family's blessing, and the rules. */
function TickBox({ on, onChange, children }: { on: boolean; onChange: (next: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-11 w-full items-start gap-3 py-2 text-start">
      <span aria-hidden className="rule-tick mt-0.5" data-on={on ? "" : undefined}>
        {on ? <Check size={12} /> : null}
      </span>
      <span className="min-w-0 flex-1 font-sans text-detail leading-relaxed text-paper/85">{children}</span>
    </button>
  );
}
