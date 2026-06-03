import { Cross } from "@/components/ui/icons/Cross";
import { getServerLocale } from "@/lib/i18n/server";

const ITEMS: { title: string; body: string }[] = [
  {
    title: "The whole Orthodox canon",
    body: "Brenton Septuagint with the deuterocanon, paired with the King James.",
  },
  {
    title: "Greek New Testament",
    body: "Nestle 1904. Tap any word for its parse and meaning.",
  },
  {
    title: "Patristic commentary",
    body: "Athanasius, Chrysostom, Augustine, the Cappadocians, and more.",
  },
  {
    title: "Daily prayer",
    body: "The Morning and Evening Rules, with a guided Jesus Prayer counter.",
  },
  {
    title: "Both calendars",
    body: "New and Old (Julian) reckonings. Shared Pascha.",
  },
  {
    title: "No tracking, no ads",
    body: "Your notes stay on your device. Sign in to sync. No analytics, ever.",
  },
];

const ITEMS_DE: { title: string; body: string }[] = [
  {
    title: "Der ganze orthodoxe Kanon",
    body: "Brenton-Septuaginta mit Deuterokanon, gepaart mit der King-James-Bibel.",
  },
  {
    title: "Griechisches Neues Testament",
    body: "Nestle 1904. Tippe ein Wort für Parsing und Bedeutung.",
  },
  {
    title: "Patristischer Kommentar",
    body: "Athanasius, Chrysostomus, Augustinus, die Kappadokier und mehr.",
  },
  {
    title: "Tägliches Gebet",
    body: "Die Morgen- und Abendregel, mit geführtem Jesusgebet-Zähler.",
  },
  {
    title: "Beide Kalender",
    body: "Neue und Alte (Julianische) Zählung. Gemeinsames Pascha.",
  },
  {
    title: "Kein Tracking, keine Werbung",
    body: "Deine Notizen bleiben auf dem Gerät. Anmelden zum Abgleich. Keine Analytik.",
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
