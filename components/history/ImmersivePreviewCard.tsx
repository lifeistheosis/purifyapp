import { T } from "@/components/i18n/T";
// Quiet notice for the Premium "Immersive History" mode. Free explains the
// history; Plus immerses the reader in it. No buttons, no toggles, no
// countdown: it names what exists (artwork and cinematic motion on the
// timeline), what is still coming, and that the facts stay free.

export function ImmersivePreviewCard() {
  return (
    <aside className="mt-14 rounded-lg border border-paper/10 bg-paper/[0.02] px-5 py-5">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
        <T k="study.immersiveHistoryPurifyPlus" />
      </p>
      <p className="mt-2 font-serif text-ui text-paper/70 leading-[1.65]">
        <T k="study.immersiveHistoryBringsTheTimeline" />
      </p>
      <p className="mt-2 font-sans text-detail text-paper/55 leading-[1.6]">
        <T k="study.theHistoryItselfNeverMoves" />
      </p>
    </aside>
  );
}
