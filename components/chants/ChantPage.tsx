"use client";

import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ShareButton } from "@/components/ui/ShareButton";
import { cn } from "@/lib/cn";
import { withCleared } from "@/lib/chants/cleared";
import { useClearedWords } from "@/lib/chants/clearedClient";
import type { ChantDoor } from "@/lib/chants/doors";
import { useChantAvailability } from "@/lib/chants/live";
import { recordingTail, sameRecording } from "@/lib/chants/media";
import { chantLineKey, chantTitleKey, kindKey } from "@/lib/chants/names";
import { playChant, warmTiming } from "@/lib/chants/play";
import type { Chant, ChantIndexRow } from "@/lib/chants/types";
import { useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { useOwnPlayer } from "@/lib/player/pagePlayer";
import { usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

import { ChantAbout } from "./ChantAbout";
import { ChantCover } from "./ChantCover";
import { ChantDoors, openChantDoor, useChantDoor } from "./ChantDoors";
import { ChantDock, useChantPlay } from "./ChantPlay";
import { ChantRow } from "./ChantRow";
import { ChantVersions } from "./ChantVersions";
import { ChantWords, ChantWordsSource } from "./ChantWords";
import { firstVersion } from "./ChantsHome";
import { textDir } from "@/lib/i18n/textDir";

/**
 * One chant's page (1.7): the same page for every chant, the owner's note 15
 * of 2026-10-16 ("every chant gets its own page in one format: what it is,
 * where it comes from, its variants").
 *
 * 1.8, sheet r3-18 (Homebase/boards/purify-master/variants/r3-18-chant-page),
 * the owner's pick of 2026-10-31: "a mix of A and B. I want the player to be
 * at the bottom, like how A has it. But I want the options. Actually, how B
 * has it." So B's page, a saint's page for a chant (his 3b D): the icon across
 * the top of the screen under the clear bar (MobileTopBar, from the route),
 * the chant's name and who sings it standing on its foot, then three doors,
 * Words, About and Versions, switching what is below them in place
 * (ChantDoors, the open one kept in the address so Back finds it). Words
 * opens first: the switch on the words as an underlined strip, the words as
 * sung, large and lit, and the English under the line being sung only
 * (ChantWords). About is the chant's own about and its sources, then the
 * chants related to it; Versions, each recording with its singer by name,
 * and Play. In place of B's Play row, A's player, docked at the foot over the
 * tab bar (ChantDock): where it is, back 15, Play and forward 15.
 *
 * The page is the screen (app/globals.css, .chant-screen): with Words open
 * nothing scrolls but the words in their own box, between the doors and the
 * dock. Every control is drawn at its full size in the first frame and keeps
 * its place when an answer arrives or another version is chosen (the owner's
 * note 61): the switch is drawn for every version of a chant that has one,
 * greyed where a version has nothing to switch; Play waits dim in the dock;
 * the name block grows up into the icon, never down onto the doors.
 *
 * Play stays on the page and sings along here; it does not open Now Playing
 * over it, and while one of this chant's versions plays the mini player
 * steps aside for the dock (lib/player/pagePlayer.ts). No counter of any
 * kind (the ban on a digital prayer rope stands; the Anthem is a hymn), and
 * the page carries only this chant. One tree for every width: on a tablet and
 * a computer the icon is a rounded square beside the name.
 */
export function ChantPage({ chant, row, related }: { chant: Chant; row: ChantIndexRow; related: ChantIndexRow[] }) {
  const { t, locale } = useTranslate();
  const title = t(chantTitleKey(chant.key));
  const [chosen, setChosen] = useState<string | null>(null);
  // Each version as it is shown: with its words as sung where their
  // clearance is switched on in the admin (build 86 note 78), read at run
  // time; otherwise, and with no signal, the words the app carries.
  const cleared = useClearedWords();
  const variants = useMemo(() => withCleared(chant, cleared).variants, [chant, cleared]);
  // Until the reader chooses, the page shows the version playing, if one of
  // this chant's is: the player's Read opens this page to its words, lit
  // where the singing has got to (1.8, components/player/NowPlayingSheet.tsx).
  const { src: playingSrc } = usePersistentAudio();
  const playingHere = playingSrc ? variants.find((v) => sameRecording(playingSrc, v.audio.src)) : undefined;
  const variant = variants.find((v) => v.id === chosen) ?? playingHere ?? firstVersion(variants, locale);
  const indexVariant = row.variants.find((v) => v.id === variant.id) ?? row.variants[0];
  const play = useChantPlay({
    slug: chant.slug,
    title,
    variant: indexVariant,
    lines: variant.lines,
    timing: variant.clearedTiming,
    coverSrc: chant.cover?.src,
    open: false,
  });
  const availabilityFor = useChantAvailability();
  const prefs = useWordsPrefs();
  const door = useChantDoor();
  // A door the reader opened fades in where it stands; the page's first door does not.
  const [opened, setOpened] = useState(false);

  // The timed words, asked for as the page opens, so they light at once.
  useEffect(() => warmTiming(indexVariant), [indexVariant]);

  // The dock is this chant's player here: while what the mini player would
  // show is one of these recordings, it steps aside; streamed, or from its
  // copy on the phone (1.9), whose address ends as the recording's own does.
  useOwnPlayer(row.variants.flatMap((v) => [v.audio.src, recordingTail(v.audio.src) ?? ""]));

  // The switch on the words, for every version of a chant that has a version
  // with its sound written out, so choosing another never takes it away.
  const switchable = variants.some((v) => v.lines.some((l) => l.translit));
  const sings = variant.performer ? t("chants.sungBy", { name: variant.performer }) : t("chants.performerUnknown");
  // What it is, after the version's own name: B's Play row's line.
  const what = [t(kindKey(chant.kind)), chant.tone ? t("chants.tone", { n: chant.tone }) : null, variant.setting ?? null].filter(
    (x): x is string => Boolean(x),
  );

  /**
   * Choose a version: its words on the page. While the version shown is
   * playing, the recording switches with it (round 9 A: "switch the language
   * of the recording below"), from its start.
   */
  const choose = (id: string) => {
    if (id === variant.id) return;
    const wasPlaying = play.playing;
    setChosen(id);
    if (!wasPlaying) return;
    const next = variants.find((v) => v.id === id);
    const nextIndex = row.variants.find((v) => v.id === id);
    if (!next || !nextIndex || availabilityFor(chant.slug, nextIndex) !== "playable") return;
    playChant({ slug: chant.slug, title, variant: nextIndex, lines: next.lines, timing: next.clearedTiming, coverSrc: chant.cover?.src, prefs, open: false });
  };

  const openDoor = (next: ChantDoor) => {
    if (next === door) return;
    setOpened(true);
    openChantDoor(next);
  };

  /** A version chosen in Versions, or started there: its words, behind Words. */
  const chooseFromList = (id: string) => {
    choose(id);
    openDoor("words");
  };
  const playFromList = (id: string) => {
    setChosen(id);
    openDoor("words");
  };

  const panel = (id: ChantDoor) => ({
    id: `chant-panel-${id}`,
    role: "tabpanel" as const,
    "aria-labelledby": `chant-tab-${id}`,
    hidden: door !== id,
  });

  return (
    <section className="relative bg-night px-5 md:px-8">
      <div className="chant-screen mx-auto w-full max-w-[720px]">
        {/* The icon, and on its foot the name and who sings it. On a phone
            the icon starts at the top of the screen under the clear bar
            (.under-topbar) and melts into the page (.picture-melt); the name
            block is held at its foot, so a credit on two lines grows up into
            the picture and nothing under it moves. With B's Play row gone to
            the dock, the doors take its place, over the icon's melted foot
            (-mb-10), as the sheet stands them under the name: the words keep
            that room. */}
        <header className="under-topbar relative -mb-10 md:mb-0 md:mt-10 md:flex md:items-end md:gap-7">
          <div className="relative -mx-5 md:mx-0 md:shrink-0">
            <ChantCover
              cover={chant.cover}
              size="hero"
              picture="object-top"
              className="chant-hero picture-melt w-full rounded-none bg-night ring-0 md:w-[200px] md:rounded-[14px] md:bg-night-soft md:ring-1"
            />
            {/* The clock and the bar's plates stay readable over the icon. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-night/80 to-transparent md:hidden" />
          </div>
          <div data-chant-control="name" className="absolute inset-x-0 bottom-[46px] md:static md:min-w-0 md:flex-1 md:pb-1">
            <h1
              id="chant-name"
              className="doctrine-shadow font-serif text-[30px] font-bold leading-[1.12] tracking-[-0.01em] text-balance text-paper"
            >
              {title}
            </h1>
            {chant.originalTitle ? (
              <p dir="auto" className="doctrine-shadow mt-1 font-serif text-ui text-paper/70">
                {chant.originalTitle}
              </p>
            ) : null}
            <p className="doctrine-shadow mt-[7px] line-clamp-2 font-sans text-[14px] font-semibold leading-[19px] text-paper/90">{sings}</p>
            <p className="doctrine-shadow mt-1 truncate font-sans text-[13px] leading-[18px] text-paper/60 [html[data-reading-mode=parchment]_&]:text-paper/80">
              <bdi lang={variant.language} dir={textDir(variant.language)}>{variant.label}</bdi>
              {what.map((w) => (
                <span key={w}> · {w}</span>
              ))}
            </p>
            {/* Share on a computer, which has no bar; the phone's is in the bar. */}
            <ShareButton titleKey={chantTitleKey(chant.key)} round className="mt-4 hidden md:inline-flex native-md-hidden" />
          </div>
        </header>

        {/* Over the icon's foot, so drawn over it and answering every tap. */}
        <ChantDoors open={door} onOpen={openDoor} label={title} className="relative z-[1] mt-3.5 md:mt-6" />

        <div {...panel("words")} className={cn("flex min-h-[180px] flex-1 flex-col pt-2", opened && "chant-door-in")}>
          <ChantWords
            variant={variant}
            indexVariant={indexVariant}
            switchable={switchable}
            active={door === "words"}
            className="min-h-0 flex-1"
          />
        </div>

        <div {...panel("about")} className={cn("pb-10 pt-6", opened && "chant-door-in")}>
          <p className="mb-8 max-w-[52ch] font-sans text-detail leading-[1.55] text-paper/65">{t(chantLineKey(chant.key))}</p>
          <ChantAbout chant={chant} />
          <ChantWordsSource variant={variant} className="mt-8 border-t border-paper/[0.08] pt-5" />
          <ChantRow id="related" heading={t("chants.related")} rows={related} />
        </div>

        <div {...panel("versions")} className={cn("pb-10 pt-5", opened && "chant-door-in")}>
          <ChantVersions
            slug={chant.slug}
            title={title}
            variants={row.variants}
            linesOf={(id) => variants.find((v) => v.id === id)?.lines}
            coverSrc={chant.cover?.src}
            selected={variant.id}
            onSelect={chooseFromList}
            onPlay={playFromList}
            open={false}
            preview={false}
            className="chant-versions divide-y-0"
          />
          <ChantWordsSource variant={variant} className="mt-5 px-0.5" />
        </div>

        <ChantDock
          variant={indexVariant}
          play={play}
          label={`${title} (${variant.label})`}
          className="-mx-2 md:mx-auto md:w-full md:max-w-md"
        />
      </div>
    </section>
  );
}
