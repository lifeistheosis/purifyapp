import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Settings",
  description:
    "Reading palette, font and size, the interlinear default, the calendar reckoning, and the language Purify speaks to you in.",
};

/**
 * Server shell only. Everything on this page is a preference held on the
 * device, so the body is a client component: under `output: "export"` a
 * server component has no localStorage to read and would render the
 * defaults into the APK for everyone.
 *
 * Deliberately NOT inside the (signed) group. These preferences never
 * needed an account; they were merely fenced behind one.
 */
export default function SettingsPage() {
  return (
    <>
      <MobileTopBar titleKey="settings.title" back="/account" />
      <section className="bg-night min-h-screen px-5 py-10 md:px-8 md:py-16">
        <article className="mx-auto w-full max-w-[720px]">
          <header className="mb-10">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/85">
              <T k="settings.eyebrow" />
            </p>
            <h1 className="mt-2 font-display-serif text-heading text-paper leading-[1.05]">
              <T k="settings.title" />
            </h1>
            <p className="mt-3 font-serif italic text-ui text-paper/70 leading-[1.6]">
              <T k="settings.subtitle" />
            </p>
          </header>
          <SettingsClient />
        </article>
      </section>
    </>
  );
}
