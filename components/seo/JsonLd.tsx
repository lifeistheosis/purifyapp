import type { JsonLd as JsonLdPayload } from "@/lib/seo/jsonld";

/**
 * Renders a JSON-LD payload into the document.
 *
 * Server component, so the script tag is present in the initial HTML. A
 * crawler that never runs JavaScript still sees it, which is the entire
 * point.
 *
 * `<` is escaped so a stray "</script>" inside quoted patristic text can
 * never terminate the block early.
 */
export function JsonLd({ data }: { data: JsonLdPayload }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
