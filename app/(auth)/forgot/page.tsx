import { ForgotForm } from "@/components/auth/ForgotForm";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Forgot password",
  description: "Reset your Purify account password.",
};

export default function ForgotPage() {
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        <T k="ui.resetYourPassword" />
      </h1>
      <p className="font-serif text-ui text-paper/75 mb-7">
        <T k="ui.typeYourEmailWeLl" />
      </p>
      <ForgotForm />
    </div>
  );
}
