import { refLabel, splitDefinition } from "@/lib/bible/strongsDefinition";

const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

/**
 * A Strong's definition as the reader sees it, in the Greek word card and the
 * word study sheet. Greek words take the Greek face; a cross-reference shows
 * as its Greek word with the number set small and quiet after it, so
 * "(with G3588 (ὁ))" reads "(with ὁ G3588)". See lib/bible/strongsDefinition.
 */
export function StrongsDefinition({ text }: { text: string }) {
  return (
    <>
      {splitDefinition(text.trim()).map((p, i) => {
        if (p.kind === "text") return <span key={i}>{p.text}</span>;
        if (p.kind === "greek") {
          return (
            <span key={i} lang="grc" style={GREEK} className="text-paper">
              {p.text}
            </span>
          );
        }
        return (
          <span key={i} className="whitespace-nowrap">
            {p.lemma ? (
              <span lang="grc" style={GREEK} className="text-paper">
                {p.lemma}{" "}
              </span>
            ) : null}
            <span className="text-[0.8em] font-medium tabular-nums text-paper/45">{refLabel(p)}</span>
          </span>
        );
      })}
    </>
  );
}
