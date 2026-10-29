"use client";

// Words as a picture, made to the reader's taste (1.8, the owner's "mix of A
// and B" of round 11: Homebase/boards/purify-master/variants/
// 16b-verse-picture-AB.html, r18/choose/11b). Share on the Verse of the Day
// opens this one sheet: the picture as it will be sent, then three tabs.
//
//   Look   Light, Horizon, Christ, Trinity, Plain, and the reader's own photo
//          last, chosen on the phone and drawn there, never sent anywhere.
//   Words  the reading serif, a sans or bold capitals; their size; the
//          reference and the cross on or off; left or centre.
//   Size   Story 9:16, Square, Post 4:5.
//
// Then Save and Share. The foot of every picture reads "Purify App". With
// the Christ or the Trinity look the icon stands whole above the words, and
// the cross cannot be put over it.
//
// It takes any words with a line under them (lib/share/verseCard.ts,
// PictureWords), so a saint's words and his name open it the same way;
// `referenceLabel` names the switch for that line.
//
// VerseCardActions loads it on the first tap of Share (next/dynamic), so
// Today carries no canvas for a reader who never shares.

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Plus } from "@/components/ui/icons/Plus";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import {
  loadPicture,
  lookSrc,
  paintPrepared,
  paintTile,
  preparePicture,
  readPhoto,
  renderVerseCard,
  type LoadedImage,
} from "@/lib/share/drawVerseCard";
import { saveImage, shareImage } from "@/lib/share/shareImage";
import {
  DEFAULT_STYLE,
  FONT_ORDER,
  LOOKS,
  SHAPES,
  SHAPE_ORDER,
  SHAPE_RATIOS,
  TEXT_SCALES,
  YOURS,
  cardFileName,
  lookOf,
  type Font,
  type Look,
  type PictureStyle,
  type PictureWords,
  type Shape,
} from "@/lib/share/verseCard";

/** The preview is drawn at half the picture's size: sharp on a phone, a quarter of the pixels. */
const PREVIEW_SCALE = 0.5;
/** A look's tile, as the design draws it, and how many pixels it is drawn with. */
const TILE = 50;
const TILE_SCALE = 3;

type Tab = "look" | "words" | "size";
const TABS: readonly { id: Tab; key: string }[] = [
  { id: "look", key: "picture.tab.look" },
  { id: "words", key: "picture.tab.words" },
  { id: "size", key: "ui.size" },
];
const FONT_KEYS: Record<Font, string> = { serif: "bible.fontSerif", sans: "settings.fontSans", caps: "picture.font.caps" };
const SHAPE_KEYS: Record<Shape, string> = { story: "picture.shape.story", square: "picture.shape.square", post: "picture.shape.post" };

/** A choice that is on: white, softly lit (the owner's accent, never yellow). */
const ON = "reader-lit bg-paper font-semibold text-night";

