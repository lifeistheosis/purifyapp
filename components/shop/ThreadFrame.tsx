"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { StoreAvatar } from "@/components/shop/EikonMarks";
import { InboxList, loadInbox } from "@/components/shop/MessagesClient";
import { OrderSide } from "@/components/shop/OrderPin";
import { cn } from "@/lib/cn";
import type { BuyerOrder } from "@/lib/shop/buyerReads";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useWide } from "@/lib/shop/useWide";

/** Who the thread is with: the seal or the initial, the name as the page's heading, one line under it. */
export function ThreadHead({ name, seal, line }: { name: string; seal: boolean; line: string | null }) {
  return (
    <header className="flex items-center gap-3 pt-4 md:pt-12 lg:pt-0">
      <StoreAvatar name={name} seal={seal} size={38} />
      <div className="min-w-0">
        <h1 className="truncate font-sans text-base font-bold text-paper">{name}</h1>
        {line ? <p className="truncate font-sans text-caption text-paper/60">{line}</p> : null}
      </div>
    </header>
  );
}

/**
 * A thread's page (r3-19, Messages A). On a phone, one column; at the
 * website's width the reader's inbox stands to the left and the order the
 * thread is about to the right, as the owner's own Messages A sets the reader
 * beside the request. The inbox is read only when the window is that wide.
 */
export function ThreadFrame({
  current,
  order,
  now,
  children,
}: {
  current: string;
  order: BuyerOrder | null;
  now: number;
  children: ReactNode;
}) {
  const wide = useWide();
  const inbox = useAsyncData(() => (wide ? loadInbox() : Promise.resolve(null)), [wide]);
  const view = inbox.data && inbox.data.signedIn ? inbox.data : null;
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8 lg:grid lg:max-w-[1240px] lg:grid-cols-[300px_minmax(0,1fr)_280px] lg:items-start lg:gap-6 lg:pt-10">
      {wide && view ? (
        <aside className="hidden lg:block">
          <InboxList view={view} compact currentHref={current} />
        </aside>
      ) : null}
      <section className={cn("min-w-0", wide && !view && "lg:col-start-2", !order && "lg:col-span-2")}>{children}</section>
      {wide && order ? (
        <aside className="hidden lg:block">
          <OrderSide order={order} now={now} />
        </aside>
      ) : null}
    </div>
  );
}

/** A thread that is not the reader's, or not there. */
export function ThreadNotFound() {
  const { t } = useTranslate();
  return (
    <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
      <h1 className="font-heading text-[28px] font-semibold text-paper">{t("shop.conversationNotFound")}</h1>
      <Link
        href="/shop/messages"
        className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
      >
        {t("shop.messages")}
      </Link>
    </div>
  );
}
