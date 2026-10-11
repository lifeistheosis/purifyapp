import { ParishFinderList } from "@/components/parishes/ParishFinderList";

export const metadata = {
  title: "Find a parish",
  description:
    "The parish directories kept by the Orthodox jurisdictions themselves, for North America, the United Kingdom and Ireland, Western Europe, and Australia and New Zealand.",
};

// Find a parish (1.6). Many readers are inquirers or catechumens with no
// parish yet, so this sends them to the directories the jurisdictions publish.
// Links out and nothing more: no map, no location, nothing loaded from the
// sites it names. It reads no cookie and no session, so it prerenders as it
// stands for the website and for the apps' static export.
export default function ParishesPage() {
  return <ParishFinderList />;
}
