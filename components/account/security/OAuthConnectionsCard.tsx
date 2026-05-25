"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "apple";

type Identity = {
  id?: string;
  identity_id?: string;
  provider?: string;
};

/**
 * Lists which OAuth identities are linked to the current user.
 * Lets the user connect or disconnect each (Google, Apple).
 *
 * Reads `user.identities` on mount; refreshes after any change.
 */
export function OAuthConnectionsCard() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIdentities((user?.identities ?? []) as Identity[]);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const linked = (p: Provider) =>
    identities.find((i) => i.provider === p) ?? null;

  async function connect(p: Provider) {
    setPending(p);
    setError(null);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.linkIdentity({
        provider: p,
        options: {
          redirectTo: `${origin}/api/auth/callback?next=/account/security`,
        },
      });
      if (err) throw err;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : `Couldn't connect ${p}.`,
      );
      setPending(null);
    }
  }

  async function disconnect(p: Provider) {
    const ident = linked(p);
    if (!ident) return;
    setPending(p);
    setError(null);
    try {
      const supabase = createClient();
      // Supabase types: identities[].identity_id is the canonical id
      // newer SDKs expose; some return `id`. Pass the whole object.
      const { error: err } = await supabase.auth.unlinkIdentity(
        ident as Parameters<typeof supabase.auth.unlinkIdentity>[0],
      );
      if (err) throw err;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Couldn't disconnect ${p}.`);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-[16px] font-semibold text-paper mb-1">
        Connected accounts
      </h2>
      <p className="font-sans text-[13px] text-paper/60 mb-5 leading-[1.55]">
        Sign in faster by linking Google or Apple. You can still sign in
        with email + password at any time.
      </p>
      <ul className="flex flex-col gap-3 max-w-[480px]">
        {(["google", "apple"] as const).map((p) => {
          const ident = linked(p);
          const label = p === "google" ? "Google" : "Apple";
          return (
            <li
              key={p}
              className="flex items-center justify-between gap-4 rounded-md border border-paper/10 bg-paper/[0.02] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-sans text-[13.5px] font-medium text-paper">
                  {label}
                </p>
                <p className="font-sans text-[12px] text-paper/55">
                  {ident ? "Connected" : "Not connected"}
                </p>
              </div>
              {ident ? (
                <button
                  type="button"
                  onClick={() => disconnect(p)}
                  disabled={pending !== null}
                  className="font-sans text-[12.5px] text-paper/70 hover:text-paper disabled:opacity-50"
                >
                  {pending === p ? "Working…" : "Disconnect"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => connect(p)}
                  disabled={pending !== null}
                  className="font-sans text-[12.5px] font-semibold rounded-pill bg-paper text-night px-4 py-1.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
                >
                  {pending === p ? "Opening…" : "Connect"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-3 font-sans text-[13px] text-[#f8cac7]">{error}</p>
      ) : null}
    </section>
  );
}
