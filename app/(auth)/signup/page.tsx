import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = {
  title: "Create an account",
  description: "Create a Purify account to sync your highlights, notes, and prayer streak across devices.",
};

export default function SignUpPage() {
  return (
    <div>
      <h1 className="font-sans text-[28px] font-bold text-paper leading-tight mb-2">
        Create an account
      </h1>
      <p className="font-serif text-[15px] text-paper/75 mb-7">
        Sync your highlights, notes, bookmarks, and prayer streak
        across devices. Free, ad-free, deletable any time.
      </p>
      <SignUpForm />
    </div>
  );
}
