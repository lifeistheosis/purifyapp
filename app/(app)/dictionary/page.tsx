import { Dictionary } from "@/components/dictionary/Dictionary";

export const metadata = {
  title: "Orthodox dictionary",
  description:
    "The words you will meet in an Orthodox church and in Purify, each said plainly in a sentence or two: Theotokos, Kathisma, Theosis, Antidoron and the rest.",
};

// The Orthodox dictionary (1.7). It reads no cookie and no session, so it
// prerenders as it stands for the website and for the apps' static export.
export default function DictionaryPage() {
  return <Dictionary />;
}
