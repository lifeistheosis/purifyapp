import { SignUpForm } from "@/components/auth/SignUpForm";
import { T } from "@/components/i18n/T";
import { LegalLink } from "@/components/legal/LegalLink";

export const metadata = {
  title: "Create an account",
  description: "Create a Purify account to sync your highlights, notes, and prayer streak across devices.",
};

export default function SignUpPage() {
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        <T k="ui.createAnAccount" />
      </h1>
      <p className="font-serif text-ui text-paper/75 mb-7">
        <T k="signup.lead" />
      </p>
      <SignUpForm />
      <p className="mt-6 font-sans text-caption text-paper/45 leading-[1.6]">
        <T k="ui.byCreatingAnAccountYou" />{" "}
        <LegalLink doc="terms" className="text-paper/70 underline underline-offset-2 decoration-paper/30 hover:text-paper">
          <T k="ui.termsOfService" />
        </LegalLink>{" "}
        <T k="ui.andThe" />{" "}
        <LegalLink doc="privacy" className="text-paper/70 underline underline-offset-2 decoration-paper/30 hover:text-paper">
          <T k="ui.privacyPolicy" />
        </LegalLink>
        .
      </p>
    </div>
  );
}
