// The glyphs on Settings' plates that are letters rather than drawings
// (1.8, the owner's pick A of round 3, "Lit panels"): each is a drawing of
// the setting, not a word, so a screen reader is given the row's name and
// never these. The rest of the plates carry the app's own icons
// (components/ui/icons), chosen in components/settings/SettingsClient.tsx.

/**
 * Reader font: the letter twice, as the reader's own settings mark draws it
 * (components/bible/ReaderMoreSheet.tsx, AaMark). Left to right in every
 * language: it is a drawing of two Latin letters, and in Arabic or Urdu the
 * row's direction would otherwise draw it "aA".
 */
export function FacesGlyph() {
  return (
    <span dir="ltr" className="set-plate-text">
      <span>A</span>
      <span>a</span>
    </span>
  );
}

/** Reader size: a small letter and a large one. */
export function SizesGlyph() {
  return (
    <>
      <span className="set-plate-text set-plate-a1">A</span>
      <span className="set-plate-text set-plate-a2">A</span>
    </>
  );
}

/** Interlinear: the Greek beside the English, as its first letter. */
export function AlphaGlyph() {
  return <span className="set-plate-text set-plate-alpha">α</span>;
}

/** Language: the globe the language switcher wears (components/i18n/LocaleSwitcher.tsx). */
export function GlobeGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 C15 6.5 15 17.5 12 21 C9 17.5 9 6.5 12 3 Z" />
    </svg>
  );
}
