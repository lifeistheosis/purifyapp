"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { CampaignJoinSheet } from "@/components/campaigns/CampaignJoinSheet";
import { CampaignReportSheet } from "@/components/campaigns/CampaignReportSheet";
import { TickLines } from "@/components/campaigns/TickLines";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ButtonRow, Row, Switch } from "@/components/settings/LitPanel";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Check } from "@/components/ui/icons/Check";
import { Close } from "@/components/ui/icons/Close";
import { Erase } from "@/components/ui/icons/Erase";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Plus } from "@/components/ui/icons/Plus";
import { Shield } from "@/components/ui/icons/Shield";
import { ShareButton } from "@/components/ui/ShareButton";
import { Sheet } from "@/components/ui/Sheet";
import { carriedOne, type CarryPick } from "@/lib/campaigns/carried";
import { closeCampaign, fetchCampaign, keepCampaign, takeDownCampaign, type OneResult } from "@/lib/campaigns/client";
import { CLOSINGS, isDay, isRunning, type Closing, type PublicCampaign } from "@/lib/campaigns/model";
import { CAMPAIGN_MENU_EVENT } from "@/lib/campaigns/pageMenu";
import { campaignUpkeep } from "@/lib/campaigns/useCampaignUpkeep";
import { useCampaignPsalm } from "@/lib/campaigns/useCampaignPsalm";
import { useCarried } from "@/lib/campaigns/useCarried";
import { campaignIcon, dayText, forWhomLabel, lengthTo, setIn, standingLabel } from "@/lib/campaigns/words";
import { cn } from "@/lib/cn";
import { blockCommunityAuthor } from "@/lib/community/client";
import { DEPARTED_PRAYER, departedPrayer } from "@/lib/prayers/commemoration";
import { getPrayerIcon } from "@/lib/prayers/icons";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";
import { goBack } from "@/lib/nav/goBack";
import { todayKey } from "@/lib/rhythm/dayKey";

/** Where the campaigns live in the app: Community's first half. */
const HOME = "/community#pray";

/** The saint's row's pill (components/saints/BumpButton.tsx). */
const PILL =
  "tap-press inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-pill px-4 font-sans text-ui font-semibold motion-safe:transition-colors";

/**
 * A campaign's own page (1.9.1), built as a saint's page is: its picture at
 * the head under a clear bar, its name over the picture's foot, then what a
 * reader does with it. Pray goes to the prayer, which stands whole on the
 * page with the name in it, word for word from the prayer book and with its
 * printing. Add to my prayers puts the name into the reader's own prayers
 * (CampaignJoinSheet). Share sends its link, which names nobody.
 *
 * Nobody is counted: the page says who asked, what for, and until when.
 *
 * Its creator sees it while it waits for a moderator, and can close it early
 * or take it down from the menu at the top; everyone else finds Report and
 * Block there.
 *
 * The two bars are the page file's own (app/(app)/campaigns/detail/page.tsx),
 * handed in, because only a page or a layout mounts a bar (lib/nav/__tests__/
 * backBar.test.ts). `bar` starts clear over the picture and is set only once
 * the campaign is on the screen, so it finds the title it waits for;
 * `plainBar` stands over the page while it opens, or when there is nothing to
 * open.
 */
export function CampaignPage({ bar, plainBar }: { bar: ReactNode; plainBar: ReactNode }) {
  const { t } = useTranslate();
  const id = useSearchParams().get("id") ?? "";
  const [found, setFound] = useState<{ id: string; result: OneResult } | null>(null);

  useEffect(() => {
    let live = true;
    if (!id) return;
    void fetchCampaign(id).then((result) => {
      if (!live) return;
      setFound({ id, result });
      // One that is gone or over leaves the reader's own prayers now, not at
      // the next upkeep.
      if (result.state === "missing" || (result.state === "ok" && !isRunning(result.campaign))) void campaignUpkeep(true);
    });
    return () => {
      live = false;
    };
  }, [id]);

  const result = found && found.id === id ? found.result : null;
  if (!id || result?.state === "missing" || result?.state === "error") {
    return (
      <>
        {plainBar}
        <div className="mx-auto w-full max-w-[640px] px-5 py-16 text-center">
          <p className="font-serif text-lede text-paper">{t(result?.state === "error" ? "shop.thisCampaignCouldNotBe" : "shop.thisCampaignCouldNotBeX")}</p>
          <Link href={HOME} className="mt-6 inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-5 font-sans text-detail font-semibold text-paper hover:border-paper/45">
            {t("community.prayTogether")}
          </Link>
        </div>
      </>
    );
  }
  if (!result) {
    return (
      <>
        {plainBar}
        <p role="status" className="px-5 py-16 text-center font-sans text-detail text-paper/70">
          {t("shop.openingTheCampaign")}
        </p>
      </>
    );
  }
  return <Opened key={result.campaign.id} first={result.campaign} bar={bar} />;
}

