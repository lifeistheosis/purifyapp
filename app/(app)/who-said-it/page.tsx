import { WhoSaidIt } from "@/components/quotes/WhoSaidIt";

export const metadata = {
  title: "Who said it?",
  description:
    "Paste a line that goes round under a Father's name. Purify looks for it in every public-domain text it carries word for word, and shows where it stands, or says plainly that it cannot be found.",
};

// "Who said it" (1.8). It reads no cookie and no session, so it prerenders
// for the website and the apps' static export; the search itself is asked of
// purifyapp.net (app/api/quotes/find).
export default function WhoSaidItPage() {
  return <WhoSaidIt />;
}
