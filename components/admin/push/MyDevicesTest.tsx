"use client";

// A test notification to the admin's own devices, and what each push service
// answered (app/api/admin/push/test; lib/push/selfTest.ts says why it exists).
//
// It answers the one question a broadcast could not: is my own phone on my
// account, and does Google, Apple or the browser take a push for it? A row
// that says Accepted while the device shows nothing puts the fault on the
// device (its notification settings, or its battery saver); a refusal, or no
// row at all, puts it on the server's side, and the row says what to do.

import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { kindLabel, type MyDevice, type MyDeviceResult } from "@/lib/push/selfTest";

import { Card, Pill, ToolbarButton } from "../primitives";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : null);

function accepter(kind: MyDevice["kind"]): string {
  return kind === "android" ? "Google" : kind === "ios" ? "Apple" : "the browser's push service";
}

function Verdict({ d }: { d: MyDeviceResult }) {
  if (d.result === "accepted") {
    return (
      <>
        <Pill tone="emerald">Accepted by {accepter(d.kind)}</Pill>
        <p className="mt-1 font-sans text-caption leading-snug text-[color:var(--adm-ink-2)]">
          It should be on this device now. If nothing showed, the fault is on the device: its notification settings for
          Purify, or a battery saver that stops it.
        </p>
      </>
    );
  }
  if (d.result === "gone") {
    return (
      <>
        <Pill tone="gold">No longer there</Pill>
        <p className="mt-1 font-sans text-caption leading-snug text-[color:var(--adm-ink-2)]">
          {d.reason ?? "Refused as a device that no longer exists."} It was taken off your account. Open Purify on it,
          signed in, to save it again.
        </p>
      </>
    );
  }
  if (d.result === "not-set-up") {
    return (
      <>
        <Pill tone="neutral">Not set up</Pill>
        <p className="mt-1 font-sans text-caption leading-snug text-[color:var(--adm-ink-2)]">{d.reason}</p>
      </>
    );
  }
  return (
    <>
      <Pill tone="rose">Refused</Pill>
      <p className="mt-1 font-sans text-caption leading-snug text-[color:var(--adm-ink-2)]">{d.reason ?? "Refused, with no reason given."}</p>
    </>
  );
}

export function MyDevicesTest() {
  const [devices, setDevices] = useState<(MyDevice | MyDeviceResult)[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void adminJson<{ devices?: MyDevice[] }>("/api/admin/push/test").then((d) => {
      if (!alive) return;
      if (d?.devices) setDevices(d.devices);
      else setFailed("Could not read your devices.");
    });
    return () => {
      alive = false;
    };
  }, []);

  async function send() {
    setSending(true);
    setFailed(null);
    try {
      const r = await fetch("/api/admin/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
        cache: "no-store",
      });
      const d = (await r.json().catch(() => null)) as { devices?: MyDeviceResult[]; sentAt?: string; error?: string } | null;
      if (!r.ok || !d?.devices) {
        setFailed(d?.error ?? "The test could not be sent.");
        return;
      }
      setDevices(d.devices);
      setSentAt(d.sentAt ?? new Date().toISOString());
    } catch {
      setFailed("The test could not be sent.");
    } finally {
      setSending(false);
    }
  }

  const none = devices !== null && devices.length === 0;

  return (
    <Card
      title="Your own devices"
      subtitle="A test notification to your account alone, never to readers, with what each push service answered."
      action={
        <ToolbarButton onClick={send} loading={sending}>
          {sentAt ? "Send again" : "Send a test"}
        </ToolbarButton>
      }
    >
      {failed ? (
        <p className="mb-2 font-sans text-detail text-[color:var(--adm-ink)]">{failed}</p>
      ) : null}
      {sentAt ? (
        <p className="mb-2 font-sans text-detail text-[color:var(--adm-ink-2)]">
          Sent {when(sentAt)}. Look at each device now, with Purify closed.
        </p>
      ) : null}
      {devices === null && !failed ? (
        <p className="font-sans text-detail text-[color:var(--adm-ink-3)]">Reading your devices.</p>
      ) : none ? (
        <p className="font-sans text-detail leading-snug text-[color:var(--adm-ink-2)]">
          No device is saved to this account, so a test would reach nothing. On the phone, sign in to Purify as this
          account, then You, Settings, Notifications, Turn on reminders, and allow notifications when the phone asks.
        </p>
      ) : devices ? (
        <ul className="grid gap-2">
          {devices.map((d, i) => (
            <li
              key={`${d.kind}-${d.since ?? i}-${i}`}
              className="rounded-[var(--adm-radius)] border border-[color:var(--adm-line)] bg-[color:var(--adm-panel-2)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-sans text-detail font-semibold text-[color:var(--adm-ink)]">
                  {kindLabel(d.kind)}
                  {d.browser ? <span className="font-normal text-[color:var(--adm-ink-2)]">, {d.browser}</span> : null}
                </span>
                <span className="font-sans text-caption text-[color:var(--adm-ink-3)]">
                  {d.since ? `Saved ${when(d.since)}` : "Saved on an unknown day"}
                  {d.zone ? `, ${d.zone}` : ""}
                </span>
              </div>
              <p className="mt-1 font-sans text-caption text-[color:var(--adm-ink-2)]">
                {d.lastAccepted ? `Last taken by ${accepter(d.kind)} ${when(d.lastAccepted)}.` : `Never taken by ${accepter(d.kind)} before.`}
              </p>
              {"result" in d ? (
                <div className="mt-2">
                  <Verdict d={d} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
