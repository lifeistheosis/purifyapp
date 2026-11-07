"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { ClergySeal } from "@/components/community/ClergySeal";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { MentionField } from "@/components/community/MentionField";
import { SupporterMark } from "@/components/community/SupporterMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DOOR, DOOR_COLS, DOOR_OFF, DOOR_ON, SLIM, SLIM_OFF, SLIM_ON, SLIM_TRACK } from "@/components/ui/doors";
import { Book } from "@/components/ui/icons/Book";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Check } from "@/components/ui/icons/Check";
import { Church } from "@/components/ui/icons/Church";
import { Close } from "@/components/ui/icons/Close";
import { Quill } from "@/components/ui/icons/Quill";
import { Share } from "@/components/ui/icons/Share";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { cn } from "@/lib/cn";
import type { AuthorMark } from "@/lib/community/authorMark";
import { createCommunityPost, type CommunityResult } from "@/lib/community/client";
import {
  COMPOSE_KIND_KEYS,
  composeAbout,
  composeAudience,
  composeCover,
  composeHead,
  composeKindIn,
  composeKinds,
  composeSendKey,
  lineToShare,
  shareLocator,
  shareSource,
  type ComposeKind,
} from "@/lib/community/compose";
import { useFlorilegia, type FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { glideScroll } from "@/lib/ui/glideScroll";
import { prefersReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useKeyboardUp, useVisibleFrame } from "@/lib/ui/viewport";

/**
 * Making a post in Community, a page of its own (1.8): the owner's pick of
 * r3-24, B, "a page of its own" (his note 69 of build 86, "So I want this
 * create a post screen revamped"; Homebase/boards/purify-master/variants/
 * r3-24-compose.html).
 *
 * Built like the saint's page he locked ("A, fade and doors"): the kind's
 * picture fades in at the head, in Community's own head shade (Pentecost for
 * a discussion, the Three Hierarchs for a question, St Prochorus writing for
 * a shared line, a chapter's own cover for a discussion about it), with the
 * title and the reader and their frame over it, and under it the kinds as
 * doors, a saint's page's doors (components/ui/doors.ts), never pills. No
 * boxes below: the title is set as a post's title on a hairline and the
 * words have the screen. A shared line stands as the card it becomes in the
 * feed, with the reader's Florilegium under it to change it. Who will read it
 * and Post stand together at the thumb.
 *
 * Over the feed the way a profile is: a layer over everything at the page's
 * root, the page behind it held still and the tab bar stepped aside
 * (lib/ui/overlay.ts), closed by its own button, Escape, or Android's back,
 * and closing keeps the draft. It is as tall as what the keyboard leaves
 * (lib/ui/viewport.ts, useVisibleFrame), so as the keyboard comes nothing on
 * the page moves: only the foot, who reads it and Post, rides up on it.
 *
 * Once the doors have gone up under the bar, the head folds as a saint's
 * page does: the title comes into the bar, a chapter's cover stands under it
 * as a band, and the doors pin as one slim row (a copy for the eye and the
 * finger; the doors in the page stay the ones a keyboard and a screen reader
 * use). The first words written fold it, so the words have the room over the
 * keyboard the sheet draws.
 *
 * Black, white and grey, every light the page's own ink with a white glow
 * (app/globals.css, "Making a post"), which on Parchment is the ink alone.
 * The reader's Plus frame keeps its own colours, gold included: a Plus
 * cosmetic, his word of 2026-10-31.
 *
 * Everything the server did, it still does: a shared line is a locator the
 * server rebuilds from Purify's own library, the word filter asks first, a
 * held post says so, @names still work.
 */

/** How the page was last asked to open: a new `seq` is a new opening (lib/community/compose.ts). */
export type ComposeRequest = { kind: ComposeKind; chapter: string | null; seq: number };

type Writer = { name: string; avatar: string | null };

/** The status bar or the notch, which the page runs under. */
const INSET_TOP = "var(--inset-top, env(safe-area-inset-top, 0px))";

/** The lines of a Florilegium drawn at once; the rest are counted. */
const GATHERED_SHOWN = 40;

export function ComposePage({
  open,
  request,
  me,
  groupId,
  decoration,
  tier,
  onClose,
  onPosted,
}: {
  open: boolean;
  request: ComposeRequest;
  me: Writer;
  /** When set, the post goes to this parish group rather than the public
   *  feed. The route re-checks membership; this only shapes the request. */
  groupId: string | null;
  /** The reader's Plus frame, so their own picture wears it here too. */
  decoration: string | null;
  /** The Plus or Pro mark the reader shows beside their name. */
  tier: AuthorMark;
  /** Closed by the reader: the draft stays for the next opening. */
  onClose: () => void;
  /** Posted; `held` when it waits for a moderator. */
  onPosted: (held: boolean) => void;
}) {
  const { t } = useTranslate();
  const inGroup = groupId !== null;

  // Each opening sets the kind it was asked for, and the chapter when it came
  // from one. Adjusted while rendering, so the first frame is already right.
  const [asked, setAsked] = useState(request.seq);
  const [chosen, setChosen] = useState<ComposeKind>(request.kind);
  const [chapter, setChapter] = useState<string | null>(request.chapter);
  if (request.seq !== asked) {
    setAsked(request.seq);
    setChosen(request.kind);
    if (request.chapter) setChapter(request.chapter);
  }

  const kinds = composeKinds(inGroup);
  const kind = composeKindIn(chosen, inGroup);
  const head = composeHead(kind, { inGroup, chapter });
  const about = composeAbout(kind, chapter);
  const cover = about ? composeCover(about) : null;
  const audience = composeAudience(inGroup);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The word filter's question, after a post it would mask.
  const [askFiltered, setAskFiltered] = useState(false);
  // The doors have gone up under the bar. Each opening starts at the head.
  const [folded, setFolded] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFolded(false);
  }
  const { florilegia } = useFlorilegia();
  const gathered = florilegia.flatMap((f) => f.items);
  const line = kind === "share" ? lineToShare(gathered, pickedId) : null;

  // What the keyboard leaves of the screen, and whether it is up.
  const frame = useVisibleFrame();
  const keyboard = useKeyboardUp();

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const doorsRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wordsRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // The page holds the screen: the feed behind holds still, and the tab bar
  // and the floating pills step aside.
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [open]);

  // Opening is asking to write, so the cursor goes where the words do, and
  // before the first paint: inside the tap that opened it (the folded row
  // opens it in a flushSync), where a phone raises its keyboard for it.
  // Share a line asks for a pick first, so nothing is typed into yet. Run
  // as it opens, not as the doors are walked: the kind is the opening's.
  useLayoutEffect(() => {
    if (!open) return;
    if (kind !== "share") wordsRef.current?.focus({ preventScroll: true });
    else closeRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes; Tab goes round the page and never out to the feed behind.
  // A list of @names open in a field answers Escape itself, and the word
  // filter's question answers its own keys.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (askFiltered || e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !rootRef.current) return;
      const stops = focusablesIn(rootRef.current);
      if (!stops.length) return;
      e.preventDefault();
      stops[nextIndex(stops.length, stops.indexOf(document.activeElement as HTMLElement), e.shiftKey)]?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, askFiltered, onClose]);

  useAndroidBack(open && !askFiltered, onClose);

  // The head folds once the doors have gone up under the bar and the row
  // pinned under it: one observer on the doors, speaking only as they cross
  // the row's foot, as a saint's page watches its own.
  const banded = cover !== null;
  useEffect(() => {
    const root = scrollRef.current;
    const doors = doorsRef.current;
    const bar = barRef.current;
    const strip = stripRef.current;
    if (!open || !root || !doors || !bar || !strip || typeof IntersectionObserver === "undefined") return;
    const edge = bar.offsetHeight + strip.offsetHeight;
    const io = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? root.getBoundingClientRect().top + edge;
        setFolded(!entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1);
      },
      { root, rootMargin: `-${edge}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(doors);
    return () => io.disconnect();
  }, [open, banded, kinds.length]);

  // The first words fold the head, so they have the room above the keyboard
  // (the sheet's second phone): the page goes up until the doors are under
  // the row, smoothly with Purify's motion on. A frame at a time
  // (lib/ui/glideScroll.ts): a smooth scrollBy was ended by the caret of the
  // very letter typed, and the head never folded.
  const writing = (kind === "share" ? body : title + body).trim().length > 0;
  const wasWriting = useRef(writing);
  const glide = useRef<(() => void) | null>(null);
  useEffect(() => {
    const was = wasWriting.current;
    wasWriting.current = writing;
    const root = scrollRef.current;
    const doors = doorsRef.current;
    const bar = barRef.current;
    const strip = stripRef.current;
    if (!open || !writing || was || folded || !root || !doors || !bar || !strip) return;
    const by = doors.getBoundingClientRect().bottom - (root.getBoundingClientRect().top + bar.offsetHeight + strip.offsetHeight) + 2;
    // Not stopped when the head folds on the way: the fold is the glide arriving.
    if (by > 0) glide.current = glideScroll(root, by, { smooth: !prefersReducedMotion() });
  }, [open, writing, folded]);
  // Closed or gone, the glide stops where it stands.
  useEffect(() => {
    if (open) return;
    glide.current?.();
    glide.current = null;
  }, [open]);
  useEffect(() => () => glide.current?.(), []);

  /** The spam filter's refusals, in the reader's language (lib/community/guard.ts). */
  function refusal(res: CommunityResult): string | null {
    switch (res.code) {
      case "duplicate":
        return t("community.err.duplicate");
      case "too_many_links":
        return t("community.err.tooManyLinks", { count: res.limit ?? 0 });
      case "too_many_mentions":
        return t("community.err.tooManyMentions", { count: res.limit ?? 0 });
      case "slow_down_new":
        return t("community.err.slowDownNew");
      case "slow_down":
        return t("community.err.slowDown");
      default:
        return null;
    }
  }

  async function submit(confirmFiltered = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    let res: CommunityResult;
    if (kind !== "share") {
      res = await createCommunityPost({
        kind: "discussion",
        title: title.trim() || null,
        body: body.trim(),
        groupId,
        confirmFiltered,
        category: kind === "question" ? "question" : null,
        chapterRef: about,
      });
    } else if (!line) {
      res = { ok: false, error: t("community.pickALine") };
    } else {
      // Send WHERE the line came from, never the line itself. The server
      // rebuilds the quotation from our library and refuses anything it
      // cannot find there.
      const loc = shareLocator(line);
      res = loc
        ? await createCommunityPost({ ...loc, body: body.trim() || null, groupId, confirmFiltered })
        : { ok: false, error: t("community.untraceableLine") };
    }
    setBusy(false);
    setAskFiltered(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setPickedId(null);
      setChapter(null);
      // Kept, and shown to nobody until a moderator looks: the feed says so
      // plainly, so the reader does not post it again thinking it was lost.
      onPosted(Boolean(res.held));
    } else if (res.code === "filtered") {
      // The word filter would mask some of it: ask before it goes up.
      setAskFiltered(true);
    } else {
      setError(refusal(res) ?? res.error ?? t("community.postFailed"));
    }
  }

  /** A door chosen. Tapped from a field, the field keeps the keyboard. */
  function choose(next: ComposeKind) {
    setChosen(next);
    setError(null);
  }
  function keepTyping(e: MouseEvent) {
    if (document.activeElement?.matches("input, textarea")) e.preventDefault();
  }

  if (!open || typeof document === "undefined") return null;

  const headTitle = t(head.titleKey);
  const aboutLabel = about ? t("community.aboutChapter", { chapter: chapterName(about, t) }) : null;
  const canPost = !busy && (kind === "share" ? line !== null : body.trim().length >= 2);

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
      data-compose-page=""
      data-compose-kind={kind}
      data-folded={folded ? "" : undefined}
      className="compose-page fixed inset-0 z-[80] bg-night"
    >
      {/* As tall as what the keyboard leaves: the foot stands on it. */}
      <div className="absolute inset-x-0 top-0 flex h-full flex-col" style={frame ? { top: frame.top, height: frame.height } : undefined}>
        {/* The bar: the way out, and the title once the head has folded. */}
        <div ref={barRef} className="absolute inset-x-0 top-0 z-20" style={{ paddingTop: INSET_TOP }}>
          <span aria-hidden className="compose-fold absolute inset-0 bg-night" />
          <div className="relative mx-auto flex h-14 w-full max-w-[640px] items-center px-3">
            <button
              ref={closeRef}
              type="button"
              data-compose-close=""
              onClick={onClose}
              aria-label={t("common.close")}
              className="compose-plate inline-flex size-10 items-center justify-center rounded-full border border-paper/[0.13] text-paper"
            >
              <Close size={18} />
            </button>
            <p aria-hidden className="compose-fold pointer-events-none absolute inset-x-16 truncate text-center font-serif text-[17px] font-semibold text-paper">
              {headTitle}
            </p>
          </div>
        </div>
        {/* Under the bar once the head has folded: a chapter's cover as a
            band, and the doors as one slim row, for the eye and the finger. */}
        <div
          ref={stripRef}
          aria-hidden
          data-compose-strip=""
          className="compose-fold absolute inset-x-0 z-20 border-b border-paper/[0.08] bg-night"
          style={{ top: `calc(${INSET_TOP} + 3.5rem)` }}
        >
          <div className="mx-auto w-full max-w-[640px] px-4 pb-2.5 pt-1">
            {cover && aboutLabel ? (
              <div className="relative mb-2.5 h-16 overflow-hidden rounded-[18px] border border-paper/[0.12]">
                <span className="absolute inset-y-0 end-0 w-[62%]">
                  <Picture src={cover.picture} fallback={cover.fallback} position="50% 22%" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-night from-38% via-night/55 via-54% to-transparent to-78% rtl:bg-gradient-to-l" />
                <span className="absolute inset-y-0 start-4 end-14 flex items-center truncate font-serif text-[18px] font-semibold text-paper">{aboutLabel}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setChapter(null)}
                  className="compose-plate absolute end-3 top-1/2 inline-flex size-[30px] -translate-y-1/2 items-center justify-center rounded-full border border-paper/[0.12] text-paper/85"
                >
                  <Close size={14} />
                </button>
              </div>
            ) : null}
            <div className={SLIM_TRACK}>
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={keepTyping}
                  onClick={() => choose(k)}
                  className={cn(SLIM, k === kind ? cn(SLIM_ON, "compose-lit") : SLIM_OFF)}
                >
                  <KindMark kind={k} size={15} />
                  {t(COMPOSE_KIND_KEYS[k])}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div ref={scrollRef} data-compose-scroll="" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* The head: the kind's picture fading in under Community's own
              shade, the title over its foot, and the reader with their frame. */}
          <div className="community-on-picture relative">
            <div
              aria-hidden
              data-compose-picture=""
              className="community-head-picture pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[760px] overflow-hidden"
              style={{ height: `calc(${INSET_TOP} + 284px)` }}
            >
              <span key={head.picture} className="community-head-img absolute inset-0">
                <Picture src={head.picture} fallback={head.fallback} position={head.position} />
              </span>
              <span className="community-head-shade absolute inset-0" />
            </div>
            <div className="relative mx-auto w-full max-w-[640px] px-5" style={{ paddingTop: `calc(${INSET_TOP} + 4.375rem)` }}>
              <h2 id="compose-title" data-compose-title="" className="community-head-title font-serif text-[30px] font-bold leading-[36px] text-paper">
                {headTitle}
              </h2>
              {aboutLabel ? (
                <p data-compose-about="" className="mt-1.5 flex items-center gap-2 font-sans text-ui text-paper/80">
                  <span className="min-w-0 truncate">{aboutLabel}</span>
                  <button
                    type="button"
                    onClick={() => setChapter(null)}
                    aria-label={t("community.aboutRemove")}
                    className="compose-plate hit-44 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-paper/[0.15] text-paper/85 hover:text-paper"
                  >
                    <Close size={13} />
                  </button>
                </p>
              ) : null}
              <div className="mt-3.5 flex items-center gap-3">
                <CommunityAvatar name={me.name} url={me.avatar} size={38} decoration={decoration} />
                <p className="flex min-w-0 items-center gap-1.5 font-sans text-[15px] font-semibold leading-tight text-paper">
                  <span className="truncate">{me.name}</span>
                  <SupporterMark tier={tier ?? undefined} size={14} />
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[640px] px-5 pb-8">
            {/* What is being written: the doors, as a saint's page has them. */}
            <div
              ref={doorsRef}
              role="group"
              aria-label={t("community.composeKinds")}
              data-compose-doors=""
              className={cn("mt-7 grid gap-[9px]", DOOR_COLS[kinds.length])}
            >
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  data-compose-door={k}
                  aria-pressed={k === kind}
                  onMouseDown={keepTyping}
                  onClick={() => choose(k)}
                  className={cn(DOOR, "compose-door", k === kind ? cn(DOOR_ON, "compose-lit") : DOOR_OFF)}
                >
                  <KindMark kind={k} size={21} />
                  <span className="max-w-full truncate">{t(COMPOSE_KIND_KEYS[k])}</span>
                </button>
              ))}
            </div>

            {kind === "question" ? (
              // The question goes to clergy: said in its own light, under the seal.
              <div data-compose-note="" className="community-clergy-answer mt-6 flex items-start gap-[11px] rounded-2xl border border-paper/20 py-3 pe-[13px] ps-3">
                <span aria-hidden className="mt-px shrink-0">
                  <ClergySeal mark="clergy" size={17} />
                </span>
                <p className="font-sans text-[13px] leading-[1.48] text-paper/82">{t("community.askNote")}</p>
              </div>
            ) : null}

            {kind === "share" ? (
              <div className="mt-6">
                {line ? <SharedLine item={line} /> : null}
                <div data-compose-words="" className={line ? "mt-5" : undefined}>
                  <MentionField
                    as="textarea"
                    fieldRef={wordsRef}
                    value={body}
                    onChange={setBody}
                    rows={1}
                    maxLength={4000}
                    placeholder={t("community.reflectionPlaceholder")}
                    className="block w-full resize-none border-b border-paper/[0.08] bg-transparent pb-3 font-sans text-[15px] leading-[22px] text-paper/90 field-sizing-content placeholder:text-paper/35 focus:border-paper/25 focus:outline-none"
                  />
                </div>
                {gathered.length === 0 ? (
                  <p className="mt-6 rounded-[14px] border border-paper/[0.08] bg-paper/[0.03] p-4 font-sans text-detail text-paper/65">
                    {t("community.emptyFlorilegium")}{" "}
                    <Link href="/florilegium" onClick={onClose} className="font-semibold text-paper hover:underline">
                      {t("community.openFlorilegium")}
                    </Link>
                  </p>
                ) : (
                  <>
                    <p className="mt-7 font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/55">{t("community.yourFlorilegium")}</p>
                    <ul className="mt-2.5 space-y-2">
                      {gathered.slice(0, GATHERED_SHOWN).map((item) => {
                        const on = item.id === line?.id;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              data-compose-line={item.id}
                              aria-pressed={on}
                              onClick={() => setPickedId(item.id)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[14px] border py-2.5 pe-3 ps-3.5 text-start motion-safe:transition-colors",
                                on ? "border-paper/55 bg-paper/[0.07]" : "border-paper/[0.08] bg-paper/[0.03] hover:border-paper/20",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <FoldedLine text={item.text} on={on} />
                                <span className="mt-1 block truncate font-sans text-[11.5px] text-paper/50">{shareSource(item)}</span>
                              </span>
                              <span
                                aria-hidden
                                className={cn(
                                  "grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px]",
                                  on ? "compose-lit border-paper bg-paper text-night" : "border-paper/25",
                                )}
                              >
                                {on ? <Check size={12} strokeWidth={2.6} /> : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {/* The picker used to cut off at 40 with no sign it had:
                        a reader looked for a line that was there and
                        concluded the app had lost it. */}
                    {gathered.length > GATHERED_SHOWN ? (
                      <p className="px-1 pt-2 font-sans text-eyebrow text-paper/40">
                        {t("community.moreInFlorilegium", { count: gathered.length - GATHERED_SHOWN })}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  data-compose-field=""
                  aria-label={kind === "question" ? t("community.questionTitlePlaceholder") : t("community.titlePlaceholder")}
                  placeholder={kind === "question" ? t("community.questionTitlePlaceholder") : t("community.titlePlaceholder")}
                  // Set as a post's title, larger than the 16px a phone holds
                  // every field to (app/globals.css), and the question's
                  // longer prompt a size down so it stays on one line.
                  style={{ fontSize: kind === "question" ? 20 : 22 }}
                  className="block w-full border-b border-paper/10 bg-transparent pb-2.5 font-serif font-semibold leading-[30px] text-paper placeholder:text-paper/35 focus:border-paper/30 focus:outline-none"
                />
                <div data-compose-words="" className="mt-4">
                  <MentionField
                    as="textarea"
                    fieldRef={wordsRef}
                    value={body}
                    onChange={setBody}
                    rows={4}
                    maxLength={4000}
                    placeholder={kind === "question" ? t("community.questionPlaceholder") : t("community.bodyPlaceholder")}
                    className="block min-h-[max(12rem,36svh)] w-full resize-none bg-transparent font-sans text-[16px] leading-[24px] text-paper/90 field-sizing-content placeholder:text-paper/35 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <p className="mt-8 font-sans text-[11.5px] leading-[1.5] text-paper/40">{t("community.houseRules")}</p>
          </div>
        </div>

        {/* Who will read it, and Post, at the thumb: they ride the keyboard. */}
        <div
          data-compose-foot=""
          className={cn("compose-foot relative z-10 shrink-0 border-t border-paper/[0.09] bg-night", !keyboard && "safe-pb-edge pb-[env(safe-area-inset-bottom,0px)]")}
        >
          {error ? (
            <p role="alert" className="mx-auto w-full max-w-[640px] px-5 pt-2.5 font-sans text-detail text-crimson-soft">
              {error}
            </p>
          ) : null}
          <div className="mx-auto flex h-[62px] w-full max-w-[640px] items-center gap-3 pe-3.5 ps-5">
            <p data-compose-audience="" className="flex min-w-0 flex-1 items-center gap-1.5 font-sans text-[12.5px] text-paper/66">
              {audience.mark === "church" ? <Church size={15} className="shrink-0 text-paper/70" /> : <Globe />}
              <span className="truncate">{t(audience.key)}</span>
            </p>
            <button
              type="button"
              data-compose-send=""
              onClick={() => void submit()}
              disabled={!canPost}
              className={cn(
                "hit-44 inline-flex h-9 shrink-0 items-center rounded-pill border px-[18px] font-sans text-[14.5px] font-semibold motion-safe:transition-colors",
                canPost ? "compose-lit border-paper bg-paper text-night" : "border-paper/[0.14] bg-paper/[0.035] text-paper/40",
              )}
            >
              {busy ? t("community.posting") : t(composeSendKey(kind))}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={askFiltered}
        title={t("community.filteredTitle")}
        description={t("community.filteredBody")}
        confirmLabel={t("community.filteredPost")}
        cancelLabel={t("community.filteredEdit")}
        pending={busy}
        onConfirm={() => void submit(true)}
        onCancel={() => setAskFiltered(false)}
      />
    </div>,
    document.body,
  );
}

/** A chapter as the reader's language names it: "John 3". */
function chapterName(ref: string, t: (key: string) => string): string {
  const [book, n] = ref.split("/");
  return `${t(`bible.books.${book}`)} ${n}`;
}

/**
 * A picture at the head or in the band, held unseen until it has arrived
 * (components/ui/ArrivingImage.tsx); a chapter's cover that cannot load (no
 * signal) gives way to the manuscript plate the apps carry.
 */
function Picture({ src, fallback, position }: { src: string; fallback: string | null; position: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const shown = failed === src && fallback ? fallback : src;
  return (
    <ArrivingImage
      src={shown}
      decoding="async"
      onError={() => setFailed(src)}
      onBroken={() => setFailed(src)}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: position }}
    />
  );
}

/** A shared line as the card it becomes in the feed (CommunityClient's post card), Read and Share drawn on it. */
function SharedLine({ item }: { item: FlorilegiumItem }) {
  const mark = "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-paper/10 bg-paper/[0.07] text-paper/85";
  return (
    <figure data-compose-card="" className="community-quote rounded-[18px] border border-paper/[0.11] px-4 pb-3 pt-4 text-center">
      <PurifyMark size={22} className="community-quote-mark mx-auto mb-2.5 block text-paper" />
      <blockquote>
        <p className="whitespace-pre-line font-serif text-[17px] font-medium leading-[1.5] text-paper">{item.text}</p>
      </blockquote>
      <span aria-hidden className="mx-auto mt-3 block h-[1.5px] w-7 rounded-full bg-paper/70" />
      <figcaption className="mt-2.5 flex items-center justify-between gap-2">
        <span aria-hidden className={mark}>
          <Book size={15} />
        </span>
        <span className="min-w-0 font-sans text-[10.5px] font-bold uppercase leading-snug tracking-[0.16em] text-paper/70">{shareSource(item)}</span>
        <span aria-hidden className={mark}>
          <Share size={15} />
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * A gathered line in the list, folded to two lines, the second dissolving
 * where it is cut: no ellipsis in a verbatim quotation. The cut is measured
 * on the line itself, so one that fits is drawn whole.
 */
function FoldedLine({ text, on }: { text: string; on: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => el.toggleAttribute("data-cut", el.scrollHeight > el.clientHeight + 1));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <span ref={ref} className={cn("compose-line block font-serif text-[14.5px] leading-[21px]", on ? "text-paper" : "text-paper/85")}>
      {text}
    </span>
  );
}

/** Each kind's mark: the words of a discussion, the clergy seal, the quill. */
function KindMark({ kind, size }: { kind: ComposeKind; size: number }) {
  if (kind === "discussion") return <ChatBubble size={size} />;
  if (kind === "share") return <Quill size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1.6l2.36 1.64 2.84-.44 1.2 2.62 2.6 1.24-.46 2.84L22.4 12l-1.86 2.46.46 2.84-2.6 1.24-1.2 2.62-2.84-.44L12 22.4l-2.36-1.64-2.84.44-1.2-2.62-2.6-1.24.46-2.84L1.6 12l1.86-2.46-.46-2.84 2.6-1.24 1.2-2.62 2.84.44L12 1.6z" />
      <path d="M12 6.4v11.2M10.2 8.6h3.6M8.7 10.8h6.6M10 14.4l4 1.2" />
    </svg>
  );
}

/** The whole Community, beside Post. */
function Globe() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-paper/70">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.4c2.3 2.4 3.5 5.3 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.3-3.5-8.6s1.2-6.2 3.5-8.6z" />
    </svg>
  );
}
