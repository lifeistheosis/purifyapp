"use client";

import { useEffect, useRef, useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { CampaignReportSheet } from "@/components/campaigns/CampaignReportSheet";
import { TickBox } from "@/components/campaigns/TickLines";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Erase } from "@/components/ui/icons/Erase";
import { Picture } from "@/components/ui/icons/Picture";
import { Plus } from "@/components/ui/icons/Plus";
import { Shield } from "@/components/ui/icons/Shield";
import { Sheet } from "@/components/ui/Sheet";
import { addPicture, fetchPictures, removePicture, type PictureAdded, type PicturesResult } from "@/lib/campaigns/client";
import { PICTURE_ALT_MAX, PICTURE_MAX_BYTES, PICTURE_TYPES, showsPlusPlace } from "@/lib/campaigns/model";
import { cn } from "@/lib/cn";
import { clientSurface } from "@/lib/entitlements/client";
import { plusEnforcedFor } from "@/lib/entitlements/entitlements";

/**
 * A campaign's pictures (his item 121): three, or twenty with Purify Plus.
 *
 * BUILT, AND SWITCHED OFF ON THE SERVER (lib/campaigns/parts.ts). Nothing
 * here is drawn, and nothing is asked, until the server has told this device
 * that pictures are on (lib/campaigns/useCampaignsOpen.ts, useCampaignPart):
 * the page mounts this only then.
 *
 * What a reader sees: the pictures a moderator has cleared, in a row under
 * About; a tap opens one, with what its creator says it shows, and Report.
 * What its creator sees besides: their own pictures that still wait, each
 * marked so; a place to add one; and, at three, the next place with the Plus
 * mark, which opens the upgrade sheet. Plus is shown where it is met and
 * never promised to every reader, and not at all where it cannot be bought
 * (the server holds the limit either way, from the creator's entitlement).
 *
 * A picture is added with two lines ticked: "I am 18 or older", and that it
 * is theirs to share with the blessing of anyone in it.
 *
 * A campaign with no picture shows nothing here, and wears the app's own
 * icon of its kind at its head, so nobody feels they must post a photograph
 * of a sick person.
 */

/** A campaign's pictures, asked once the server says the part is on. */
export function useCampaignPictures(campaignId: string, on: boolean): { result: PicturesResult | null; reload: () => void } {
  const [result, setResult] = useState<PicturesResult | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!on) return;
    let live = true;
    void fetchPictures(campaignId).then((res) => {
      if (live) setResult(res);
    });
    return () => {
      live = false;
    };
  }, [campaignId, on, version]);
  return { result: on ? result : null, reload: () => setVersion((v) => v + 1) };
}

type Translate = (key: string) => string;

/** Why a picture was not taken, in the reader's words. */
function refusal(res: Extract<PictureAdded, { ok: false }>, t: Translate): string {
  switch (res.code) {
    case "picture_type":
    case "picture_unreadable":
      return t("campaigns.err.pictureType");
    case "picture_size":
      return t("campaigns.err.pictureSize");
    case "picture_refused":
      return t("campaigns.err.pictureRefused");
    case "picture_limit":
      return t("campaigns.err.pictureLimit");
    case "campaign_link":
      return t("campaigns.err.link");
    case "not_running":
      return t("campaigns.endedBody");
    default:
      return t("campaigns.err.pictureFailed");
  }
}

/** One place in the grid of pictures: a square, four to a row on a phone. */
const TILE = "relative aspect-square w-full min-w-0 overflow-hidden rounded-[14px]";

