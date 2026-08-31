import { SignInForm } from "@/components/auth/SignInForm";
import { T } from "@/components/i18n/T";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

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
  // The native static export can't read searchParams (would force dynamic); the
  // ?next/?error params are read client-side there. Website unchanged.
  const { next, error } = (IS_STATIC_EXPORT ? {} : await searchParams) as {
    next?: string;
    error?: string;
  };
  const friendlyKey = error ? friendlyErrorKey(error) : null;
  return (
    <div>
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        <T k="ui.welcomeBack" />
      </h1>
      <p className="font-serif text-ui text-paper/75 mb-7">
        <T k="ui.signInToPickUp" />
      </p>
      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-md border border-crimson/45 bg-crimson/[0.08] px-4 py-3"
        >
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-crimson-soft mb-1">
            <T k="ui.signInFailed" />
          </p>
          <p className="font-sans text-detail text-paper/85 leading-[1.55]">
            {friendlyKey ? <T k={friendlyKey} /> : error}
          </p>
        </div>
      ) : null}
      <SignInForm next={next} />
    </div>
  );
}

function friendlyErrorKey(raw: string): string | null {
  if (/identity is already linked/i.test(raw) || /identity_already_exists/i.test(raw)) {
    return "ui.oauthIdentityAlreadyLinked";
  }
  if (/access[_ ]denied/i.test(raw) || /user denied/i.test(raw)) {
    return "ui.oauthAccessDenied";
  }
  if (/redirect_uri/i.test(raw) || /redirect uri/i.test(raw)) {
    return "ui.oauthRedirectUriUnrecognized";
  }
  return null;
}