function Opened({ first, bar }: { first: PublicCampaign; bar: ReactNode }) {
  const { t, tn, locale } = useTranslate();
  const router = useRouter();
  const [campaign, setCampaign] = useState(first);
  const carried = useCarried();
  const today = todayKey();
  const [sheet, setSheet] = useState<"join" | "menu" | "report" | "end" | null>(null);
  const [confirm, setConfirm] = useState<"takeDown" | "block" | null>(null);
  const [closing, setClosing] = useState<Closing>(first.for_whom === "departed" ? "memory_eternal" : "answered");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const name = campaign.subject_name ?? campaign.title;
  const running = isRunning(campaign);
  const standing = campaign.status === "active" && !running ? "campaigns.ended" : standingLabel(campaign.status);
  const mine = campaign.mine === true;
  const added = carriedOne(carried, campaign.id, today) !== null;
  const pick: CarryPick | null =
    running && isDay(campaign.ends_on)
      ? {
          id: campaign.id,
          name,
          title: campaign.title,
          forWhom: campaign.for_whom,
          prayer: campaign.prayer_rule && campaign.prayer_id ? { rule: campaign.prayer_rule, id: campaign.prayer_id } : null,
          lastDay: campaign.ends_on,
        }
      : null;
  const psalm = useCampaignPsalm(pick?.prayer ?? (campaign.prayer_rule && campaign.prayer_id ? { rule: campaign.prayer_rule, id: campaign.prayer_id } : null));
  const icon = getPrayerIcon(campaignIcon(campaign.for_whom));
  const length = lengthTo(campaign, locale, t, tn);
  const started = dayText(campaign.starts_on ?? campaign.created_at.slice(0, 10), locale);
  const creator = campaign.creator_name;

  // The ••• at the top is the bar's, and asks (lib/campaigns/pageMenu.ts).
  useEffect(() => {
    const open = () => setSheet("menu");
    window.addEventListener(CAMPAIGN_MENU_EVENT, open);
    return () => window.removeEventListener(CAMPAIGN_MENU_EVENT, open);
  }, []);

  // Pray on its card under Pray together leads here, to the prayer: the page
  // was still opening when the address named it, so it is found now.
  useEffect(() => {
    if (window.location.hash !== "#campaign-prayer") return;
    document.getElementById("campaign-prayer")?.scrollIntoView({ block: "start" });
  }, []);

  function said(message: string) {
    setSheet(null);
    setFailed(null);
    setNotice(message);
  }

  async function end() {
    if (busy) return;
    setBusy(true);
    const res = await closeCampaign(campaign.id, closing);
    setBusy(false);
    if (!res.ok) {
      setFailed(t("campaigns.endFailed"));
      return;
    }
    setCampaign({ ...campaign, status: closing });
    setSheet(null);
    setNotice(null);
    void campaignUpkeep(true);
  }

  /** For the reposed: its creator keeps it after its last day, or stops (his yes to item 125). */
  async function keep(next: boolean) {
    if (busy) return;
    setBusy(true);
    const res = await keepCampaign(campaign.id, next);
    setBusy(false);
    if (!res.ok) {
      setSheet(null);
      setFailed(t("campaigns.err.failed"));
      return;
    }
    setCampaign({ ...campaign, keep_after_end: next });
  }

  async function takeDown() {
    if (busy) return;
    setBusy(true);
    const res = await takeDownCampaign(campaign.id);
    setBusy(false);
    setConfirm(null);
    if (!res.ok) {
      setFailed(t("campaigns.takeDownFailed"));
      return;
    }
    void campaignUpkeep(true);
    goBack(router, HOME);
  }

  async function block() {
    if (busy || !campaign.creator_handle) return;
    setBusy(true);
    const res = await blockCommunityAuthor({ profileHandle: campaign.creator_handle });
    setBusy(false);
    setConfirm(null);
    if (!res.ok) {
      setFailed(t("community.blockFailed"));
      return;
    }
    goBack(router, HOME);
  }

  return (
    <div data-campaign-page="">
      {bar}
      <section className="bg-night px-5 pb-16">
        <div className="mx-auto w-full max-w-[640px]">
          <header className="pb-2">
            {/* The picture a campaign wears: the app's own icon of its kind. */}
            <div className="saint-icon-in under-topbar picture-melt relative -mx-5 aspect-[9/10] max-h-[70svh] overflow-hidden">
              {icon ? <ArrivingImage src={icon.src} alt={icon.alt} decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" /> : null}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-night/80 to-transparent" />
            </div>
            <div className="relative -mt-28 text-start">
              <div className="saint-head-in" style={{ "--i": 1 } as CSSProperties}>
                <h1 id="campaign-title" className="break-words text-title leading-[1.1] text-balance text-paper">
                  {campaign.title}
                </h1>
                <p className="mt-2 font-sans text-ui leading-snug text-paper/70">
                  {t(forWhomLabel(campaign.for_whom))}
                  {length ? (
                    <>
                      <span aria-hidden className="mx-1.5">
                        {"·"}
                      </span>
                      {length}
                    </>
                  ) : null}
                </p>
                {standing ? (
                  <p data-campaign-standing="" className="mt-2 font-sans text-ui font-semibold leading-snug text-paper">
                    {t(standing)}
                  </p>
                ) : null}
              </div>
              {creator ? (
                <div className="saint-head-in mt-4 flex items-center gap-3" style={{ "--i": 2 } as CSSProperties}>
                  <CommunityAvatar name={creator} url={null} size={38} />
                  <p className="min-w-0 font-sans text-detail leading-snug text-paper/70">
                    <span className="block truncate text-[15px] font-semibold text-paper">{creator}</span>
                    {started ? <span className="block truncate">{t("campaigns.startedOn", { date: started })}</span> : null}
                  </p>
                </div>
              ) : null}
              {/* The three things a reader does with it, as its card under
                  Pray together has them (components/community/CampaignCard.tsx). */}
              <div className="saint-head-in mt-5 flex items-center gap-2" style={{ "--i": 3 } as CSSProperties}>
                <a href="#campaign-prayer" className={cn(PILL, "reader-lit shrink-0 bg-paper text-night")}>
                  <Lampada size={18} />
                  {t("streak.pray")}
                </a>
                {pick ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setSheet("join")}
                    className={cn(PILL, "flex-1 border text-paper", added ? "border-paper/45" : "border-paper/25 hover:border-paper/50")}
                  >
                    {added ? <Check size={16} className="shrink-0" /> : <Plus size={16} className="shrink-0" />}
                    <span className="truncate">{added ? t("community.wallInMyPrayers") : t("community.wallAdd")}</span>
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                {/* Not while it waits for a moderator: its link opens for nobody else yet. */}
                {campaign.status === "held" ? null : <ShareButton title={t("community.prayerCampaigns")} round />}
              </div>
              {notice || failed ? (
                <p role={failed ? "alert" : "status"} className={cn("mt-3 font-sans text-detail", failed ? "text-crimson-soft" : "text-paper/75")}>
                  {failed ?? notice}
                </p>
              ) : null}
            </div>
          </header>

          <div className="pt-5">
            {campaign.status === "held" ? <p className="mb-6 font-sans text-detail leading-relaxed text-paper/75">{t("campaigns.waitingBody")}</p> : null}
            {standing && campaign.status !== "held" ? <p className="mb-6 font-sans text-detail leading-relaxed text-paper/75">{t("campaigns.endedBody")}</p> : null}

            {campaign.details ? <p className="whitespace-pre-line break-words font-serif text-body leading-[1.7] text-paper/90">{campaign.details}</p> : null}

            {/* The prayer, whole, with the name in it: word for word from the
                prayer book, and where it is printed. */}
            <h2 id="campaign-prayer" tabIndex={-1} className="mt-8 scroll-mt-24 font-heading text-lede leading-tight text-paper focus:outline-none">
              {t("campaigns.thePrayer")}
            </h2>
            {campaign.for_whom === "departed" ? (
              <>
                <div lang="en" className="mt-3">
                  {departedPrayer([name]).map((line, i) => (
                    <p key={i} className={cn("break-words font-serif text-[16px] italic leading-[1.6] text-paper/90", i > 0 && "mt-2")}>
                      {line}
                    </p>
                  ))}
                </div>
                <p className="mt-3 font-sans text-caption leading-relaxed text-paper/70">
                  {t("prayers.reader.sourceLabel")} {DEPARTED_PRAYER.source}
                </p>
              </>
            ) : (
              <div className="mt-3">
                <p className="break-words font-serif text-[16px] italic leading-[1.6] text-paper/90">{t("prayers.commemorate.living")}</p>
                <p className="mt-2 break-words font-serif text-[16px] leading-[1.6] text-paper">{name}</p>
              </div>
            )}
            {psalm ? (
              <div className="mt-6">
                <h3 className="font-sans text-detail font-semibold text-paper/80">{t("today.greet.psalm", { ref: psalm.number })}</h3>
                <div lang="en" className="mt-2">
                  {(psalm.prayer.text ?? "").split(/\n\n+/).map((stanza, i) => (
                    <p key={i} className={cn("whitespace-pre-line break-words font-serif text-[16px] leading-[1.6] text-paper/90", i > 0 && "mt-3")}>
                      {stanza}
                    </p>
                  ))}
                </div>
                <p className="mt-3 font-sans text-caption leading-relaxed text-paper/70">
                  {t("prayers.reader.sourceLabel")} {psalm.source}
                </p>
              </div>
            ) : null}
            {pick ? <p className="mt-5 font-sans text-caption leading-relaxed text-paper/70">{setIn(t("campaigns.thePrayerHow"), { name })}</p> : null}

            <div className="mt-10 border-t border-paper/10 pt-5 font-sans text-caption leading-[1.6] text-paper/70">
              <p>{t("shop.campaignsAreThePrayersOf")}</p>
              <p className="mt-2 select-text">{t("campaigns.contact", { email: SUPPORT_EMAIL })}</p>
            </div>
          </div>
        </div>
      </section>

      <CampaignJoinSheet open={sheet === "join"} pick={pick} onClose={() => setSheet(null)} onDone={said} />
      <CampaignReportSheet open={sheet === "report"} campaignId={campaign.id} onClose={() => setSheet(null)} onDone={said} />

      {/* The menu at the top: what its creator can do, or Report and Block. */}
      <Sheet open={sheet === "menu"} onClose={() => setSheet(null)} title={campaign.title} desktop openFull>
        {/* Settings' own rows (components/settings/LitPanel.tsx): a glyph on
            its plate, the words, and what the row does. */}
        <div className="set-panel mb-1 mt-1">
          {mine ? (
            <>
              {campaign.for_whom === "departed" ? (
                <Row
                  icon={<Bookmark size={17} />}
                  label={t("campaigns.keepAfter")}
                  description={t("campaigns.keptThirty")}
                  control={<Switch on={campaign.keep_after_end === true} onChange={(on) => void keep(on)} label={t("campaigns.keepAfter")} />}
                />
              ) : null}
              {running ? <ButtonRow icon={<Hourglass size={17} />} label={t("campaigns.end")} onClick={() => setSheet("end")} /> : null}
              <ButtonRow
                icon={<Erase size={17} />}
                label={t("campaigns.takeDown")}
                onClick={() => {
                  setSheet(null);
                  setConfirm("takeDown");
                }}
              />
            </>
          ) : (
            <>
              <ButtonRow icon={<Shield size={17} />} label={t("community.report")} onClick={() => setSheet("report")} />
              {campaign.creator_handle && creator ? (
                <ButtonRow
                  icon={<Close size={17} />}
                  label={setIn(t("community.blockAria"), { name: creator })}
                  onClick={() => {
                    setSheet(null);
                    setConfirm("block");
                  }}
                />
              ) : null}
            </>
          )}
        </div>
        {/* How long it is kept, said to its creator where they decide about it. */}
        {mine && campaign.for_whom === "living" ? <p className="mt-3 font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.keptThirty")}</p> : null}
      </Sheet>

      {/* Closing it early, with one of the two closings. */}
      <Sheet open={sheet === "end"} onClose={() => setSheet(null)} title={t("campaigns.end")} desktop openFull>
        <div className="pb-1 pt-1">
          <p id="campaign-end-how" className="font-sans text-detail leading-relaxed text-paper/75">
            {t("campaigns.endBody")}
          </p>
          <div className="mt-4">
            <TickLines
              value={closing}
              options={CLOSINGS.map((c) => ({ id: c, label: t(c === "answered" ? "campaigns.closing.answered" : "shop.memoryEternal") }))}
              onChange={setClosing}
              labelledBy="campaign-end-how"
            />
          </div>
          <button
            type="button"
            onClick={() => void end()}
            disabled={busy}
            className="mt-5 inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {busy ? t("ui.working") : t("campaigns.end")}
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirm === "takeDown"}
        title={t("campaigns.takeDown")}
        description={t("campaigns.takeDownConfirm")}
        confirmLabel={t("campaigns.takeDownYes")}
        cancelLabel={t("campaigns.takeDownKeep")}
        destructive
        pending={busy}
        onConfirm={() => void takeDown()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "block"}
        title={setIn(t("community.blockConfirmTitle"), { name: creator ?? "" })}
        description={t("community.blockConfirmBody")}
        confirmLabel={t("community.block")}
        cancelLabel={t("common.cancel")}
        destructive
        pending={busy}
        onConfirm={() => void block()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
