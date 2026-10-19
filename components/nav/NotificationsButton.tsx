"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { NotificationsSheet } from "@/components/nav/NotificationsSheet";
import { Bell } from "@/components/ui/icons/Bell";
import { getInbox, markInboxRead, refreshInbox, useInbox } from "@/lib/community/inbox";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { haptic } from "@/lib/ui/motion";
import { getSeenSnapshot, markWhatsNewSeen, subscribeSeen } from "@/lib/whatsNew/seenStore";
import { CURRENT_VERSION, whatsNewUnseen } from "@/lib/whatsNew/version";

/** Before the page is live this build's own version stands in, so the bell
 *  is never drawn lit and then put out by the first frame on the device. */
const seenOnServer = () => CURRENT_VERSION;

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

  useEffect(() => {
    if (!getInbox().loaded && readLocalSessionUser()) void refreshInbox();
  }, []);

  const lit = inbox.unread > 0 || whatsNewUnseen(seen);

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
    setOpen(true);
    if (!account) return;
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
        <Bell size={22} filled={lit} />
      </button>
      <NotificationsSheet
        open={open}
        onClose={() => setOpen(false)}
        signedIn={signedIn}
        fresh={fresh}
        whatsNewFresh={whatsNewFresh}
      />
    </>
  );
}
