/**
 * Readers' own words, split into plain text and runs of emoji and symbols.
 *
 * The runs are drawn by the device's own fonts (SymbolText, `.font-symbols`
 * in app/globals.css). Lora and the Noto fallbacks behind it each publish a
 * "symbols" subset whose unicode-range covers characters like ✨ and ●, so
 * one of them in a post made the browser fetch extra font files while a
 * profile was opening, then lay out every line of the page again when each
 * arrived; and an emoji looked up through that long stack was the slowest
 * text on the page to shape. Measured 2026-10-02 on @purify's profile at a
 * 4x slowed CPU: two font downloads and 117 ms of shaping in one frame.
 */

export type TextRun = { text: string; symbol: boolean };

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
/** Anything that might be a symbol at all; most text has nothing here. */
const ANY_HIGH = /[←-￿]|[\u{10000}-\u{10FFFF}]/u;

/** A character the device's fonts should draw. Nothing below the arrows, so ©, ™ and the dashes stay in the text face. */
export function isSymbol(cp: number, ch: string): boolean {
  if (cp < 0x2190) return false;
  if (cp <= 0x21ff) return true; // arrows
  if (cp >= 0x2300 && cp <= 0x23ff) return true; // technical: ⌚ ⏳
  if (cp >= 0x2460 && cp <= 0x24ff) return true; // enclosed: ①
  if (cp >= 0x25a0 && cp <= 0x27bf) return true; // shapes, symbols, dingbats: ● ☦ ✨ ✝
  if (cp >= 0x2900 && cp <= 0x297f) return true; // more arrows
  if (cp >= 0x2b00 && cp <= 0x2bff) return true; // ⭐ ⬆
  if (cp >= 0x1f000 && cp <= 0x1faff) return true; // emoji
  return PICTOGRAPHIC.test(ch);
}

/** What binds to the symbol before it: joiners, presentation selectors, skin tones, keycaps, flags' tags. */
function binds(cp: number): boolean {
  return (
    cp === 0x200d ||
    cp === 0xfe0e ||
    cp === 0xfe0f ||
    cp === 0x20e3 ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
    (cp >= 0xe0020 && cp <= 0xe007f)
  );
}

export function symbolRuns(text: string): TextRun[] {
  if (!text || !ANY_HIGH.test(text)) return [{ text, symbol: false }];
  const out: TextRun[] = [];
  let buf = "";
  let inSymbol = false;
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    const here: boolean = isSymbol(cp, ch) || (inSymbol && binds(cp));
    if (here !== inSymbol && buf) {
      out.push({ text: buf, symbol: inSymbol });
      buf = "";
    }
    inSymbol = here;
    buf += ch;
  }
  if (buf) out.push({ text: buf, symbol: inSymbol });
  return out;
}
