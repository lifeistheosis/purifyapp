import { notFound } from "next/navigation";

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
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1 className="font-display-serif text-heading text-paper">Support</h1>
        <p className="mt-1 font-sans text-detail text-paper/60">
          Customer support tickets. Replies email the customer; status keeps
          the queue honest.
        </p>
        <div className="mt-6">
          <SupportConsole initial={tickets} />
        </div>
      </div>
    </section>
  );
}
