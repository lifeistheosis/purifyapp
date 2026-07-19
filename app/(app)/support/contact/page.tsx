import type { Metadata } from "next";

import { ContactForm } from "@/components/support/ContactForm";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/components/i18n/T";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact support",
  description:
    "Get help with an order or a question. We reply by email and give you a ticket number to track it.",
};

export default async function ContactSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-12 md:px-8 md:pt-16">
      <header className="text-center">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          <T k="nav.support" />
        </p>
        <h1 className="mt-3 font-display-serif text-heading md:text-display-sm text-paper">
          <T k="ui.howCanWeHelp" />
        </h1>
        <p className="mx-auto mt-4 max-w-[520px] font-serif text-body text-paper/70 leading-[1.65]">
          <T k="ui.sendUsAMessageAnd" />
        </p>
      </header>
      <div className="mt-10">
        <ContactForm defaultEmail={user?.email ?? ""} />
      </div>
    </div>
  );
}
