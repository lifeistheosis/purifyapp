import type { LocaleCode } from "@/lib/i18n/locales";

type Kind = "bio" | "work" | "prayer";

/**
 * Per-page banner shown on long-prose surfaces (saint biographies, hosted
 * patristic works, prayer rules) when the requested locale variant is
 * missing and the page is falling back to the English source.
 *
 * Editorial choice: rather than machine-translate the Fathers, we name
 * the gap honestly and route readers to the English text. The cookie
 * locale is preserved so navigation stays in the user's language for
 * everything that IS translated (UI chrome, prayers, biographies as
 * they come online).
 */
const MESSAGES: Record<
  LocaleCode,
  Record<Kind, { title: string; body: string }>
> = {
  en: {
    bio: { title: "", body: "" },
    work: { title: "", body: "" },
    prayer: { title: "", body: "" },
  },
  de: {
    bio: {
      title: "Übersetzung im Werden",
      body: "Diese Heiligenvita ist noch nicht ins Deutsche übertragen. Der englische Text der Redaktion steht unten; eine geprüfte deutsche Fassung wird laufend nachgereicht.",
    },
    work: {
      title: "Übersetzung im Werden",
      body: "Dieses Väterwerk ist noch nicht in der gewählten Sprache verfügbar. Wir zeigen den englischen Text aus gemeinfreien Übersetzungen; eine theologisch geprüfte Übertragung wird vorbereitet.",
    },
    prayer: {
      title: "Übersetzung im Werden",
      body: "Diese Gebete sind noch nicht in der gewählten Sprache verfügbar. Wir zeigen den englischen Text; die deutsche Fassung folgt in den Wendungen der Diözese Berlin und Deutschland und der Metropolie von Wien.",
    },
  },
  es: {
    bio: { title: "Traducción en curso", body: "Esta biografía aún no está traducida al idioma seleccionado." },
    work: { title: "Traducción en curso", body: "Esta obra patrística aún no está traducida al idioma seleccionado." },
    prayer: { title: "Traducción en curso", body: "Estas oraciones aún no están traducidas al idioma seleccionado." },
  },
  ro: { bio: { title: "Traducere în curs", body: "Această biografie nu este încă tradusă." }, work: { title: "Traducere în curs", body: "Această lucrare patristică nu este încă tradusă." }, prayer: { title: "Traducere în curs", body: "Aceste rugăciuni nu sunt încă traduse." } },
  el: { bio: { title: "Μετάφραση σε εξέλιξη", body: "Ο βίος δεν έχει ακόμη μεταφραστεί." }, work: { title: "Μετάφραση σε εξέλιξη", body: "Το πατερικό έργο δεν έχει ακόμη μεταφραστεί." }, prayer: { title: "Μετάφραση σε εξέλιξη", body: "Οι προσευχές δεν έχουν ακόμη μεταφραστεί." } },
  ru: { bio: { title: "Перевод готовится", body: "Это житие пока не переведено." }, work: { title: "Перевод готовится", body: "Это отеческое сочинение пока не переведено." }, prayer: { title: "Перевод готовится", body: "Эти молитвы пока не переведены." } },
  fr: { bio: { title: "Traduction en cours", body: "Cette vie n'est pas encore traduite." }, work: { title: "Traduction en cours", body: "Cette œuvre patristique n'est pas encore traduite." }, prayer: { title: "Traduction en cours", body: "Ces prières ne sont pas encore traduites." } },
  sr: { bio: { title: "Превод у припреми", body: "Ово житије још није преведено." }, work: { title: "Превод у припреми", body: "Ово отачко дело још није преведено." }, prayer: { title: "Превод у припреми", body: "Ове молитве још нису преведене." } },
  uk: { bio: { title: "Переклад готується", body: "Це житіє ще не перекладене." }, work: { title: "Переклад готується", body: "Цей отецький твір ще не перекладений." }, prayer: { title: "Переклад готується", body: "Ці молитви ще не перекладені." } },
  it: { bio: { title: "Traduzione in corso", body: "Questa biografia non è ancora tradotta." }, work: { title: "Traduzione in corso", body: "Quest'opera patristica non è ancora tradotta." }, prayer: { title: "Traduzione in corso", body: "Queste preghiere non sono ancora tradotte." } },
  pt: { bio: { title: "Tradução em curso", body: "Esta biografia ainda não foi traduzida." }, work: { title: "Tradução em curso", body: "Esta obra patrística ainda não foi traduzida." }, prayer: { title: "Tradução em curso", body: "Estas orações ainda não foram traduzidas." } },
  bg: { bio: { title: "Превод в подготовка", body: "Това житие все още не е преведено." }, work: { title: "Превод в подготовка", body: "Това отеческо съчинение все още не е преведено." }, prayer: { title: "Превод в подготовка", body: "Тези молитви все още не са преведени." } },
  ar: { bio: { title: "الترجمة قيد الإعداد", body: "لم تُترجم هذه السيرة بعد." }, work: { title: "الترجمة قيد الإعداد", body: "لم يُترجم هذا الأثر الآبائي بعد." }, prayer: { title: "الترجمة قيد الإعداد", body: "لم تُترجم هذه الصلوات بعد." } },
};

export function ContentNotYetTranslated({
  locale,
  kind,
}: {
  locale: LocaleCode;
  kind: Kind;
}) {
  if (locale === "en") return null;
  const m = MESSAGES[locale]?.[kind] ?? MESSAGES.de[kind];
  if (!m.body) return null;
  return (
    <div
      role="status"
      className="my-6 rounded-md border border-gold/30 bg-gold/[0.04] px-4 py-3"
    >
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-gold/85 mb-1">
        {m.title}
      </p>
      <p className="font-serif text-[14px] text-paper/80 leading-relaxed">
        {m.body}
      </p>
    </div>
  );
}
