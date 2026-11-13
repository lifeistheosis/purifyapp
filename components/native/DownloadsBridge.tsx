"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getBook, localBookNames } from "@/lib/bible/books";
import { downloadableBible } from "@/lib/bible/downloads/catalog";
import { useBibles } from "@/lib/bible/downloads/store";
import { chantTitleKey } from "@/lib/chants/names";
import { savedChants, useChantSaving } from "@/lib/chants/offline";
import type { ChantIndexRow } from "@/lib/chants/types";
import { downloadOf, dropDownload, isEnded, putDownload, readDownloads, type Download } from "@/lib/downloads/log";
import { askOnceToNotify, clearPhone, HEARTBEAT_MS, onAskToNotify, tellPhone } from "@/lib/downloads/notice";
import { endOf, lineOf, liveDownloads, readsTheSame, STOPPED, type Live, type Names } from "@/lib/downloads/watch";
import { isTextShelf, shelfName } from "@/lib/listen/shelf";
import { useIsNative } from "@/lib/platform/native";
import { loadChantIndex } from "@/lib/player/chants";
import { savedChapters } from "@/lib/readAloud/offline";
import { useSaving } from "@/lib/readAloud/saving";

/**
 * A download left running when the app last closed is said to have stopped
 * once this long has passed with nothing taking it up again (a book's saving
 * picks itself up after five seconds, components/native/SavingBridge.tsx).
 */
const STOPPED_AFTER_MS = 12_000;

/**
 * Every download a reader starts, told to the bell's sheet and to the phone
 * (1.9, build 95 note 23; lib/downloads/log.ts). It watches the three stores,
 * a Bible's download, a book's saving to listen offline and a chant's, and
 * writes what each is doing: when it begins, as it goes (a whole percent at a
 * time), when it waits, and how it ends. A download let go by the reader is
 * not kept, and its notice leaves the phone. Does nothing on the website,
 * where nothing is downloaded.
 *
 * What it shows: once, at the first download, Purify's own ask whether it may
 * show downloads in the phone's notifications, before the phone's prompt (his
 * call, 2026-11-13 about 18:53 UTC). The house's question card
 * (components/ui/ConfirmDialog.tsx): Turn on, and the phone asks next; Not
 * now, and the phone is not asked (lib/downloads/notice.ts).
 */
export function DownloadsBridge() {
  const native = useIsNative();
  const bibles = useBibles();
  const saving = useSaving();
  const chants = useChantSaving();
  const { t } = useTranslate();
  const was = useRef<Map<string, Live>>(new Map());
  const [index, setIndex] = useState<ChantIndexRow[] | null>(null);
  // The reader's answer to Purify's own ask, while it is open.
  const [answer, setAnswer] = useState<((yes: boolean) => void) | null>(null);

  useEffect(() => {
    if (!native) return;
    return onAskToNotify(() => new Promise<boolean>((resolve) => setAnswer(() => resolve)));
  }, [native]);

  const answered = (yes: boolean) => {
    answer?.(yes);
    setAnswer(null);
  };

  // A chant is named as the player names it, from the chants' list, read once a chant is saved.
  const chantJob = chants.job?.ref ?? null;
  useEffect(() => {
    if (!native || !chantJob || index) return;
    let alive = true;
    void loadChantIndex().then((rows) => {
      if (alive && rows) setIndex(rows);
    });
    return () => {
      alive = false;
    };
  }, [native, chantJob, index]);

  useEffect(() => {
    if (!native) return;
    const books = localBookNames(t);
    const names: Names = {
      bible: (id) => downloadableBible(id)?.title ?? id,
      book: (slug) => (isTextShelf(slug) ? shelfName(slug) : books[slug] ?? getBook(slug)?.name ?? slug),
      chant: (ref) => {
        const [slug, version] = ref.split("/");
        const row = index?.find((r) => r.slug === slug);
        const variant = row?.variants.find((v) => v.id === version);
        return row && variant ? `${t(chantTitleKey(row.key))} (${variant.label})` : slug.replace(/-/g, " ");
      },
    };
    const say = (d: Download) => {
      const line = lineOf(d);
      return t(line.key, line.vars);
    };
    const stamp = new Date().toISOString();
    const stores = { bibles, saving, chants };
    const now = new Map(liveDownloads(stores, names).map((l) => [l.key, l]));

    for (const live of now.values()) {
      const kept = downloadOf(live.key);
      const began = !was.current.has(live.key);
      if (kept && !isEnded(kept) && readsTheSame(kept, live)) {
        void tellPhone(kept, kept.name, say(kept));
        continue;
      }
      const d: Download = { ...live, at: kept && !isEnded(kept) ? kept.at : stamp };
      putDownload(d);
      if (began) void askOnceToNotify();
      void tellPhone(d, d.name, say(d));
    }

    for (const [key, live] of was.current) {
      if (now.has(key)) continue;
      const end = endOf(live, stores, {
        bookChapters: (book) => Object.keys(savedChapters()).filter((k) => k.startsWith(`${book}/`)).length,
        chant: (ref) => Boolean(savedChants()[ref]),
      });
      if (!end) {
        dropDownload(key);
        void clearPhone(key);
        continue;
      }
      const kept = downloadOf(key);
      const d: Download = {
        ...live,
        at: kept?.at ?? stamp,
        state: end.state,
        share: end.state === "done" ? 1 : live.share,
        ...(end.state === "failed" ? { failure: end.failure } : {}),
        ended: stamp,
        seen: false,
      };
      putDownload(d);
      void tellPhone(d, d.name, say(d));
    }
    was.current = now;
  }, [native, bibles, saving, chants, index, t]);

  // A running notice is told again now and then, so the phone never takes a slow download's for a stale one.
  useEffect(() => {
    if (!native) return;
    const beat = window.setInterval(() => {
      for (const d of readDownloads()) {
        if (d.state !== "running" || !was.current.has(d.key)) continue;
        const line = lineOf(d);
        void tellPhone(d, d.name, t(line.key, line.vars));
      }
    }, HEARTBEAT_MS);
    return () => window.clearInterval(beat);
  }, [native, t]);

  // What was running when the app last closed and was not taken up again: said as it is, stopped.
  useEffect(() => {
    if (!native) return;
    const timer = window.setTimeout(() => {
      const stamp = new Date().toISOString();
      for (const d of readDownloads()) {
        if (isEnded(d) || was.current.has(d.key)) continue;
        putDownload({ ...d, state: "failed", failure: STOPPED, ended: stamp, seen: false });
        void clearPhone(d.key);
      }
    }, STOPPED_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [native]);

  return (
    <ConfirmDialog
      open={answer !== null}
      title={t("downloads.ask.title")}
      description={t("downloads.ask.body")}
      confirmLabel={t("discordAsk.turnOn")}
      cancelLabel={t("onboard.reminders.notNow")}
      onConfirm={() => answered(true)}
      onCancel={() => answered(false)}
    />
  );
}
