"use client";

/**
 * Members set to end: renewal turned off in the store, still paid up until a
 * day. One row each (who, the store, the day it ends, the store's reason when
 * one is kept), and a short note for him to send from his own address, a
 * thank-you and one honest question. docs/plans/keep-members.md, step 1, his
 * yes of 2026-11-24. No discount and no pressure: pricing is his decision, and
 * cancelling stays one tap in the store.
 */

import { useState } from "react";

import { SENSITIVE } from "@/lib/admin/streamer";

import { Panel, Quiet } from "../daily/parts";
import { Disclosure, Email } from "../primitives";

export type EndingMember = {
  userId: string;
  name: string | null;
  email: string | null;
  source: string;
  nextBilling: string | null;
  endReason: string | null;
};

const STORES: Record<string, string> = { google: "Google Play", apple: "App Store", stripe: "the website" };

/** RevenueCat's cancel reasons, in words. */
export const REASONS: Record<string, string> = {
  UNSUBSCRIBE: "turned renewal off",
  BILLING_ERROR: "the card failed",
  PRICE_INCREASE: "did not accept a price change",
  CUSTOMER_SUPPORT: "refunded or cancelled by support",
  DEVELOPER_INITIATED: "cancelled by us",
  UNKNOWN: "no reason given",
};

/** The note, in the house voice, for a first name or none. */
export function noteFor(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return [
    `Hi${first ? ` ${first}` : ""},`,
    "",
    "Thank you for being a Purify Plus member. I saw your membership is set to end, and I wanted to ask one honest question: was something missing, or something that did not work for you?",
    "",
    "Whatever the answer, it helps me make Purify better. Just reply to this email; I read every one.",
    "",
    "With gratitude,",
    "Edgar, the Purify Team",
  ].join("\n");
}

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "an unknown day";

export function SetToEnd({ members }: { members: EndingMember[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) =>
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });

  if (members.length === 0) {
    return (
      <Panel title="Set to end">
        <Quiet>No paying member has turned renewal off.</Quiet>
      </Panel>
    );
  }
  const link = "min-h-11 font-sans text-[12.5px] underline underline-offset-[3px]";
  return (
    <Panel title={`Set to end: ${members.length} ${members.length === 1 ? "member" : "members"}`}>
      <ul>
        {members.map((m) => (
          <li key={m.userId} className="flex min-h-[56px] items-center gap-3 border-t py-2 first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
            <span className="min-w-0 flex-1">
              <span className={"block truncate font-sans text-[13.5px] " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                {m.name ?? <Email value={m.email} fallback="No email on file" />}
              </span>
              <span className="mt-0.5 block font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                {STORES[m.source] ?? m.source}, ends {day(m.nextBilling)}
                {m.endReason ? `, ${REASONS[m.endReason] ?? m.endReason.toLowerCase()}` : ""}
              </span>
            </span>
            {m.email ? (
              <button type="button" onClick={() => copy(m.userId, m.email as string)} className={link} style={{ color: "var(--adm-ink-2)" }}>
                {copied === m.userId ? "Copied" : "Copy email"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <Disclosure title="Your note" hint="A thank-you and one honest question, from your own email">
          <div className="px-3 pb-3 md:px-4">
            <p className="whitespace-pre-line font-sans text-[13px] leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
              {noteFor(null)}
            </p>
            <button type="button" onClick={() => copy("note", noteFor(null))} className={link + " mt-1"} style={{ color: "var(--adm-ink-2)" }}>
              {copied === "note" ? "Copied" : "Copy the note"}
            </button>
          </div>
        </Disclosure>
      </div>
    </Panel>
  );
}
