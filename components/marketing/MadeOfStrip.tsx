import { Cross } from "@/components/ui/icons/Cross";
import { getServerLocale } from "@/lib/i18n/server";

const ITEMS: { title: string; body: string }[] = [
  {
    title: "The whole Orthodox canon",
    body: "Septuagint Old Testament (Brenton, 1851) with the deuterocanon and the appointed Psalter numbering, paired with the King James New Testament.",
  },
  {
    title: "Polytonic Koine Greek New Testament",
    body: "Nestle 1904 with Strong's numbers and Robinson morphology on every word. Click any Greek word for the lemma, parse, and short definition.",
  },
  {
    title: "Patristic commentary",
    body: "Selections from Schaff's Ante-Nicene and Nicene Fathers: Athanasius, Chrysostom, Augustine, the Cappadocians, John of Damascus, Maximus, and more.",
  },
  {
    title: "Daily prayer in the common form",
    body: "The Morning and Evening Rules in the wording carried by the Jordanville, St. Tikhon's, and Hapgood Service Book traditions, with a guided Jesus Prayer counter.",
  },
  {
    title: "The calendar in both reckonings",
    body: "New (Revised Julian) of the Ecumenical Patriarchate by default; an Old (Julian) toggle for the Russian, Serbian, Athonite, and Jerusalem traditions. Pascha is shared.",
  },
  {
    title: "No tracking. No advertising. Optional account.",
    body: "Your highlights, notes, bookmarks, and prayer streaks live on your device by default. Sign in to sync them across devices. We don't run analytics or sell ad placement, either way. Built for the praying life, not for engagement.",
  },
];

const ITEMS_DE: { title: string; body: string }[] = [
  {
    title: "Der ganze orthodoxe Kanon",
    body: "Septuaginta-Altes Testament (Brenton, 1851) mit dem Deuterokanon und der angeordneten Psalterzählung, gepaart mit dem King-James-Neuen-Testament.",
  },
  {
    title: "Polytonisches Koine-griechisches Neues Testament",
    body: "Nestle 1904 mit Strong-Nummern und Robinson-Morphologie auf jedem Wort. Klicke ein griechisches Wort an für Lemma, Parsing und Kurzdefinition.",
  },
  {
    title: "Patristischer Kommentar",
    body: "Auswahl aus Schaffs Ante-Nicene und Nicene Fathers: Athanasius, Chrysostomus, Augustinus, die Kappadokier, Johannes von Damaskus, Maximus und weitere.",
  },
  {
    title: "Tägliches Gebet im gemeinen Wortlaut",
    body: "Die Morgen- und Abendregel im Wortlaut, den die Jordanville-, Hl.-Tichon- und Hapgood-Service-Book-Überlieferung trägt, mit einem geführten Jesusgebet-Zähler. Deutsche Wiedergabe nach der Diözese Berlin und Deutschland (ROCOR) und der Metropolie von Wien.",
  },
  {
    title: "Der Kalender in beiden Reckonungen",
    body: "Voreingestellt der Neue (Revidierte Julianische) des Ökumenischen Patriarchats; eine Umschaltung auf den Alten (Julianischen) für die russische, serbische, athonitische und jerusalemische Überlieferung. Pascha ist beiden gemein.",
  },
  {
    title: "Keine Verfolgung. Keine Werbung. Konto freiwillig.",
    body: "Deine Markierungen, Notizen, Lesezeichen und Gebets-Strähnen leben voreingestellt auf deinem Gerät. Melde dich an, um sie über Geräte hinweg abzugleichen. Wir betreiben keine Analytik und verkaufen keinen Werbeplatz, so oder so. Gebaut für das betende Leben, nicht für Bindung.",
  },
];

export async function MadeOfStrip() {
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const items = isDe ? ITEMS_DE : ITEMS;
  return (
    <section className="snap-start md:[min-height:100dvh] flex items-center px-5 md:px-8 pt-24 md:pt-20 pb-10 md:pb-12 bg-night">
      <div className="mx-auto max-w-[1080px] w-full">
        <div className="text-center max-w-[680px] mx-auto mb-6 md:mb-8">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55 mb-2">
            {isDe ? "Woraus wir gemacht sind" : "What we are made of"}
          </p>
          <h2 className="font-sans text-title md:text-heading font-bold text-paper tracking-[-0.02em] leading-[1.15]">
            {isDe
              ? "Gemeinfrei, Klartext, durch und durch."
              : "Public domain, plain-text, all the way down."}
          </h2>
          <p className="mt-3 font-sans text-ui text-paper/65 leading-[1.6]">
            {isDe
              ? "Wir sagen dir, was wir verwendet haben und woher es kommt. Keine Blackbox-Übersetzungen, keine geschützten Einbindungen, keine vor dir versteckten Schriftentscheidungen."
              : "We tell you what we used and where it came from. No black-box translations, no proprietary lock-in, no scriptural choices hidden from you."}
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {items.map((it) => (
            <li
              key={it.title}
              className="rounded-md border border-paper/12 bg-paper/[0.03] p-4"
            >
              <div className="flex items-start gap-3">
                <Cross size={14} className="shrink-0 mt-0.5 text-gold" />
                <div className="min-w-0">
                  <p className="font-sans text-ui font-semibold text-paper leading-tight">
                    {it.title}
                  </p>
                  <p className="mt-1 font-sans text-detail text-paper/70 leading-[1.55]">
                    {it.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
