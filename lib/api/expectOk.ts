"use client";

// "Did the server actually do it?"
//
// `res.ok` is not an answer to that question inside the native shell. The
// Android app is a static export served from https://localhost with app/api
// stashed out of the tree, so a request to an API path can be answered by the
// shell itself with the SPA fallback: HTTP 200, an HTML body, and `res.ok`
// true. A caller that trusts `res.ok` then reports success for an action the
// server never saw.
//
// That is not a hypothetical. `components/profile/ProfileDevices.tsx` printed
// "Signed out of all other devices" on exactly that path, and the account
// deletion control was a plain form POST that could not report anything at
// all.
//
// For a destructive or security-relevant action the bar is higher: success is
// asserted only from a parsed JSON body that explicitly says so. Anything
// else, a non-JSON body, a JSON body without `ok: true`, a network failure,
// is a failure the caller must surface.

/** Thrown when the server did not clearly confirm the action. */
export class NotConfirmedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotConfirmedError";
  }
}

/**
 * Resolve only when the response is a JSON body containing `ok: true`.
 * Throws NotConfirmedError otherwise. Never returns a boolean, because a
 * boolean invites `if (ok)` with no else branch.
 */
export async function expectOk(res: Response): Promise<void> {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    // The SPA-fallback case: a 200 carrying HTML. Reported as not-confirmed
    // rather than as a success, which is the whole point of this module.
    throw new NotConfirmedError(
      res.ok
        ? "The server did not confirm this action."
        : `Request failed (${res.status}).`,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new NotConfirmedError("The server did not confirm this action.");
  }

  const record = (body ?? {}) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof record.error === "string"
        ? record.error
        : `Request failed (${res.status}).`;
    throw new NotConfirmedError(message);
  }
  if (record.ok !== true) {
    throw new NotConfirmedError("The server did not confirm this action.");
  }
}
