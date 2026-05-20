"use client";

import { useRef, useState } from "react";

/**
 * Export, import, and force-sync of the user's local-and-server data.
 *
 * Export: every `purify:*` localStorage entry gets bundled into a JSON
 * download. No server round-trip; this is the local source of truth.
 *
 * Import: read a previously exported file and merge entries into
 * localStorage, dispatching the change events the rest of the app
 * listens to so the UI updates without a reload.
 *
 * Force sync: when signed in, push every local item up to Supabase and
 * pull any new server items back down. Best-effort. (Sync happens
 * automatically on every mutation while signed in; this is for when the
 * user wants the comfort of a manual prod.)
 */
export function ProfileData({ signedIn }: { signedIn: boolean }) {
  const [busy, setBusy] = useState<"idle" | "export" | "import" | "sync">(
    "idle",
  );
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function snapshot(): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (!k.startsWith("purify:")) continue;
      const v = window.localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
    return out;
  }

  function doExport() {
    setBusy("export");
    setMsg("");
    try {
      const data = {
        kind: "purify-export",
        version: 1,
        exportedAt: new Date().toISOString(),
        entries: snapshot(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `purify-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${Object.keys(data.entries).length} entries.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Export failed.");
    }
    setBusy("idle");
  }

  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("import");
    setMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const data = JSON.parse(text);
        if (data?.kind !== "purify-export" || typeof data.entries !== "object") {
          throw new Error("Not a Purify export file.");
        }
        let n = 0;
        for (const [k, v] of Object.entries<string>(data.entries)) {
          if (!k.startsWith("purify:")) continue;
          window.localStorage.setItem(k, v);
          n++;
        }
        // Nudge listeners so counters and lists refresh.
        window.dispatchEvent(new CustomEvent("purify:bookmark"));
        window.dispatchEvent(new CustomEvent("purify:annotation"));
        setMsg(`Imported ${n} entries. Reload pages to see updates.`);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Import failed.");
      }
      setBusy("idle");
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.onerror = () => {
      setMsg("Couldn't read the file.");
      setBusy("idle");
    };
    reader.readAsText(file);
  }

  async function doSync() {
    setBusy("sync");
    setMsg("");
    try {
      // The sync modules push on every mutation, so a force-sync just
      // means: re-emit every locally-known item plus pull from server.
      // We delegate to the same hooks the rest of the app uses.
      const { syncBookmarks } = await import("@/lib/sync/bookmarks");
      const { syncAnnotations } = await import("@/lib/sync/annotations");
      await Promise.all([syncBookmarks(), syncAnnotations()]);
      setMsg("Synced.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Sync failed.");
    }
    setBusy("idle");
  }

  return (
    <section className="mt-10 rounded-lg border border-paper/12 bg-paper/[0.02] p-6 md:p-7">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
        Your data
      </p>
      <p className="font-sans text-[13.5px] text-paper/65 leading-[1.55] mb-5 max-w-[560px]">
        Take what you&rsquo;ve made with you. Export downloads a JSON file
        with every Purify entry on this device; import merges one back in.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={doExport}
          disabled={busy !== "idle"}
          className="font-sans text-[13px] font-medium bg-paper text-night rounded-pill px-4 py-2 hover:bg-paper/90 disabled:opacity-60 transition-colors"
        >
          {busy === "export" ? "Exporting…" : "Export"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== "idle"}
          className="font-sans text-[13px] font-medium border border-paper/25 text-paper rounded-pill px-4 py-2 hover:bg-paper/10 disabled:opacity-60 transition-colors"
        >
          {busy === "import" ? "Importing…" : "Import…"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={doImport}
          className="hidden"
        />
        {signedIn && (
          <button
            type="button"
            onClick={doSync}
            disabled={busy !== "idle"}
            className="font-sans text-[13px] font-medium border border-gold/40 text-gold rounded-pill px-4 py-2 hover:bg-gold/10 disabled:opacity-60 transition-colors"
          >
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
        )}
        {msg && (
          <p className="font-sans text-[13px] text-paper/65 leading-[1.55]">
            {msg}
          </p>
        )}
      </div>
    </section>
  );
}
