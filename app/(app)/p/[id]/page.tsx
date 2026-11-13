import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SharedPageView } from "@/components/journal/SharedPageView";
import { shareTitle } from "@/lib/journal/share";
import { getSharedPage } from "@/lib/journal/sharedPage";

// A shared journal page (1.9, docs/1.9-build/JOURNAL.md, step 3): a copy of a
// reader's page at an unlisted link, read on the server so a pasted link
// carries its preview. Website only: the apps open the link (the tree is set
// aside from the native export in scripts/native-build.mjs, as /u is).

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const shared = await getSharedPage(id);
  if (!shared) return { title: "Purify", robots: { index: false, follow: false } };
  const title = shareTitle(shared.page) || "Purify";
  return {
    title,
    // Its own address as og:url ("./" is read against this page's path): an
    // openGraph set here replaces the root's whole, its url with it.
    openGraph: { title, type: "article", url: "./" },
    twitter: { card: "summary_large_image", title },
    // A reader's page, kept out of search engines until it is reviewed, so
    // Purify's name is never lent to an unreviewed page.
    robots: { index: shared.reviewed, follow: false },
  };
}

export default async function SharedJournalPage({ params }: { params: Params }) {
  const { id } = await params;
  const shared = await getSharedPage(id);
  if (!shared) notFound();
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:py-16">
      <SharedPageView shared={shared} />
    </section>
  );
}
