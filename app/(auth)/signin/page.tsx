import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Purify account.",
};

type Search = Promise<{ next?: string; error?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { next, error } = await searchParams;
  return (
    <div>
      <h1 className="font-sans text-[28px] font-bold text-paper leading-tight mb-2">
        Welcome back
      </h1>
      <p className="font-serif text-[15px] text-paper/75 mb-7">
        Sign in to pick up where you left off.
      </p>
      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-md border border-[#c1272d]/45 bg-[#c1272d]/[0.08] px-4 py-3"
        >
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-[#f8cac7] mb-1">
            Sign-in failed
          </p>
          <p className="font-sans text-[13.5px] text-paper/85 leading-[1.55]">
            {error}
          </p>
        </div>
      ) : null}
      <SignInForm next={next} />
    </div>
  );
}
