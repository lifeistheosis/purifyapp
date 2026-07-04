// Quiet notice for the Premium "Immersive History" mode. Free explains the
// history; Plus immerses the reader in it. No buttons, no toggles, no
// countdown: it names what exists (artwork and cinematic motion on the
// timeline), what is still coming, and that the facts stay free.

export function ImmersivePreviewCard() {
  return (
    <aside className="mt-14 rounded-lg border border-paper/10 bg-paper/[0.02] px-5 py-5">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
        Immersive History · Purify Plus
      </p>
      <p className="mt-2 font-serif text-ui text-paper/70 leading-[1.65]">
        Immersive History brings the timeline to life for Purify&nbsp;Plus:
        rights-cleared historical artwork with slow cinematic motion, and era
        atmospheres as you scroll. Animated maps and narration are in the
        works.
      </p>
      <p className="mt-2 font-sans text-detail text-paper/55 leading-[1.6]">
        The history itself never moves behind a paywall: every event, source,
        and citation on this page stays free.
      </p>
    </aside>
  );
}
