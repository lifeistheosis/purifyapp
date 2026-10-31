"use client";

// Services, his pick A on r3-17 (2026-10-30): "quiet until it is not".
//
// The page is one sentence, Everything answers or what does not; a box for
// each problem, dashed for a warning and solid for a failure, with what it
// means and what to press; every other service as one line; and Library
// files as one line under them, its list one tap away. The words are
// lib/admin/services.ts. The strip above every page and Home's list already
// speak when a check fails, so this page only has to say what it means.
//
// TWO SOURCES, BOTH ALREADY IN HAND. The attention strip reads the internal
// probes (Supabase, the rate limiter) through liveStore every five minutes,
// and the outbound probes (API.Bible, Buy Me a Coffee, ipwho.is, Render) once
// per page load through a small once-store, because one of those is a live
// call to a licensed, metered API. This page composes the two reads the strip
// already holds and adds no probe of its own; Re-probe is the explicit Retry
// the once-store allows.
//
// #tab=content-health (Library files) lands here with the list open.

import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { readLive } from "@/lib/admin/liveStore";
import { useLiveData } from "@/lib/admin/useLiveData";
import { refreshOutbound, useOutboundProbe } from "@/lib/admin/useAttention";
import { SOURCE_URL } from "@/lib/admin/attention";
import { libraryLine, servicesPage, type ProbeIn } from "@/lib/admin/services";

import { StatusDot, ToolbarButton } from "../primitives";
import { LibraryList, type LibraryPayload } from "../services/LibraryList";
import { BOX, BOX_STYLE, FAIL_BOX, WARN_BOX, ink, ink2, ink3, line } from "../tools/look";

type Payload = { probes: ProbeIn[]; generatedAt: string };

const isPayload = (d: unknown): d is Payload =>
  typeof d === "object" && d !== null && Array.isArray((d as { probes?: unknown }).probes);

export function HealthTab() {
  return <ServicesPage />;
}

export function ServicesPage({ libraryOpen = false }: { libraryOpen?: boolean }) {
  const internal = useLiveData<Payload>(SOURCE_URL.internal, 300_000);
  const outbound = useOutboundProbe();
  const outboundData = isPayload(outbound.data) ? outbound.data : null;

  // In-flight state is local: the store's `loading` means "never answered",
  // which is right for the first paint and wrong for a Re-probe.
  const [busy, setBusy] = useState(false);
  const reprobe = () => {
    setBusy(true);
    void Promise.all([readLive(SOURCE_URL.internal), refreshOutbound()]).finally(() => setBusy(false));
  };

  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [libraryFailed, setLibraryFailed] = useState(false);
  const [open, setOpen] = useState(libraryOpen);
  useEffect(() => {
    let alive = true;
    adminJson<LibraryPayload>("/api/admin/content-health").then((d) => {
      if (!alive) return;
      if (d) setLibrary(d);
      else setLibraryFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const probes: ProbeIn[] = [...(internal.data?.probes ?? []), ...(outboundData?.probes ?? [])];
  const anyData = probes.length > 0;
  const anyFailedRead = internal.failing || outbound.failing;
  const page = servicesPage(probes);
  const probedAt = [internal.data?.generatedAt, outboundData?.generatedAt]
    .filter((s): s is string => typeof s === "string")
    .sort()
    .pop();
  const checked = probedAt
    ? `Checked ${new Date(probedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
    : "";

  const sentence = anyData
    ? page.sentence
    : anyFailedRead
      ? "The checks did not answer."
      : "Checking every service.";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-sans text-[20px] font-semibold tracking-[-0.01em]" style={ink}>
            {sentence}
          </h2>
          <p className="mt-1 font-sans text-[12.5px]" style={ink3}>
            {checked} Re-probe asks every service again.
            {anyData && anyFailedRead ? " One of the two reads did not answer, so a service may be missing below." : ""}
          </p>
        </div>
        <ToolbarButton onClick={reprobe} loading={busy}>
          {busy ? "Asking" : "Re-probe"}
        </ToolbarButton>
      </div>

      {page.problems.map((p) => (
        <section
          key={p.key + p.title}
          className="flex flex-col gap-3 rounded-[var(--adm-radius)] p-4 md:flex-row md:items-center md:gap-4"
          style={{ ...(p.box === "fail" ? FAIL_BOX : WARN_BOX), background: "var(--adm-panel)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-sans text-[13.5px] font-semibold" style={ink}>
              <StatusDot tone={p.box === "fail" ? "bad" : "wait"} />
              {p.title}
            </p>
            <p className="mt-1 font-sans text-[12.5px] leading-[1.55]" style={ink2}>
              {p.body}
            </p>
          </div>
          {p.open ? (
            <a
              href={p.open.href}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-control inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px] font-medium"
              style={
                {
                  "--_bd": "var(--adm-line-strong)",
                  "--_bg": "var(--adm-control)",
                  "--_bg-hover": "var(--adm-panel-2)",
                  color: "var(--adm-ink)",
                } as React.CSSProperties
              }
            >
              {p.open.label}
              <span aria-hidden>&#8599;</span>
            </a>
          ) : null}
        </section>
      ))}

      {page.lines.length > 0 ? (
        <section>
          {page.problems.length > 0 ? (
            <p className="mb-2 font-sans text-[12px] font-semibold" style={ink2}>
              Everything else answers
            </p>
          ) : null}
          <ul className={BOX} style={BOX_STYLE}>
            {page.lines.map((l, i) => (
              <li key={l.key + l.name} className={i === 0 ? "" : "border-t"} style={line}>
                <details className="group">
                  <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[7px_minmax(0,9.5rem)_1fr_auto] items-center gap-3 px-4 py-2 font-sans text-[13px] [&::-webkit-details-marker]:hidden">
                    <StatusDot tone={l.tone === "good" ? "good" : "idle"} />
                    <span className="truncate font-medium" style={ink}>
                      {l.name}
                    </span>
                    <span className="truncate" style={ink3}>
                      {l.says}
                    </span>
                    <span className="text-right font-mono text-[12px]" style={ink3}>
                      {l.ms === null ? (l.tone === "idle" ? "off" : "") : `${l.ms} ms`}
                    </span>
                  </summary>
                  {l.note ? (
                    <p className="px-4 pb-3 pl-[2.6rem] font-sans text-[12px] leading-[1.55]" style={ink3}>
                      {l.note}
                    </p>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : !anyData ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          {anyFailedRead ? "Neither read answered. Re-probe asks again." : "Asking each service."}
        </p>
      ) : null}

      <section className={`${BOX} px-4 py-3`} style={BOX_STYLE}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 font-sans text-[12.5px] leading-[1.55]" style={ink2}>
            <span className="font-semibold" style={ink}>
              The library:
            </span>{" "}
            {library ? libraryLine(library) : libraryFailed ? "its count did not load." : "counting."}
          </p>
          {library ? (
            <ToolbarButton onClick={() => setOpen((v) => !v)}>{open ? "Close the list" : "Open the list"}</ToolbarButton>
          ) : null}
        </div>
        {library && open ? (
          <div className="mt-3 border-t pt-3" style={line}>
            <LibraryList data={library} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
