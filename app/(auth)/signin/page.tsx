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
  // Android static export can't read searchParams (would force dynamic); the
  // ?next/?error params are read client-side there. Website unchanged.
  const { next, error } = (process.env.BUILD_TARGET === "android"
    ? {}
    : await searchParams) as { next?: string; error?: string };
  const friendly = error ? friendlyError(error) : null;
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        Welcome back
      </h1>
      <p className="font-serif text-ui text-paper/75 mb-7">
        Sign in to pick up where you left off.
      </p>
      {friendly ? (
        <div
          role="alert"
          className="mb-5 rounded-md border border-crimson/45 bg-crimson/[0.08] px-4 py-3"
        >
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-crimson-soft mb-1">
            Sign-in failed
          </p>
          <p className="font-sans text-detail text-paper/85 leading-[1.55]">
            {friendly}
          </p>
        </div>
      ) : null}
      <SignInForm next={next} />
    </div>
  );
}

function friendlyError(raw: string): string {
  if (/identity is already linked/i.test(raw) || /identity_already_exists/i.test(raw)) {
    return "That Google account is already linked to a Purify account. Click \"Continue with Google\" below to sign in with it.";
  }
  if (/access[_ ]denied/i.test(raw) || /user denied/i.test(raw)) {
    return "You declined the provider's consent prompt. Try again, or use email and password.";
  }
  if (/redirect_uri/i.test(raw) || /redirect uri/i.test(raw)) {
    return "Sign-in completed but the redirect URL wasn't recognized. The site maintainer needs to add this app's callback URL to the Supabase allowlist.";
  }
  return raw;
}
