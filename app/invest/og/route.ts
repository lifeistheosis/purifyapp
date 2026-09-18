import { readFile } from "node:fs/promises";
import path from "node:path";

// The link-preview image for /invest (its og:image). Kept beside the page, not
// in public/, so it stays out of the app bundle along with the rest of
// app/invest.
export const dynamic = "force-static";

export async function GET() {
  const png = await readFile(
    path.join(process.cwd(), "app", "invest", "og", "og.png"),
  );
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
