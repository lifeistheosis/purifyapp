// Re-export the Open Graph card so Twitter's summary_large_image uses the
// same composition. Single source of truth in `app/opengraph-image.tsx`.
// `runtime` must be a literal in each route (Next won't read it via
// re-export), so it's declared here as well.
export const runtime = "edge";
export { default, size, contentType, alt } from "./opengraph-image";
