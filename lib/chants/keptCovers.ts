/**
 * A chant's cover, kept for the rest of the visit once it has been shown
 * (1.8, the owner's note 58: "when you click the back button on the chant,
 * it is buggy").
 *
 * The apps' shells answer every file of the bundle with "Cache-Control:
 * no-cache" (Capacitor's WebViewLocalServer on Android, WebViewAssetHandler
 * on the iPhone), so a picture drawn by a new <img> is asked for again even
 * when the screen before showed it a moment ago, and until the answer is in
 * and decoded its box is empty. Walked frame by frame on the 1.8 export on
 * 2026-10-31: Chants came back from a chant with the featured cover's box
 * empty for about 90 ms at full speed and 170 ms with the processor slowed
 * four times, and then the icon popped in.
 *
 * So once a cover has arrived, its bytes are asked for once more and kept as
 * a data address, with a picture made from it held, which keeps it at hand.
 * An <img> given that address asks nothing of anyone and has its picture at
 * once; decoded with the page (decoding="sync") it is in the first frame the
 * reader sees (components/chants/ChantCover.tsx).
 *
 * A handful of files of about 100 KB (every chant's cover is in
 * public/audio/art), so a visit keeps them all, up to MAX_KEPT. Nothing is
 * kept on the server, so the website's first page is drawn the same way on
 * the server and on the device.
 */

/** More covers than the library has; past this a cover simply arrives again. */
export const MAX_KEPT = 12;

const kept = new Map<string, string>();
const asking = new Set<string>();
/** Pictures made from the kept copies, held so each stays at hand. */
const held: HTMLImageElement[] = [];

/** The kept copy of a cover already shown in this visit, or null. */
export function keptCover(src: string): string | null {
  return kept.get(src) ?? null;
}

/** A picture's bytes as a data address. */
export async function dataAddress(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
}

/**
 * Keep a cover that has just arrived: once for each address, and never an
 * error. A cover that cannot be asked for again (no signal, a website a
 * deploy behind) is not kept, and arrives the ordinary way the next time.
 */
export function keepCover(src: string): Promise<void> {
  if (typeof window === "undefined" || kept.has(src) || asking.has(src) || kept.size >= MAX_KEPT) return Promise.resolve();
  asking.add(src);
  return fetch(src, { credentials: "omit" })
    .then((r) => (r.ok ? r.blob() : null))
    .then(async (blob) => {
      if (!blob || !blob.type.startsWith("image/")) return;
      const address = await dataAddress(blob);
      if (typeof Image !== "undefined") {
        const picture = new Image();
        picture.src = address;
        await picture.decode().catch(() => {});
        held.push(picture);
      }
      kept.set(src, address);
    })
    .catch(() => {})
    .finally(() => {
      asking.delete(src);
    });
}

/** Test seam. */
export function resetKeptCoversForTests(): void {
  kept.clear();
  asking.clear();
  held.length = 0;
}
