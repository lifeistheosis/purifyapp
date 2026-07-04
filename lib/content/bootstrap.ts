// Native startup for the local-first app.
//
// On a cold start the native shell calls initLocalContent(): open the on-device
// SQLite store, ensure the schema, import the bundled starter package on first
// run, migrate any existing beta localStorage data, and hand back a repository
// + sync queue. After this returns, every screen reads content locally — so the
// app renders navigation and core content with no network (airplane mode).
//
// The core (initLocalContent) is dependency-injected so it runs under
// node:sqlite in tests; initNativeLocalContent wires the device store, the
// bundled package fetch, and the browser localStorage scanner.

import {
  ensureSchema,
  importPackage,
  installedContentVersion,
  type ContentPackage,
} from "./manifest";
import { ContentRepository } from "./repository";
import { SyncQueue } from "./syncQueue";
import { migrateUserData, migrationDone, type MigrationResult } from "./migration";
import { scanBrowserBetaData } from "./betaImport";
import type { ContentStore } from "./storage/types";

export type BootstrapDeps = {
  store: ContentStore;
  /** Load the package bundled in the APK (null skips first-run import). */
  loadStarterPackage: () => Promise<ContentPackage | null>;
  /** Existing-install user data to migrate once. */
  betaData?: () => import("./migration").MigratedRecord[];
  now?: () => number;
};

export type LocalContent = {
  store: ContentStore;
  repo: ContentRepository;
  queue: SyncQueue;
  /** Installed content version after bootstrap (null only if no package). */
  contentVersion: string | null;
  /** First-run import happened this boot. */
  firstRun: boolean;
  migration: MigrationResult | null;
};

export async function initLocalContent(
  deps: BootstrapDeps,
): Promise<LocalContent> {
  const { store } = deps;
  await ensureSchema(store);

  // First run: no content version yet → import the bundled starter package.
  let contentVersion = await installedContentVersion(store);
  let firstRun = false;
  if (!contentVersion) {
    const pkg = await deps.loadStarterPackage();
    if (pkg) {
      contentVersion = await importPackage(store, pkg);
      firstRun = true;
    }
  }

  const queue = new SyncQueue(store, deps.now);

  // One-time migration of an existing beta install's local data.
  let migration: MigrationResult | null = null;
  if (deps.betaData && !(await migrationDone(store))) {
    migration = await migrateUserData(store, deps.betaData());
  }

  return {
    store,
    repo: new ContentRepository(store),
    queue,
    contentVersion,
    firstRun,
    migration,
  };
}

/**
 * Device entry point. No-op (returns null) off the native shell so the website
 * is untouched. Lazy-imports the Capacitor store + fetches the bundled package
 * from the locally served webDir (works offline — it's in the APK).
 */
export async function initNativeLocalContent(): Promise<LocalContent | null> {
  const { isNativeClient } = await import("@/lib/platform/native");
  if (!isNativeClient()) return null;

  const { openCapacitorStore } = await import("./storage/capacitorStore");
  const store = await openCapacitorStore();

  return initLocalContent({
    store,
    loadStarterPackage: async () => {
      try {
        // Bundled at /content/content-package.json by the Android export build;
        // served locally by Capacitor, so the fetch succeeds offline.
        const res = await fetch("/content/content-package.json");
        if (!res.ok) return null;
        return (await res.json()) as ContentPackage;
      } catch {
        return null;
      }
    },
    betaData: scanBrowserBetaData,
  });
}
