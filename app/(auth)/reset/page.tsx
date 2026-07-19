import { ResetForm } from "@/components/auth/ResetForm";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Set a new password",
};

export default function ResetPage() {
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        <T k="ui.setANewPassword" />
      </h1>
      <p className="font-serif text-ui text-paper/75 mb-7">
        <T k="ui.chooseSomethingYouLlRemember" />
      </p>
      <ResetForm />
    </div>
  );
}
