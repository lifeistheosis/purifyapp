"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { NotificationsSheet } from "@/components/nav/NotificationsSheet";
import { Bell } from "@/components/ui/icons/Bell";
import { getInbox, markInboxRead, refreshInbox, useInbox } from "@/lib/community/inbox";
import { hasUnseenEnd, isEnded, markDownloadsSeen, readDownloads, useDownloads } from "@/lib/downloads/log";
import { boardFresh, markBoardSeen, readBoardSeen, seedBoardSeen } from "@/lib/notifications/board";
import { freshOrders, getOrdersBell, markOrdersSeen, readOrderNoticeRows, readOrdersSeen, refreshOrdersBell, useOrdersBell } from "@/lib/notifications/orders";
import { useBoardMessage } from "@/lib/packs/usePacks";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { haptic } from "@/lib/ui/motion";
import { useMounted } from "@/lib/useMounted";
import { currentBoardMessage } from "@/lib/whatsNew/board";
import { getSeenSnapshot, markWhatsNewSeen, subscribeSeen } from "@/lib/whatsNew/seenStore";
import { CURRENT_VERSION, whatsNewUnseen } from "@/lib/whatsNew/version";

/** Before the page is live this build's own version stands in, so the bell
 *  is never drawn lit and then put out by the first frame on the device. */
const seenOnServer = () => CURRENT_VERSION;
const NONE: ReadonlySet<string> = new Set();

/**
 * The bell in the phone tab bar (MobileHeader), on all five tabs. It opens
 * one sheet for what other readers sent and what Purify sent (NotificationsSheet).
 *
 * Until 1.7 the bell was on Today alone and was a link to the patch notes,
 * and a reply from another reader reached nobody outside Chat but as a dot on
 * the Discover tab. Now "something new" is either: an unread row in the
 * community inbox, or a release this device has not seen the notes of. It is
 * shown one way only, the bell drawn filled. No dot and no count on the bar
 * (CONTRIBUTING's bar on reminders: nothing here is drawn to make a reader
 * look).
 *
 * It asks the server nothing on a schedule. The tab bar's badge already keeps
 * the one inbox store fresh in the apps; this asks once, and only where that
 * store has never been filled (a phone's browser, which has no tab bar), and
 * only for a reader with an account, since there is no inbox without one.
 */
export function NotificationsButton() {
  const { t } = useTranslate();
  const inbox = useInbox();
  const seen = useSyncExternalStore(subscribeSeen, getSeenSnapshot, seenOnServer);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [whatsNewFresh, setWhatsNewFresh] = useState(false);
  const [freshDownloads, setFreshDownloads] = useState<ReadonlySet<string>>(() => new Set());
  const downloads = useDownloads();
  // The rest of the universal bell (2.0, his word 2026-11-28): Purify's
  // announcement and the reader's orders, each lighting it once when new
  // (lib/notifications/board.ts, lib/notifications/orders.ts).
  const board = useBoardMessage(currentBoardMessage() ?? null);
  const orders = useOrdersBell();
  const mounted = useMounted();
  const [boardWasNew, setBoardWasNew] = useState(false);
  const [freshOrderIds, setFreshOrderIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => seedBoardSeen(board), [board]);
  useEffect(() => {
    const user = readLocalSessionUser();
    if (user) void refreshOrdersBell(user.id, () => readOrderNoticeRows(createClient()));
  }, []);
  // Read from the device, after the first frame (the server knows neither).
  const boardNew = mounted && boardFresh(board, readBoardSeen());
  // Only the signed-in reader's own: an account signed out on this device lights nothing.
  const ordersNew = mounted && orders.userId && readLocalSessionUser()?.id === orders.userId ? freshOrders(orders.notices, readOrdersSeen(orders.userId)) : NONE;

  useEffect(() => {
    if (!getInbox().loaded && readLocalSessionUser()) void refreshInbox();
  }, []);

  // A download's end the reader has not seen lights it too (1.9, build 95 note 23).
  const lit = inbox.unread > 0 || whatsNewUnseen(seen) || hasUnseenEnd(downloads) || boardNew || ordersNew.size > 0;

  function openSheet() {
    haptic("light");
    const account = Boolean(readLocalSessionUser());
    setSignedIn(account);
    // What was new is decided as the sheet opens, and opening it is reading
    // it: the inbox is marked read and this release's notes as seen, so the
    // bell goes out. The rows keep their brighter words while the sheet is up.
    setWhatsNewFresh(whatsNewUnseen(getSeenSnapshot()));
    markWhatsNewSeen(CURRENT_VERSION);
    setFresh(new Set(getInbox().notifications.filter((n) => !n.read_at).map((n) => n.id)));
    setFreshDownloads(new Set(readDownloads().filter((d) => isEnded(d) && !d.seen).map((d) => d.key)));
    markDownloadsSeen();
    // The announcement and the orders: new as the sheet opens, then seen.
    setBoardWasNew(boardNew);
    if (board) markBoardSeen(board.date);
    const bell = getOrdersBell();
    setFreshOrderIds(ordersNew);
    if (bell.userId) markOrdersSeen(bell.userId, bell.notices);
    setOpen(true);
    if (!account) return;
    const user = readLocalSessionUser();
    if (user) {
      void refreshOrdersBell(user.id, () => readOrderNoticeRows(createClient()), { force: true }).then(() => {
        const now = getOrdersBell();
        const changed = freshOrders(now.notices, readOrdersSeen(user.id));
        if (changed.size > 0) setFreshOrderIds((before) => new Set([...before, ...changed]));
        markOrdersSeen(user.id, now.notices);
      });
    }
    void refreshInbox().then(() => {
      const unread = getInbox().notifications.filter((n) => !n.read_at).map((n) => n.id);
      if (unread.length > 0) setFresh((before) => new Set([...before, ...unread]));
      void markInboxRead();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={lit ? t("nav.notificationsNew") : t("settings.notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2 " +
          (lit ? "text-paper" : "text-paper/80")
        }
      >
        <Bell size={24} filled={lit} />
      </button>
      <NotificationsSheet
        open={open}
        onClose={() => {
          // An end that came while the sheet was up was seen there.
          markDownloadsSeen();
          setOpen(false);
        }}
        signedIn={signedIn}
        fresh={fresh}
        whatsNewFresh={whatsNewFresh}
        freshDownloads={freshDownloads}
        orders={orders.notices}
        freshOrders={freshOrderIds}
        board={board}
        boardFresh={boardWasNew}
      />
    </>
  );
}
