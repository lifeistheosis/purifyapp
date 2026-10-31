"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { EikonSeal, StoreAvatar } from "@/components/shop/EikonMarks";
import { PiecePhoto } from "@/components/shop/PiecePhoto";
import { ShopError, ShopListSkeleton, ShopSignInPrompt } from "@/components/shop/ShopStates";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";
import { readInbox, type BuyerOrder } from "@/lib/shop/buyerReads";
import { inboxRows, readTicketSeen, type InboxRow } from "@/lib/shop/inbox";
import { piecePhoto } from "@/lib/shop/orderStory";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import { AUTH_UNRESOLVED_MESSAGE, resolveUser } from "@/lib/supabase/resolveUser";

export type InboxView = { rows: InboxRow[]; orders: Map<string, BuyerOrder>; now: number };

type Result = { signedIn: false } | ({ signedIn: true } & InboxView);

/** The reader's inbox, read on the device under their own policies (lib/shop/buyerReads.ts). */
export async function loadInbox(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const now = Date.now();
  const inbox = await readInbox(createClient(), auth.user.id);
  const rows = inboxRows(inbox.conversations, inbox.lastMessages, inbox.tickets, readTicketSeen(new Date(now).toISOString()));
  return { signedIn: true, rows, orders: inbox.orders, now };
}

/**
 * Messages, Messages A, "The order beside the thread" (r3-19, the owner's
 * pick of 2026-10-31): who wrote last and what they said, the order's piece
 * beside it, unread lit; EIKON wears its seal, a seller their initial. His
 * replies from the support console come into the same list, marked support
 * (build 85 sent them by email only).
 */
export function MessagesClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(loadInbox, []);

  if (loading && !data) return <ShopListSkeleton />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.messages")}
        body="Sign in to message sellers and read their replies."
        next="/shop/messages"
      />
    );
  }
  const view = data && data.signedIn ? data : null;

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
      <header className="pt-6 md:pt-14">
        <h1 className="font-heading text-[30px] font-semibold leading-[1.12] tracking-[-0.2px] text-paper">{t("shop.messages")}</h1>
      </header>

      <Link href="/shop/support" className="shop-raise press-card mt-4 flex items-center gap-3 rounded-[18px] px-3.5 py-3">
        <EikonSeal size={36} />
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[15px] font-semibold text-paper">{t("shop.contactEikonSupport")}</span>
          <span className="mt-0.5 line-clamp-2 block font-sans text-caption leading-snug text-paper/60">
            {t("shop.questionsAboutAnOrderAn")}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
      </Link>

      {view && view.rows.length ? (
        <InboxList view={view} className="mt-3.5" />
      ) : (
        <p className="mt-8 font-serif text-body leading-[1.65] text-paper/65">{t("shop.noConversationsYetMessageEikon")}</p>
      )}
    </div>
  );
}

/**
 * The threads, each a row: who it is with (and support, for the console's
 * replies), when it last moved, what it is about and the last thing said,
 * the reader's own as "You: …", the order's piece at the end. `compact` is
 * the website's rail beside an open thread, the open one lit.
 */
export function InboxList({
  view,
  compact = false,
  currentHref,
  className,
}: {
  view: InboxView;
  compact?: boolean;
  currentHref?: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const when = (iso: string) => {
    const d = new Date(iso);
    const days = (view.now - d.getTime()) / 86_400_000;
    return days < 6 && days >= 0
      ? d.toLocaleDateString(deviceDateLocale(), { weekday: "short" })
      : d.toLocaleDateString(deviceDateLocale(), { month: "short", day: "numeric" });
  };
  return (
    <ul className={cn(compact ? "space-y-1" : "shop-raise divide-y divide-paper/[0.09] overflow-hidden rounded-[18px]", className)}>
      {view.rows.map((row) => {
        const order = row.orderId ? view.orders.get(row.orderId) ?? null : null;
        const current = row.href === currentHref;
        return (
          <li key={`${row.kind}:${row.id}`}>
            <Link
              href={row.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "press-card relative flex items-start gap-3",
                compact ? "rounded-[14px] p-3" : "px-3.5 py-3.5",
                compact && current && "shop-raise ring-1 ring-paper/50",
              )}
            >
              {row.unread ? (
                <>
                  <span aria-hidden className={cn("shop-dot absolute start-1", compact ? "top-[27px]" : "top-[31px]")} />
                  <span className="sr-only">{t("shop.unread")}</span>
                </>
              ) : null}
              <StoreAvatar name={row.name} seal={row.seal} size={compact ? 34 : 40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("min-w-0 truncate font-sans text-[15px] text-paper", row.unread ? "font-bold" : "font-semibold")}>
                    {row.name}
                    {row.support ? <span className="text-[12.5px] font-medium text-paper/50"> · {t("shop.inboxSupport")}</span> : null}
                  </span>
                  <span
                    className={cn(
                      "ms-auto shrink-0 font-sans text-caption",
                      row.unread ? "shop-lit font-semibold text-paper" : "text-paper/60",
                    )}
                  >
                    {when(row.at)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate font-sans text-ui font-semibold text-paper/90">
                  {row.title}
                  {row.closed ? ` · ${t("shop.requestClosed")}` : ""}
                </span>
                {row.preview ? (
                  <span
                    className={cn(
                      "mt-0.5 block font-sans leading-[1.4]",
                      compact ? "truncate text-[12.5px]" : "line-clamp-2 text-[13.5px]",
                      row.unread ? "text-paper/80" : "text-paper/50",
                    )}
                  >
                    {row.mine ? t("shop.inboxYou", { text: row.preview }) : row.preview}
                  </span>
                ) : null}
              </span>
              {order && !compact ? (
                <PiecePhoto
                  photo={piecePhoto(order.items[0]?.product ?? null)}
                  sizes="36px"
                  className="mt-0.5 rounded-lg"
                  style={{ width: 36, height: 44 }}
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
