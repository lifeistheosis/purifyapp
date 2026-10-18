"use client";

// Who the reader is, at the top of the You tab (1.8): their picture, their
// name and since when, and a tap on it opens their Profile. It was a card
// that said "Welcome back" over "Member since" over the name, and under them
// "Manage your profile, password, and sessions below", where none of the
// three had been since 1.6. Profile is still a row of Settings, with the
// account; the reader's own name is the obvious way to their profile too.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { useMyPicture } from "@/lib/profile/myPicture";

export function YouIdentity({ name, since, className }: { name: string; since: string; className?: string }) {
  const { t } = useTranslate();
  const me = useMyPicture();
  return (
    <Link
      href="/account/profile"
      data-you-identity=""
      className={
        "tap-press flex items-center gap-3.5 rounded-2xl px-1 py-1 motion-safe:transition-colors active:bg-paper/[0.04]" + (className ? ` ${className}` : "")
      }
    >
      <ReaderAvatar name={name} picture={me.state === "in" ? me.picture : null} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-lede font-semibold leading-tight text-paper">{name}</span>
        {since ? <span className="mt-1 block truncate font-sans text-caption text-paper/55">{t("ui.memberSinceDate", { date: since })}</span> : null}
      </span>
      <span aria-hidden className="shrink-0 text-paper/35">
        <ChevronLeft size={16} className="-scale-x-100 rtl:scale-x-100" />
      </span>
    </Link>
  );
}
