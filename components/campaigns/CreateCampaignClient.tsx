"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  INTENTIONS,
  DURATIONS,
  defaultPrayerKey,
  presetsFor,
  type CampaignIntention,
  type ForWhom,
} from "@/lib/campaigns/campaigns";
import { createCampaign } from "@/lib/campaigns/client";
import { createClient } from "@/lib/supabase/client";

export function CreateCampaignClient() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [intention, setIntention] = useState<CampaignIntention>("healing");
  const [forWhom, setForWhom] = useState<ForWhom>("living");
  const [subjectName, setSubjectName] = useState("");
  const [note, setNote] = useState("");
  const [prayerKey, setPrayerKey] = useState<string>(defaultPrayerKey("healing"));
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [blessing, setBlessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  function pickIntention(slug: CampaignIntention) {
    setIntention(slug);
    const def = INTENTIONS.find((i) => i.slug === slug)?.defaultFor ?? "living";
    setForWhom(def);
    setPrayerKey(defaultPrayerKey(slug));
  }

  function changeForWhom(f: ForWhom) {
    setForWhom(f);
    // Keep the chosen prayer valid for the new context, else sensible default.
    if (!presetsFor(f).some((p) => p.key === prayerKey)) {
      setPrayerKey(f === "departed" ? "memory-eternal" : defaultPrayerKey(intention));
    }
  }

  const departedFixed = intention === "departed";
  const prayers = presetsFor(departedFixed ? "departed" : forWhom);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (title.trim().length < 3) {
      setError("Give the campaign a short title.");
      return;
    }
    if (!blessing) {
      setError("Please confirm this is your own request or you have their blessing.");
      return;
    }
    setBusy(true);
    const res = await createCampaign({
      title: title.trim(),
      intention,
      forWhom: departedFixed ? "departed" : forWhom,
      subjectName: subjectName.trim() || null,
      note: note.trim() || null,
      prayerKey,
      durationDays: durationDays as 7 | 9 | 40 | null,
      blessing: true,
    });
    setBusy(false);
    if (res.ok && res.id) {
      router.push(`/campaigns/detail?id=${res.id}`);
    } else {
      setError(res.error ?? "Couldn't start your campaign.");
    }
  }

  if (signedIn === false) {
    return (
      <Shell>
        <p className="font-serif text-lede text-paper/85">
          Sign in to start a prayer campaign.
        </p>
        <Link
          href="/signin?next=/campaigns/new"
          className="mt-5 inline-flex rounded-pill bg-paper px-6 py-3 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  const labelCls =
    "block font-sans text-caption font-semibold uppercase tracking-[1px] text-paper/50 mb-2";
  const inputCls =
    "w-full rounded-lg border border-paper/15 bg-black/30 px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/30 focus:border-gold/45 focus:outline-none transition-colors";

  return (
    <Shell>
      <Link
        href="/campaigns"
        className="font-sans text-caption text-paper/50 hover:text-paper/80"
      >
        ← All campaigns
      </Link>
      <h1 className="mt-4 font-display-serif text-title text-paper">
        Start a prayer campaign
      </h1>
      <p className="mt-2 font-sans text-ui leading-relaxed text-paper/60">
        Ask the community to pray with you for a person, a need, or a soul at
        rest. Use first names only, and never anyone else’s private details.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-6">
        <div>
          <label htmlFor="title" className={labelCls}>
            Title
          </label>
          <input
            id="title"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Pray for my grandmother's healing"
          />
        </div>

        <div>
          <span className={labelCls}>What is it for?</span>
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map((i) => (
              <button
                key={i.slug}
                type="button"
                onClick={() => pickIntention(i.slug)}
                aria-pressed={intention === i.slug}
                className={`rounded-pill border px-3.5 py-1.5 font-sans text-caption font-semibold transition-colors ${
                  intention === i.slug
                    ? "border-gold/50 bg-gold/10 text-gold-pale"
                    : "border-paper/15 text-paper/60 hover:border-paper/30"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {!departedFixed ? (
          <div>
            <span className={labelCls}>For the living or the departed?</span>
            <div className="flex gap-2">
              {(["living", "departed"] as ForWhom[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => changeForWhom(f)}
                  aria-pressed={forWhom === f}
                  className={`rounded-pill border px-4 py-1.5 font-sans text-caption font-semibold capitalize transition-colors ${
                    forWhom === f
                      ? "border-gold/50 bg-gold/10 text-gold-pale"
                      : "border-paper/15 text-paper/60 hover:border-paper/30"
                  }`}
                >
                  {f === "departed" ? "The departed" : "The living"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <span className={labelCls}>Choose a prayer</span>
          <div className="space-y-2">
            {prayers.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPrayerKey(p.key)}
                aria-pressed={prayerKey === p.key}
                className={`block w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                  prayerKey === p.key
                    ? "border-gold/50 bg-gold/[0.08]"
                    : "border-paper/12 hover:border-paper/25"
                }`}
              >
                <span className="block font-sans text-ui font-semibold text-paper">
                  {p.label}
                </span>
                <span className="mt-1 block font-serif text-caption italic leading-snug text-paper/60">
                  {p.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="subject" className={labelCls}>
            First name or cause (optional)
          </label>
          <input
            id="subject"
            className={inputCls}
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            maxLength={80}
            placeholder="Maria, or the persecuted in Nigeria"
          />
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>
            A word about it (optional)
          </label>
          <textarea
            id="note"
            className={`${inputCls} min-h-[90px] resize-y`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder="One or two lines. No private medical or personal details of others."
          />
        </div>

        <div>
          <span className={labelCls}>How long should it run?</span>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setDurationDays(d.days)}
                aria-pressed={durationDays === d.days}
                title={d.sub}
                className={`rounded-pill border px-3.5 py-1.5 font-sans text-caption font-semibold transition-colors ${
                  durationDays === d.days
                    ? "border-gold/50 bg-gold/10 text-gold-pale"
                    : "border-paper/15 text-paper/60 hover:border-paper/30"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={blessing}
            onChange={(e) => setBlessing(e.target.checked)}
            className="mt-1 h-4 w-4 accent-gold"
          />
          <span className="font-sans text-caption leading-relaxed text-paper/65">
            This is my own request, or I have this person’s blessing to ask the
            community to pray for them.
          </span>
        </label>

        {error ? (
          <p className="font-sans text-caption text-crimson-soft">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Start the campaign"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[560px]">{children}</div>
    </section>
  );
}
