"use client";

// Small async-data hook for the client shop pages. The shop is an ONLINE
// section inside the local-first shell: every surface fetches live (catalog via
// the /api/shop/catalog routes, user data via the Supabase client), so each
// page needs a uniform loading / error(+retry) / data cycle. Mirrors the shape
// the account pages use, factored out so the ~dozen shop pages don't each
// re-implement it.

import { useEffect, useState } from "react";

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  /**
   * What is already known, without asking: the last answer this visit, if
   * there was one (lib/shop/catalogClient.ts, `peek*`). A page that has it
   * paints from it at once and asks again behind it, so coming back to the
   * shop is the shop and not its skeleton. It returns null on a page load
   * (nothing is in memory yet), which is also the server's answer, so the
   * first render always matches.
   */
  peek?: () => T | null,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>(() => {
    const known = peek?.() ?? null;
    return { data: known, error: null, loading: known === null };
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (e: unknown) => {
        if (!cancelled) {
          // What is on screen stays on screen when asking again fails: a
          // dropped connection must not replace a shop the reader is looking
          // at with an error. Only a page with nothing to show says so.
          setState((prev) =>
            prev.data !== null
              ? { data: prev.data, error: null, loading: false }
              : {
                  data: null,
                  error: e instanceof Error ? e.message : "Something went wrong.",
                  loading: false,
                },
          );
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  // Reset to a loading state from the event handler (not the effect, which
  // React discourages) and re-run the fetch. Deps-driven refetches keep the
  // previous data on screen (stale-while-revalidate); an explicit retry shows
  // the loading state again.
  const reload = () => {
    setState((s) => ({ data: s.data, error: null, loading: true }));
    setNonce((n) => n + 1);
  };

  return { ...state, reload };
}
