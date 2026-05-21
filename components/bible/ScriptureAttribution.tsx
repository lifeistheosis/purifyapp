/**
 * Required attribution shown beneath any LICENSED translation (NKJV/NIV/NLT).
 * Per the ABS / Biblica agreements, every display of the licensed text must
 * carry the publisher's copyright/trademark notice (verbatim from the API), a
 * direct one-step link to the publisher (Biblica's agreement §VII.C requires a
 * link containing "Biblica" for the NIV), and — on the API.Bible Starter plan —
 * a visible citation + hyperlink to api.bible. Public-domain texts don't use
 * this component.
 */

// Per-translation publisher link (the API copyright text is plain, no link).
const PUBLISHER: Record<string, { name: string; url: string }> = {
  niv: { name: "Biblica", url: "https://www.biblica.com" },
  nkjv: { name: "Thomas Nelson", url: "https://www.thomasnelsonbibles.com" },
  nlt: { name: "Tyndale House Publishers", url: "https://www.tyndale.com" },
};

export function ScriptureAttribution({
  transId,
  copyright,
  translationLabel,
}: {
  transId: string;
  copyright: string;
  translationLabel: string;
}) {
  const pub = PUBLISHER[transId];
  return (
    <footer className="mt-10 pt-6 border-t border-paper/10 space-y-2 font-sans text-[12px] leading-relaxed text-paper/55">
      {copyright && <p>{copyright}</p>}
      {pub && (
        <p>
          {translationLabel} ©{" "}
          <a
            href={pub.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline underline-offset-2 hover:text-gold/80"
          >
            {pub.name}
          </a>
          . Used by permission. All rights reserved.
        </p>
      )}
      <p className="text-paper/45">
        Provided by{" "}
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
