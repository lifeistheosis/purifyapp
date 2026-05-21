/**
 * Required attribution shown beneath any LICENSED translation (NKJV/NIV/NLT).
 * Per the ABS / Biblica agreements, every display of the licensed text must
 * carry the publisher copyright/trademark notice (verbatim from the API), and
 * — on the API.Bible Starter plan — a visible citation + hyperlink to
 * api.bible. The Biblica (NIV) notice itself contains the required "Biblica"
 * link. Public-domain texts do not use this component.
 */
export function ScriptureAttribution({
  copyright,
  translationLabel,
}: {
  copyright: string;
  translationLabel: string;
}) {
  return (
    <footer className="mt-10 pt-6 border-t border-paper/10 space-y-3">
      {copyright && (
        // The API delivers the publisher's exact copyright + trademark notice
        // (which includes the publisher's website link). Render it verbatim.
        <div
          className="font-sans text-[12px] leading-relaxed text-paper/55 [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2"
          dangerouslySetInnerHTML={{ __html: copyright }}
        />
      )}
      <p className="font-sans text-[12px] text-paper/45">
        {translationLabel} provided by{" "}
        <a
          href="https://api.bible"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline underline-offset-2 hover:text-gold/80"
        >
          API.Bible
        </a>
        , a service of American Bible Society.
      </p>
    </footer>
  );
}
