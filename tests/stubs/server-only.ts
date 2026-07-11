// Vitest stand-in for the `server-only` marker import. Next.js provides the
// real module (a build-time poison pill for client bundles); under Vitest it
// isn't installed and carries no runtime behavior, so an empty module is the
// faithful substitute. Wired up in vitest.config.ts resolve.alias.
export {};
