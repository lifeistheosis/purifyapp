// Reading order from djvu word coordinates, for scans set in two columns.
//
// ── Why this exists ─────────────────────────────────────────────────────
//
// archive.org's plain `_djvu.txt` has no coordinates, so on a two-column page
// it interleaves the columns and the result is unusable. That is not a
// theoretical worry: ingesting the Hapgood Service Book, the single-column
// pre-Communion prayers came out clean at a median line length of 69
// characters, and Great Vespers came out at 27 with under 5% of lines over 55,
// because it is set in two narrow columns and every other line came from the
// wrong one.
//
// Text spliced from adjacent columns still READS like liturgical English. It
// would have passed a casual look and been shipped as verbatim. So services
// are extracted from `_djvu.xml`, which carries a box per word, and the
// reading order is reconstructed from geometry rather than guessed.
//
// ── The algorithm, and the case that shaped it ──────────────────────────
//
// Per page: find the gutter (the x in the middle third crossed by the fewest
// lines), classify each line as LEFT, RIGHT or FULL-width, then cut the page
// into bands at every full-width line and read each band left column first.
//
// The banding is not decoration. Page 40 of that volume is single column down
// to the heading "Psalm civ." and two columns below it. Treating a page as
// uniformly one or the other gets that page wrong either way.
//
// A page is only treated as two-column when few lines cross the gutter AND
// both sides are populated. A wide single-column page has lines crossing the
// middle constantly, which is exactly the signal that says "leave it alone".

/** @typedef {{ x1:number, x2:number, y:number, text:string }} Line */

/** The x in the middle third crossed by the fewest lines. */
export function findGutter(lines, pageWidth) {
  const lo = Math.floor(pageWidth * 0.33);
  const hi = Math.floor(pageWidth * 0.67);
  let best = null;
  let bestN = Infinity;
  for (let x = lo; x < hi; x += 6) {
    let n = 0;
    for (const l of lines) if (l.x1 < x && x < l.x2) n++;
    if (n < bestN) {
      bestN = n;
      best = x;
    }
  }
  return { gutter: best, crossings: bestN };
}

const byY = (a, b) => a.y - b.y;

/**
 * Order one horizontal band, which is either one column or two.
 *
 * Deciding this PER BAND rather than per page is the whole trick, and an
 * earlier version got it wrong by deciding per page. Page 40 of the Hapgood
 * scan runs full width for about twenty lines and then splits into two
 * columns. Judged as a whole, more than 15% of its lines cross the gutter, so
 * the page was called single-column and the psalm below stayed interleaved
 * with the rubric beside it. Judged band by band, the top is one column and
 * the bottom is two, which is what the page actually is.
 */
function orderBand(lines, pageWidth) {
  if (lines.length < 4) return [...lines].sort(byY).map((l) => l.text);
  const { gutter, crossings } = findGutter(lines, pageWidth);
  const left = lines.filter((l) => l.x2 <= gutter);
  const right = lines.filter((l) => l.x1 >= gutter);
  if (crossings > Math.max(1, lines.length * 0.1) || !left.length || !right.length) {
    return [...lines].sort(byY).map((l) => l.text);
  }
  return [
    ...left.sort(byY).map((l) => l.text),
    ...right.sort(byY).map((l) => l.text),
  ];
}

/**
 * Lines in true reading order.
 * Returns the text of each line, columns resolved.
 */
export function readingOrder(lines, pageWidth = 1464) {
  if (lines.length < 4) return [...lines].sort(byY).map((l) => l.text);

  // A full-width line is a heading, a rubric, or ordinary prose set across the
  // measure. Any of those ends a two-column run, so they are the band edges.
  // Defined by span rather than by the gutter, because the gutter is only
  // meaningful once you already know where the columns are.
  const isFull = (l) => l.x2 - l.x1 > pageWidth * 0.55;
  const sorted = [...lines].sort(byY);

  const out = [];
  let band = [];
  for (const l of sorted) {
    if (isFull(l)) {
      if (band.length) out.push(...orderBand(band, pageWidth));
      band = [];
      out.push(l.text);
    } else {
      band.push(l);
    }
  }
  if (band.length) out.push(...orderBand(band, pageWidth));
  return out;
}

/**
 * Parse a djvu XML into pages of lines.
 *
 * Deliberately a small hand-rolled scan rather than an XML library: the file
 * is 22 MB and the shape is fixed and shallow, so a streaming regex over it is
 * both faster and one fewer dependency.
 */
export function parseDjvuXml(xml) {
  const pages = [];
  const objectRe = /<OBJECT\b[^>]*width="(\d+)"[^>]*>([\s\S]*?)<\/OBJECT>/g;
  let m;
  while ((m = objectRe.exec(xml))) {
    const width = Number(m[1]);
    const body = m[2];
    const lines = [];
    const lineRe = /<LINE>([\s\S]*?)<\/LINE>/g;
    let lm;
    while ((lm = lineRe.exec(body))) {
      const wordRe = /<WORD coords="([\d,]+)"[^>]*>([\s\S]*?)<\/WORD>/g;
      let wm;
      let x1 = Infinity;
      let x2 = -Infinity;
      let y = Infinity;
      let text = "";
      while ((wm = wordRe.exec(lm[1]))) {
        const p = wm[1].split(",").map(Number);
        x1 = Math.min(x1, p[0]);
        x2 = Math.max(x2, p[2]);
        y = Math.min(y, p[3]);
        text += wm[2];
      }
      if (text.trim()) lines.push({ x1, x2, y, text: text.trim() });
    }
    pages.push({ width, lines });
  }
  return pages;
}
