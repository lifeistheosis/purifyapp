"use client";

import { useEffect, useState } from "react";

import { NotificationsInbox, type CommunityNotification } from "@/components/community/NotificationsInbox";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Bell } from "@/components/ui/icons/Bell";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { getInbox, refreshInbox, useInbox } from "@/lib/community/inbox";
import { haptic } from "@/lib/ui/motion";

/**
 * Community's bell (1.8, the owner's pick of r3-02, B): what other readers
 * sent, behind a bell in the head, where the page used to open on the list
 * itself above the composer.
 *
 * Drawn as the tab bar's bell is (components/nav/NotificationsButton): filled
 * when something is new, and no dot and no count (CONTRIBUTING's bar on
 * reminders: nothing is drawn to make a reader look). The sheet holds the
 * whole inbox (NotificationsInbox), and opening it is reading it. A row opens
 * what it is about on this page, as the list always did: the post with its
 * thread open and the reply lit, or the person's profile.
 *
 * On a phone's browser no tab bar keeps the inbox fresh, so the bell asks
 * once when the page opens, where the store has never been filled.
 */
export function CommunityBell({
  onOpen,
  onPicture,
}: {
  onOpen: (n: CommunityNotification) => void;
  /** Over Pray together's picture: the bell stands on a round plate. */
  onPicture: boolean;
}) {
  const { t } = useTranslate();
  const inbox = useInbox();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getInbox().loaded) void refreshInbox();
  }, []);

  const lit = inbox.unread > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic("light");
          setOpen(true);
        }}
        aria-label={lit ? t("nav.notificationsNew") : t("settings.notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-community-bell=""
        className={cn(
          "tap-press -me-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-pill transition-colors hover:text-paper",
          lit ? "text-paper" : "text-paper/80",
          onPicture && "border border-paper/[0.13] bg-night/45 backdrop-blur-md",
        )}
      >
        <Bell size={22} filled={lit} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("community.notifications")} desktop bodyClassName="pt-1 pb-2">
        <NotificationsInbox
          whole
          onOpen={(n) => {
            setOpen(false);
            onOpen(n);
          }}
        />
      </Sheet>
    </>
  );
}
