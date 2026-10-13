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
      <section className="bg-night min-h-screen px-5 py-6 md:px-8 md:py-16">
        <article className="mx-auto w-full max-w-[720px]">
          {/* Desktop only. On a phone the bar above already says Settings, and
              this said it again in large letters over a sentence, a screen of
              words before the first setting. */}
          <header className="mb-10 hidden md:block native-md-hidden">
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
          {/* Its own box, so the first group is the first child of something
              and sits at the top on a phone, where the header is not drawn. */}
          <div>
            <SettingsClient />
          </div>
        </article>
      </section>
    </>
  );
}