export function PictureSheet({
  open,
  onClose,
  words,
  title,
  name,
  caption,
  referenceLabel,
}: {
  open: boolean;
  onClose: () => void;
  /** The words and the line under them. Keep it the same object while they are the same: the preview is drawn again when it changes. */
  words: PictureWords;
  /** The sheet's name: "Verse picture". */
  title: string;
  /** What the file is named for: the reference, or whose words they are. */
  name: string;
  /** Sent with the picture, where the share sheet takes words too. */
  caption: string;
  /** The switch for the line under the words, by its name. "Reference" by default. */
  referenceLabel?: string;
}) {
  const { t } = useTranslate();
  const id = useId();
  const [style, setStyle] = useState<PictureStyle>(DEFAULT_STYLE);
  const [tab, setTab] = useState<Tab>("look");
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [fits, setFits] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Held as state, not a ref: the sheet mounts what it holds a render after
  // it opens, and the preview is drawn when its canvas is there.
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shape = SHAPES[style.shape];
  const icon = lookOf(style.look).kind === "icon";

  const change = (patch: Partial<PictureStyle>) => {
    setStatus(null);
    setStyle((now) => ({ ...now, ...patch }));
  };

  // The preview, drawn when its canvas is mounted and again whenever the
  // words, the style or the photo change.
  useEffect(() => {
    if (!canvas) return;
    let live = true;
    void preparePicture(words, style, { photo }).then((prepared) => {
      if (!live) return;
      if (prepared) paintPrepared(canvas, prepared, PREVIEW_SCALE);
      setFits(Boolean(prepared));
    });
    return () => {
      live = false;
    };
  }, [canvas, words, style, photo]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    const read = await readPhoto(file);
    if (!read) {
      setStatus(t("picture.photoFailed"));
      return;
    }
    setPhoto(read);
    change({ look: YOURS.id });
  }

  function chooseYours() {
    if (photo && style.look !== YOURS.id) change({ look: YOURS.id });
    // No photo yet, or a second tap on the chosen one: pick one from the phone.
    else fileRef.current?.click();
  }

  async function send(how: "save" | "share") {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const picture = await renderVerseCard(words, style, { photo });
      if (!picture) {
        setStatus(t("today.verse.couldNotMakePicture"));
        return;
      }
      const file = cardFileName(name);
      const outcome = how === "save" ? await saveImage(picture, file, caption) : await shareImage(picture, file, caption);
      if (outcome === "shared") onClose();
      else if (outcome === "saved") setStatus(t("today.verse.pictureSaved"));
      else if (outcome === "failed") setStatus(t("today.verse.couldNotMakePicture"));
    } catch {
      setStatus(t("today.verse.couldNotMakePicture"));
    } finally {
      setBusy(false);
    }
  }

  // Arrow keys move along the tabs, as a tab list does.
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, at: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (at + step + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} openFull desktop>
      {/* The picture, as it will be sent. */}
      <div className="relative flex justify-center pt-1">
        <canvas
          ref={setCanvas}
          width={shape.width * PREVIEW_SCALE}
          height={shape.height * PREVIEW_SCALE}
          role="img"
          aria-label={t("picture.preview")}
          className={cn(
            "block h-[min(348px,36dvh)] w-auto max-w-full rounded-[14px] bg-night-deep shadow-[0_18px_40px_rgba(0,0,0,0.6)] motion-safe:transition-opacity",
            !fits && "opacity-25",
          )}
        />
        {!fits ? (
          <p role="status" className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center font-sans text-detail font-semibold text-paper">
            {t("picture.tooLong")}
          </p>
        ) : null}
      </div>

      <div role="tablist" aria-label={title} className="mt-3 flex gap-1 rounded-pill bg-paper/[0.06] p-1">
        {TABS.map((item, at) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[at] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${id}-panel`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(e) => onTabKey(e, at)}
            className={cn("tap-press hit-44 h-9 flex-1 rounded-pill font-sans text-detail", tab === item.id ? ON : "text-paper/60")}
          >
            {t(item.key)}
          </button>
        ))}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="mt-3.5 min-h-[136px]">
        {tab === "look" ? (
          <>
            <div role="group" aria-label={t("picture.tab.look")} className="no-scrollbar -mx-1 flex justify-between gap-1 overflow-x-auto px-1">
              {LOOKS.map((look) => (
                <LookTile
                  key={look.id}
                  look={look}
                  image={null}
                  on={style.look === look.id}
                  label={look.nameKey ? t(look.nameKey) : ""}
                  onClick={() => change({ look: look.id })}
                />
              ))}
              <LookTile
                look={YOURS}
                image={photo}
                on={style.look === YOURS.id}
                label={t("picture.look.yours")}
                onClick={chooseYours}
              >
                {photo ? null : <Plus size={20} />}
              </LookTile>
            </div>
            {style.look === YOURS.id ? <p className="mt-3 text-center font-sans text-caption text-paper/55">{t("picture.photoNote")}</p> : null}
          </>
        ) : tab === "words" ? (
          <>
            <div role="group" aria-label={t("bible.typeface")} className="flex gap-2.5">
              {FONT_ORDER.map((font) => (
                <button
                  key={font}
                  type="button"
                  aria-pressed={style.font === font}
                  aria-label={t(FONT_KEYS[font])}
                  onClick={() => change({ font })}
                  style={{ fontFamily: font === "serif" ? "var(--font-serif)" : "var(--font-sans)", fontWeight: font === "caps" ? 800 : 500 }}
                  className={cn(
                    "tap-press h-12 flex-1 rounded-[14px] border text-[22px] text-paper",
                    style.font === font ? "reader-lit border-2 border-paper" : "border-paper/15",
                  )}
                >
                  {font === "caps" ? "AA" : "Aa"}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span aria-hidden className="font-sans text-caption text-paper/55">
                A
              </span>
              <input
                type="range"
                min={0}
                max={TEXT_SCALES.length - 1}
                step={1}
                value={style.size}
                aria-label={t("bible.textSize")}
                onChange={(e) => change({ size: Number(e.target.value) })}
                className="picture-range flex-1"
                style={{ "--fill": `${(style.size / (TEXT_SCALES.length - 1)) * 100}%` } as CSSProperties}
              />
              <span aria-hidden className="font-sans text-base text-paper/55">
                A
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Choice on={style.reference} onClick={() => change({ reference: !style.reference })}>
                {referenceLabel ?? t("picture.reference")}
              </Choice>
              {/* Never over an icon: with Christ or the Trinity the cross is off and cannot be put on. */}
              <Choice on={style.cross && !icon} disabled={icon} onClick={() => change({ cross: !style.cross })}>
                {t("picture.cross")}
              </Choice>
              <span role="group" aria-label={t("picture.align")} className="flex gap-2">
                <Choice on={style.align === "left"} onClick={() => change({ align: "left" })}>
                  {t("picture.left")}
                </Choice>
                <Choice on={style.align === "center"} onClick={() => change({ align: "center" })}>
                  {t("picture.centre")}
                </Choice>
              </span>
            </div>
          </>
        ) : (
          <div role="group" aria-label={t("ui.size")} className="flex flex-wrap justify-center gap-2 pt-2">
            {SHAPE_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={style.shape === s}
                onClick={() => change({ shape: s })}
                className={cn(
                  "tap-press hit-44 h-10 rounded-pill px-4 font-sans text-detail",
                  style.shape === s ? ON : "border border-paper/20 text-paper/80",
                )}
              >
                {t(SHAPE_KEYS[s])}
                <span className={cn("ms-1.5 font-normal tabular-nums", style.shape === s ? "text-night/55" : "text-paper/45")}>{SHAPE_RATIOS[s]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3.5 grid grid-cols-[1fr_1.6fr] gap-2.5">
        <button
          type="button"
          disabled={!fits || busy}
          onClick={() => void send("save")}
          className="tap-press h-[50px] rounded-pill border border-paper/20 font-sans text-[15px] font-semibold text-paper disabled:opacity-40"
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          disabled={!fits || busy}
          onClick={() => void send("share")}
          className={cn("tap-press h-[50px] rounded-pill font-sans text-[15px] disabled:opacity-40", ON)}
        >
          {t("common.share")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-[18px] text-center font-sans text-caption text-paper/70">
        {status}
      </p>

      {/* The reader's own photo: read here, drawn here, never sent. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void pickPhoto(file);
        }}
      />
    </Sheet>
  );
}

/** A look's tile with its name under it: the look itself, drawn small. */
function LookTile({
  look,
  image,
  on,
  label,
  onClick,
  children,
}: {
  look: Look;
  /** The reader's photo, for their own look. */
  image: LoadedImage | null;
  on: boolean;
  label: string;
  onClick: () => void;
  /** Drawn in place of the tile: the plus before a photo is chosen. */
  children?: ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawn = !children;
  useEffect(() => {
    const canvas = ref.current;
    if (!drawn || !canvas) return;
    let live = true;
    const src = look.id === YOURS.id ? null : lookSrc(look);
    void (src ? loadPicture(src) : Promise.resolve(image)).then((picture) => {
      const ctx = canvas.getContext("2d");
      if (live && ctx) paintTile(ctx, look, TILE, picture, TILE_SCALE);
    });
    return () => {
      live = false;
    };
  }, [look, image, drawn]);

  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="tap-press flex w-[56px] shrink-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "relative grid size-[50px] place-items-center overflow-hidden rounded-[14px] border text-paper/80",
          on ? "reader-lit border-2 border-paper" : "border-paper/15",
        )}
      >
        {drawn ? <canvas ref={ref} width={TILE * TILE_SCALE} height={TILE * TILE_SCALE} aria-hidden className="block size-full" /> : children}
      </span>
      <span className={cn("line-clamp-2 max-w-full break-words text-center font-sans text-[10.5px] leading-tight hyphens-auto", on ? "font-semibold text-paper" : "text-paper/60")}>{label}</span>
    </button>
  );
}

/** A switch in the Words tab: a quiet pill, lit when it is on. */
function Choice({ on, disabled = false, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "tap-press hit-44 h-9 rounded-pill border px-3 font-sans text-[12.5px] disabled:opacity-40",
        on ? "border-paper/60 bg-paper/10 text-paper" : "border-paper/20 text-paper/80",
      )}
    >
      {children}
    </button>
  );
}
