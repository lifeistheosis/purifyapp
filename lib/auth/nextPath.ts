// Where the sign-in screen sends a reader once they are in.
//
// The page is handed `?next=` by whoever sent the reader there: Settings
// (`/signin?next=/settings`), and from 1.8 the reminders step of the welcome
// questions (`/signin?next=/`), which asks for an account because reminders
// are kept with one. On the website the server reads it and passes it down.
// In the apps it never arrived: the export cannot read a query on the server
// (app/(auth)/signin/page.tsx), so every sign-in in the apps went to Profile,
// and a reader sent from the reminders was not brought back to them.
//
// Only a path on this site is taken: one leading slash, never two (another
// site), nor a backslash after it, nor a line break.

/** The default when nothing usable was asked for. */
export const SIGNED_IN_HOME = "/account/profile";

export function isSitePath(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length <= 512 &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    !/[\r\n\0]/.test(value)
  );
}

/**
 * The page's `next`, or else the address's own `?next=` (read on the device,
 * which is the only place the apps have it), or else Profile.
 */
export function nextPath(given: string | null | undefined, search: string | null | undefined): string {
  if (isSitePath(given)) return given;
  try {
    const fromAddress = new URLSearchParams(search ?? "").get("next");
    if (isSitePath(fromAddress)) return fromAddress;
  } catch {
    /* an address that cannot be read asks for nothing */
  }
  return SIGNED_IN_HOME;
}

/**
 * A link to `path` that carries the reader's way on. The sign-in and sign-up
 * screens point at each other, and the link between them used to drop
 * `next`: someone sent to sign in from the gift page (/gift, the QR on the
 * EIKON card) who chose "Create an account" ended up on Profile, and the gift
 * was lost until they scanned the card again. The default asks for nothing,
 * so it is left off.
 */
export function withNext(path: string, target: string): string {
  return isSitePath(target) && target !== SIGNED_IN_HOME
    ? `${path}?next=${encodeURIComponent(target)}`
    : path;
}

/**
 * Whether the address names somewhere to be once the account exists, other
 * than home and Profile: the gift page, Settings. On the mobile website the
 * welcome questions open over sign-up (components/onboarding/FirstRunGate.tsx);
 * a reader on their way somewhere gets there first, and the questions wait
 * for home, as they already do for anyone who arrives on a deep link.
 */
export function headedSomewhere(search: string | null | undefined): boolean {
  const to = nextPath(undefined, search);
  return to !== SIGNED_IN_HOME && to !== "/";
}
