import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SharedProfile } from "@/components/community/profile/SharedProfile";
import { sharedProfile } from "@/lib/profile/shared";

// A reader's profile at its own address, for sharing: purifyapp.net/u/<handle>.
//
// WEBSITE ONLY. It reads the profile on the server, at request time, so a
// link pasted into a message carries a real preview card (opengraph-image
// beside this file). The native export has no server for that, so this tree
// is stashed out of it (scripts/native-build.mjs); inside the apps a profile
// opens over Community instead (/community#@handle).
export const dynamic = "force-dynamic";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await sharedProfile(handle);
  if (!profile) return { title: "Profile" };
  const title = `${profile.name} (@${profile.handle})`;
  const description = profile.private ? `${profile.name} on Purify` : profile.bio || `${profile.name} on Purify`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
    // A person's page, not a document of the site.
    robots: { index: false, follow: false },
  };
}

export default async function SharedProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const profile = await sharedProfile(handle);
  if (!profile) notFound();
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:py-16">
      <SharedProfile profile={profile} />
    </section>
  );
}
