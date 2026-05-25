import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata = {
  title: "Forgot password",
  description: "Reset your Purify account password.",
};

export default function ForgotPage() {
  return (
    <div>
      <h1 className="font-sans text-[28px] font-bold text-paper leading-tight mb-2">
        Reset your password
      </h1>
      <p className="font-serif text-[15px] text-paper/75 mb-7">
        Type your email, we&rsquo;ll send you a link to set a new one.
      </p>
      <ForgotForm />
    </div>
  );
}
