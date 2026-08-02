"use client";

// Tells a reader on an old build that there is a new one, once per app open.
//
// Mounted in the (app) layout beside the other bridges. It is deliberately
// the quietest thing that can still be called a prompt: one sheet, a plain
// reason, and a Later that costs nothing. Purify cannot force an update and
// should not pretend otherwise, so this is an offer, not a wall. There is no
// version of this that blocks the app.
//
// ONCE PER APP OPEN, not per navigation. `promptedThisSession` is module
// scope, the same guard GiftBridge uses, so moving between tabs does not
// re-ask. A reader who taps Later is left alone until they next cold-start.
//
// Web renders nothing at all: checkForUpdate() returns null off the native
// shell, and the whole point of the website is that it is already current.

import { useEffect, useState } from "react";

import { checkForUpdate, type UpdateStatus } from "@/lib/appUpdate/check";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";

/** One check per app open, not per client-side navigation. */
let promptedThisSession = false;

export function UpdateBridge() {
  const { t } = useTranslate();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (promptedThisSession) return;
    promptedThisSession = true;

    let alive = true;
    checkForUpdate()
      .then((found) => {
        if (!alive || !found) return;
        setStatus(found);
        setOpen(true);
      })
      .catch(() => {
        /* a version check never breaks the app */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!status) return null;

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title={t("update.title")}
      bodyClassName="space-y-5"
    >
      <p className="font-serif text-body leading-[1.7] text-paper/85">
        {t("update.body")}
      </p>

      <p className="font-sans text-caption text-paper/60">
        {t("update.versions", {
          installed: status.installed,
          latest: status.latest.versionName,
        })}
      </p>

      <div className="flex flex-col gap-3 pt-1">
        {/* A plain anchor, not Browser.open(): a Play listing URL is an
            Android app link, so the system hands it to the Play app itself
            rather than opening the store in a web view the reader then has
            to back out of. */}
        <a
          href={status.latest.androidStoreUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpen(false)}
          className="tap-press inline-flex w-full items-center justify-center gap-2 rounded-pill bg-gold px-7 py-3.5 font-sans text-ui font-semibold text-night transition-colors duration-200 hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4"
        >
          {t("update.cta")}
        </a>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="tap-press inline-flex w-full items-center justify-center rounded-pill border border-paper/20 px-7 py-3 font-sans text-ui font-medium text-paper/80 transition-colors duration-200 hover:border-paper/40 hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4"
        >
          {t("update.later")}
        </button>
      </div>
    </Sheet>
  );
}