export function CampaignPictures({
  campaignId,
  mine,
  result,
  reload,
  onNotice,
}: {
  campaignId: string;
  mine: boolean;
  result: PicturesResult | null;
  reload: () => void;
  /** Said at the top of the page: a picture sent, a report sent. */
  onNotice: (message: string) => void;
}) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  if (result?.state !== "ok") return null;
  const { pictures, canAdd, limit } = result.pictures;
  if (pictures.length === 0 && !mine) return null;

  const openAt = pictures.findIndex((p) => p.id === openId);
  const open = openAt >= 0 ? pictures[openAt] : null;
  const waits = pictures.some((p) => p.held);
  // At three, where Plus can be bought: the next place is shown, with its mark.
  const plusPlace = showsPlusPlace({ mine, canAdd, limit, pictures: pictures.length, plusSold: plusEnforcedFor(clientSurface()) });

  async function remove() {
    const id = removing;
    if (!id || busy) return;
    setBusy(true);
    const res = await removePicture(campaignId, id);
    setBusy(false);
    setRemoving(null);
    if (!res.ok) {
      setFailed(t("campaigns.err.pictureRemove"));
      return;
    }
    setFailed(null);
    setOpenId(null);
    reload();
  }

  return (
    <section data-campaign-pictures="" aria-labelledby="campaign-pictures-title" className="mt-8">
      <h2 id="campaign-pictures-title" className="font-heading text-lede leading-tight text-paper">
        {t("campaigns.pictures")}
      </h2>
      {/* A grid, four to a row, and never a row to scroll sideways: twenty
          pictures stand in five rows, and the place after the third is on
          the screen where its creator will see it. */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {pictures.map((p) => (
          <button key={p.id} type="button" aria-haspopup="dialog" onClick={() => setOpenId(p.id)} className={cn(TILE, "tap-press bg-paper/[0.06]")}>
            <ArrivingImage src={p.url} alt={p.alt ?? t("campaigns.pictureAlt")} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            {p.held ? (
              <span className="absolute inset-x-0 bottom-0 bg-night px-1 py-1 text-center font-sans text-[11px] font-semibold leading-tight text-paper [overflow-wrap:anywhere]">
                {t("campaigns.pictureWaits")}
              </span>
            ) : null}
          </button>
        ))}
        {canAdd ? (
          // The sign alone, with its words as its name: "Add a picture" is
          // two long words in most languages and was cut on a tile this
          // size in twenty-four of sixty-three cases (twenty-one languages
          // at 390, 360 and 320 pixels). The sheet it opens says it in full.
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={t("campaigns.picturesAdd")}
            onClick={() => setAdding(true)}
            className={cn(TILE, "tap-press flex items-center justify-center border border-paper/25 text-paper hover:border-paper/45")}
          >
            <Plus size={22} />
          </button>
        ) : null}
        {plusPlace ? (
          // Two places wide, so the one Plus mark stands whole in it (components/billing/PlusMark.tsx).
          <button
            type="button"
            aria-label={t("campaigns.picturesPlus")}
            onClick={() => upgrade.open("general")}
            className="tap-press col-span-2 flex aspect-[2/1] min-w-0 items-center justify-center rounded-[14px] border border-paper/15 px-2 hover:border-paper/35"
          >
            <PlusMark />
          </button>
        ) : null}
      </div>
      {mine && waits ? <p className="mt-3 font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.picturesWaitingBody")}</p> : null}
      {failed ? (
        <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
          {failed}
        </p>
      ) : null}

      {/* One picture at a time: what it shows, and what can be done with it. */}
      <Sheet open={open !== null} onClose={() => setOpenId(null)} title={t("campaigns.pictures")} desktop openFull>
        {open ? (
          <div className="pb-1 pt-1">
            <div className="overflow-hidden rounded-[14px] bg-paper/[0.06]">
              <ArrivingImage key={open.id} src={open.url} alt={open.alt ?? t("campaigns.pictureAlt")} decoding="async" className="mx-auto block max-h-[48svh] w-auto max-w-full object-contain" />
            </div>
            {open.alt ? <p className="mt-3 break-words font-serif text-body leading-[1.6] text-paper/90">{open.alt}</p> : null}
            {open.held ? <p className="mt-3 font-sans text-detail leading-relaxed text-paper/75">{t("campaigns.picturesWaitingBody")}</p> : null}
            {/* One row: the picture before, what can be done with this one, the picture after. */}
            <div className="mt-4 flex items-center gap-2">
              {pictures.length > 1 ? (
                <button
                  type="button"
                  aria-label={t("common.previous")}
                  disabled={openAt <= 0}
                  onClick={() => setOpenId(pictures[openAt - 1].id)}
                  className="tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-paper/25 text-paper disabled:opacity-40"
                >
                  <ChevronLeft size={18} className="rtl:-scale-x-100" />
                </button>
              ) : null}
              {mine ? (
                <button
                  type="button"
                  onClick={() => setRemoving(open.id)}
                  className="tap-press inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper hover:border-paper/45"
                >
                  <Erase size={16} className="shrink-0" />
                  <span className="truncate">{t("campaigns.pictureRemove")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setReporting(open.id);
                    setOpenId(null);
                  }}
                  className="tap-press inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper hover:border-paper/45"
                >
                  <Shield size={16} className="shrink-0" />
                  <span className="truncate">{t("campaigns.report.pictureTitle")}</span>
                </button>
              )}
              {pictures.length > 1 ? (
                <button
                  type="button"
                  aria-label={t("common.next")}
                  disabled={openAt >= pictures.length - 1}
                  onClick={() => setOpenId(pictures[openAt + 1].id)}
                  className="tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-paper/25 text-paper disabled:opacity-40"
                >
                  <ChevronRight size={18} className="rtl:-scale-x-100" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Sheet>

      <AddPictureSheet
        open={adding}
        campaignId={campaignId}
        onClose={() => setAdding(false)}
        onAdded={() => {
          setAdding(false);
          reload();
          onNotice(t("campaigns.pictureSent"));
        }}
      />

      <CampaignReportSheet
        open={reporting !== null}
        campaignId={campaignId}
        pictureId={reporting ?? undefined}
        onClose={() => setReporting(null)}
        onDone={(message) => {
          setReporting(null);
          onNotice(message);
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        title={t("campaigns.pictureRemoveTitle")}
        description={t("campaigns.pictureRemoveBody")}
        confirmLabel={t("campaigns.pictureRemove")}
        cancelLabel={t("common.cancel")}
        destructive
        pending={busy}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}

/** Its creator adds one picture: the picture, what it shows, and the two lines to tick. */
function AddPictureSheet({ open, campaignId, onClose, onAdded }: { open: boolean; campaignId: string; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslate();
  const input = useRef<HTMLInputElement>(null);
  // The chosen picture, and an address for it on this device to show it by:
  // nothing is sent until Add.
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const file = chosen?.file ?? null;
  const preview = chosen?.url ?? null;
  const [alt, setAlt] = useState("");
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // That address is given back when another picture is chosen, and when the sheet goes.
  useEffect(() => {
    const url = chosen?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [chosen]);

  function choose(next: File | null) {
    setError(null);
    if (!next) return;
    if (!PICTURE_TYPES.includes(next.type)) {
      setError(t("campaigns.err.pictureType"));
      return;
    }
    // A phone's photo is larger than this as taken and is drawn smaller
    // before it is sent, so only one that could never fit is refused here.
    if (next.size > PICTURE_MAX_BYTES * 6) {
      setError(t("campaigns.err.pictureSize"));
      return;
    }
    setChosen({ file: next, url: URL.createObjectURL(next) });
  }

  async function send() {
    if (!file || !adult || !consent || busy) return;
    setBusy(true);
    setError(null);
    const res = await addPicture(campaignId, file, { adult, consent, alt });
    setBusy(false);
    if (!res.ok) {
      setError(refusal(res, t));
      return;
    }
    setChosen(null);
    setAlt("");
    setAdult(false);
    setConsent(false);
    onAdded();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("campaigns.picturesAdd")} desktop openFull keyboard>
      <div className="pb-1 pt-1">
        <input
          ref={input}
          type="file"
          accept={PICTURE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            choose(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {preview ? (
          <div className="overflow-hidden rounded-[14px] bg-paper/[0.06]">
            <ArrivingImage src={preview} alt="" decoding="async" className="mx-auto block max-h-[36svh] w-auto max-w-full object-contain" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn(
            "tap-press inline-flex min-h-11 items-center gap-2 rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper hover:border-paper/45",
            preview && "mt-3",
          )}
        >
          <Picture size={17} />
          {t("campaigns.pictureChoose")}
        </button>

        <label htmlFor="campaign-picture-alt" className="mt-5 block font-sans text-detail font-semibold text-paper/80">
          {t("campaigns.pictureShows")} <span className="font-normal text-paper/70">({t("common.optional")})</span>
        </label>
        <input
          id="campaign-picture-alt"
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          maxLength={PICTURE_ALT_MAX}
          aria-describedby="campaign-picture-alt-hint"
          className="mt-2 block min-h-11 w-full rounded-[12px] bg-paper/[0.06] px-3 py-2.5 font-sans text-[16px] leading-[24px] text-paper focus:outline-none"
        />
        <p id="campaign-picture-alt-hint" className="mt-2 font-sans text-caption leading-relaxed text-paper/70">
          {t("campaigns.pictureShowsHint")}
        </p>

        <div className="mt-4">
          <TickBox on={adult} onChange={setAdult}>
            {t("campaigns.pictureAdult")}
          </TickBox>
          <TickBox on={consent} onChange={setConsent}>
            {t("campaigns.pictureConsent")}
          </TickBox>
        </div>
        <p className="mt-3 font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.picturesNote")}</p>

        {error ? (
          <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void send()}
            disabled={!file || !adult || !consent || busy}
            className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {busy ? t("campaigns.pictureUploading") : t("campaigns.picturesAdd")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
