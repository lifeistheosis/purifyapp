import { notFound } from "next/navigation";

import { SectionHead } from "@/components/admin/hero";
import { SupportConsole } from "@/components/admin/SupportConsole";
import { getAdminUser } from "@/lib/admin/access";
import { listTickets } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

export default async function AdminSupportPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const tickets = await listTickets();

  return (
    // .adm, so this page is the panel and not a reader page that happens to
    // sit under /admin. The console inside it is the same one the Messages tab
    // shows, and it is built on the panel's tokens (its Select, its status
    // marks), which exist only inside .adm: without the class here those had
    // no values at all. The ticket emails link straight to this page, so it
    // is the first screen of the panel some replies start from.
    <section className="adm adm-page min-h-[100dvh] px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[1200px]">
        <SectionHead
          title="Support"
          sub="Customer support tickets. Replies email the customer; status keeps the queue honest."
        />
        <div className="mt-6">
          <SupportConsole initial={tickets} />
        </div>
      </div>
    </section>
  );
}
