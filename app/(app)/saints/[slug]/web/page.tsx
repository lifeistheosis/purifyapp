import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { SaintWebScreen } from "@/components/saints/web/SaintWebScreen";
import { WebViewSwitch } from "@/components/saints/web/WebViewSwitch";
import { getSaint } from "@/lib/saints/saints";
import { saintWeb, webSlugs } from "@/lib/saints/web";

type Params = Promise<{ slug: string }>;

/**
 * A saint's web (1.8): the owner's round 1, the Constellation and the
 * Timeline on one screen with a switch in the top bar, opened from the Web
 * door on the saint's page. Built at build time for every saint the app's
 * data joins to another (lib/saints/web.ts), so the apps carry it in their
 * bundle and it reads nothing on the server: no cookies, no session, the same
 * page for every reader. Its words follow the reader's language in the
 * browser, as every client screen's do.
 */
export function generateStaticParams() {
  return webSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) return { title: "Saint web" };
  const [him, his] = saint.pronoun === "her" ? ["her", "her"] : ["him", "his"];
  return {
    title: `${saint.name}, the saint web`,
    description: `${saint.name} and the saints the library joins to ${him}: teachers and disciples, councils, moments in the Church's history and the Lives that name ${him}, as a web and year by year down ${his} life.`,
  };
}

export default async function SaintWebPage({ params }: { params: Params }) {
  const { slug } = await params;
  const web = saintWeb(slug);
  if (!web) notFound();
  return (
    <>
      {/* The bar's switch stands in the title's place; back returns to his page. */}
      <MobileTopBar
        title={web.center.name}
        back
        backFallback={`/saints/${slug}`}
        center={<WebViewSwitch idBase="saint-web-bar" />}
      />
      <SaintWebScreen data={web} />
    </>
  );
}
