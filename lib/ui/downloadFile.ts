// A file downloaded in a browser: a link to its bytes, clicked, and let go a
// minute later (1.9).
//
// Not let go at once. Safari begins the download after the click has
// returned, so a link revoked straight after the click is gone by then and
// the download fails with nothing said. FileSaver.js waits 40 seconds for the
// same reason, and the share sheet's own fallback (lib/share/shareImage.ts)
// already waited 60. Found 2026-11-07 reading Export your library over: it,
// the profile's data export and the admin's CSVs all let go at once, so on a
// Mac or an iPhone's Safari the website's way to take one's library away
// could do nothing at all.

/** How long the link to a downloaded file is kept before it is let go. */
export const KEEP_LINK_MS = 60_000;

/** Download `blob` as `fileName`. Whether the click could be made. */
export function downloadFile(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), KEEP_LINK_MS);
    return true;
  } catch {
    return false;
  }
}
