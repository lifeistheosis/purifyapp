import { ChantsHome } from "@/components/chants/ChantsHome";
import { chantIndex } from "@/lib/chants/registry.server";

export const metadata = {
  title: "Chants",
  description:
    "Hymns of the Orthodox Church, sung, with the words as they are sung: their history, when the Church sings them, and each version to play.",
};

// Chants (1.7), where the Kitchen was. The server hands the home the index
// (every chant without its words), and the home picks what to offer on the
// reader's own day, on the device: a server's "today" would be the build's in
// the apps. No word here is looked up on the server
// (lib/i18n/__tests__/serverWords.test.ts): the home draws them itself.
export default function ChantsPage() {
  return <ChantsHome index={chantIndex()} />;
}
