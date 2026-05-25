import { ResetForm } from "@/components/auth/ResetForm";

export const metadata = {
  title: "Set a new password",
};

export default function ResetPage() {
  return (
    <div>
      <h1 className="font-sans text-[28px] font-bold text-paper leading-tight mb-2">
        Set a new password
      </h1>
      <p className="font-serif text-[15px] text-paper/75 mb-7">
        Choose something you&rsquo;ll remember. At least eight
        characters; mixed case and a number make it sturdier.
      </p>
      <ResetForm />
    </div>
  );
}
