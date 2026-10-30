import { CouncilShelves } from "@/components/councils/CouncilShelves";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { allShelves } from "@/lib/councils/books";
import { councilFocus } from "@/lib/councils/page";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

export const metadata = {
  title: "Councils and conciliar texts",
  description: "The creeds, canons, definitions and letters of the Ecumenical and local councils, as books in Purify's reading room.",
};

/**
 * The councils' shelves in the reading room (1.8, the owner's pick of r3-03):
 * a row of books for every council, where a council's shelf sends "See all"
 * under the other councils (components/councils/CouncilShelves.tsx).
 */
export default function CouncilShelvesPage() {
  return (
    <>
      <MobileTopBar titleKey="reading.surface.councils" back backFallback="/reading" revealTitleOn="shelves-title" />
      <CouncilShelves shelves={allShelves(IS_STATIC_EXPORT, councilFocus)} />
    </>
  );
}
