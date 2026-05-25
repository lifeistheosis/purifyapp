import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Purify account.",
};

type Search = Promise<{ next?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { next } = await searchParams;
  return (
    <div>
      <h1 className="font-sans text-[28px] font-bold text-paper leading-tight mb-2">
        Welcome back
      </h1>
      <p className="font-serif text-[15px] text-paper/75 mb-7">
        Sign in to pick up where you left off.
      </p>
      <SignInForm next={next} />
    </div>
  );
}
