// Restrained preview of the future Premium "Immersive History" mode.
// Free explains the history; Premium will immerse the reader in it. This
// card promises nothing that doesn't exist: no buttons, no toggles, no
// "unlock", a single quiet notice that the facts on this page stay free.

export function ImmersivePreviewCard() {
  return (
    <aside className="mt-14 rounded-lg border border-paper/10 bg-paper/[0.02] px-5 py-5">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
        Coming to Purify Plus
      </p>
      <p className="mt-2 font-serif text-ui text-paper/70 leading-[1.65]">
        Immersive History, cinematic journeys through these events, with
        animated maps and narration, is in the works for Purify&nbsp;Plus.
      </p>
      <p className="mt-2 font-sans text-detail text-paper/55 leading-[1.6]">
        The history itself never moves behind a paywall: every event, source,
        and citation on this page stays free.
      </p>
    </aside>
  );
}
