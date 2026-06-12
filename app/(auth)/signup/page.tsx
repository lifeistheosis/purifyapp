import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = {
  title: "Create an account",
  description: "Create a Purify account to sync your highlights, notes, and prayer streak across devices.",
};

export default function SignUpPage() {
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        Create an account
      </h1>
      <p className="font-serif text-ui text-paper/75 mb-7">
        Sync your highlights, notes, bookmarks, and prayer streak
        across devices. Free, ad-free, deletable any time.
      </p>
      <SignUpForm />
      <p className="mt-6 font-sans text-caption text-paper/45 leading-[1.6]">
        By creating an account you agree to the{" "}
        <Link
          href="/terms"
          className="text-paper/70 underline underline-offset-2 decoration-paper/30 hover:text-paper"
        >
          terms of service
        </Link>{" "}
        and the{" "}
        <Link
          href="/privacy"
          className="text-paper/70 underline underline-offset-2 decoration-paper/30 hover:text-paper"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
