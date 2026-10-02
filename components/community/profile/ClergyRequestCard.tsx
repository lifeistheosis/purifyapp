"use client";

import { useState } from "react";

import { ClergySeal } from "@/components/community/ClergySeal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { CLERGY_EVIDENCE_MAX, CLERGY_RANKS, CLERGY_TEXT_MAX, clergyLabelKey, type ClergyRank, type MyClergy } from "@/lib/profile/clergy";
import { requestClergy } from "@/lib/profile/client";

/**
 * Asking for the verified clergy seal, from the profile editor.
 *
 * For bishops, priests, deacons and monastics: the rank, the jurisdiction,
 * the parish or monastery, and how the team can check. The team verifies
 * by hand (app/api/admin/clergy); until then the request simply waits, and
 * a decline comes back with the team's note. Nothing a reader types here can
 * grant the seal.
 */
export function ClergyRequestCard({ initial }: { initial: MyClergy | undefined }) {
  const { t } = useTranslate();
  const [clergy, setClergy] = useState<MyClergy>(
    initial ?? { status: "none", rank: null, jurisdiction: null, parish: null, note: null },
  );
  const [open, setOpen] = useState(false);
  const [rank, setRank] = useState<ClergyRank>(clergy.rank ?? "priest");
  const [jurisdiction, setJurisdiction] = useState(clergy.jurisdiction ?? "");
  const [parish, setParish] = useState(clergy.parish ?? "");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field =
    "w-full rounded-lg border border-paper/15 bg-night px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none";

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await requestClergy({ rank, jurisdiction: jurisdiction.trim(), parish: parish.trim() || null, evidence: evidence.trim() });
    setBusy(false);
    if (res.ok) {
      setClergy(res.clergy);
      setOpen(false);
    } else {
      setError(
        res.code === "filtered"
          ? t("profile.err.filtered")
          : res.code === "unavailable"
            ? t("profile.notOpenYet")
            : res.code === "invalid"
              ? t("clergy.err.invalid")
              : t("clergy.err.failed"),
      );
    }
  }

  const ready = jurisdiction.trim().length >= 2 && evidence.trim().length >= 10;

  return (
    <section className="space-y-3 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5" aria-labelledby="pe-clergy">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <ClergySeal mark={clergy.status === "verified" ? (clergy.rank ?? "clergy") : "priest"} size={22} />
        </span>
        <div className="min-w-0">
          <p id="pe-clergy" role="heading" aria-level={2} className="font-serif text-lede text-paper">
            {t("clergy.title")}
          </p>
          <p className="mt-1 font-sans text-detail leading-relaxed text-paper/65">
            {clergy.status === "verified"
              ? t("clergy.verifiedBody", { seal: t(clergyLabelKey(clergy.rank ?? "clergy")) })
              : clergy.status === "requested"
                ? t("clergy.requestedBody")
                : t("clergy.body")}
          </p>
          {clergy.status === "declined" ? (
            <p className="mt-2 rounded-lg border border-paper/12 bg-black/20 px-3 py-2 font-sans text-caption text-paper/70">
              {clergy.note ? t("clergy.declinedWithNote", { note: clergy.note }) : t("clergy.declined")}
            </p>
          ) : null}
        </div>
      </div>

      {clergy.status !== "verified" && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center rounded-pill border border-paper/20 px-4 font-sans text-detail font-semibold text-paper/85 hover:border-paper/40"
        >
          {clergy.status === "requested" ? t("clergy.update") : t("clergy.ask")}
        </button>
      ) : null}

      {open ? (
        <div className="space-y-3">
          <div role="radiogroup" aria-label={t("clergy.rank")} className="flex flex-wrap gap-2">
            {CLERGY_RANKS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rank === r}
                onClick={() => setRank(r)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-pill border px-4 font-sans text-detail font-semibold transition-colors",
                  rank === r ? "border-paper/50 bg-paper/[0.1] text-paper" : "border-paper/15 text-paper/65 hover:border-paper/30",
                )}
              >
                {t(`clergy.rank.${r}`)}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block font-sans text-detail font-semibold text-paper/80">{t("clergy.jurisdiction")}</span>
            <input
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              maxLength={CLERGY_TEXT_MAX}
              placeholder={t("clergy.jurisdictionPlaceholder")}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-detail font-semibold text-paper/80">{t("clergy.parish")}</span>
            <input
              value={parish}
              onChange={(e) => setParish(e.target.value)}
              maxLength={CLERGY_TEXT_MAX}
              placeholder={t("clergy.parishPlaceholder")}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-sans text-detail font-semibold text-paper/80">{t("clergy.evidence")}</span>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              maxLength={CLERGY_EVIDENCE_MAX}
              rows={3}
              placeholder={t("clergy.evidencePlaceholder")}
              className={field}
            />
          </label>
          <p className="font-sans text-caption leading-relaxed text-paper/50">{t("clergy.privacy")}</p>
          {error ? <p className="font-sans text-detail text-rose-300">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !ready}
              className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night disabled:opacity-50"
            >
              {busy ? t("clergy.sending") : t("clergy.send")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-detail text-paper/60 hover:text-paper"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
