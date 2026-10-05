// Which text a held finger is holding, in the phone apps, where the system's
// own selection is off and Purify's hold is the only way to copy. The why is
// in ../pressCopy.ts.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  BLOCK_SELECTOR,
  MIN_CHARS,
  OWN_WORDS_MIN,
  PRESS_MS,
  PRESS_SLOP_PX,
  SKIP_SELECTOR,
  blockText,
  hasDrifted,
  pressBlock,
  wordsHolder,
} from "../pressCopy";

/** A touched element: what its nearest skip ancestor and nearest block are. */
function touched({ skip = null, block = null }: { skip?: object | null; block?: { innerText?: string; textContent?: string } | null }) {
  return {
    closest: (selector: string) => (selector === SKIP_SELECTOR ? skip : selector === BLOCK_SELECTOR ? block : null),
  };
}

describe("the block a hold would copy", () => {
  it("is the paragraph under the finger", () => {
    const paragraph = { innerText: "O Lord and Master of my life, take from me the spirit of sloth." };
    expect(pressBlock(touched({ block: paragraph }))).toBe(paragraph);
  });

  it("is nothing where the text has tools of its own, or is pressed to do something", () => {
    const paragraph = { innerText: "In the beginning was the Word." };
    // A verse, a link, a button, a field, a bar: whichever it is, closest() finds it.
    expect(pressBlock(touched({ skip: {}, block: paragraph }))).toBeNull();
  });

  it("is nothing where there is no block of text", () => {
    expect(pressBlock(touched({}))).toBeNull();
  });

  it("is a prayer, which is a plain div and no paragraph at all", () => {
    const prayer = {
      ...touched({}),
      innerText: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
      childNodes: [{ nodeType: 3, textContent: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen." }],
      parentElement: null,
    };
    expect(pressBlock(prayer)).toBe(prayer);
  });

  it("finds the prayer from a word set apart inside it", () => {
    const prayer = {
      innerText: "Glory to Thee, our God, glory to Thee.",
      childNodes: [{ nodeType: 3, textContent: "Glory to " }, { nodeType: 1, textContent: "Thee" }, { nodeType: 3, textContent: ", our God, glory to Thee." }],
      parentElement: null,
    };
    const word = { ...touched({}), innerText: "Thee", childNodes: [{ nodeType: 3, textContent: "Thee" }], parentElement: prayer };
    expect(pressBlock(word)).toBe(prayer);
  });

  it("a paragraph still wins over the box it sits in", () => {
    const paragraph = { innerText: "Stand before God before the day takes you." };
    const box = {
      ...touched({ block: paragraph }),
      innerText: "Stand before God before the day takes you. And more besides.",
      childNodes: [{ nodeType: 3, textContent: "And more besides, a good deal more." }],
      parentElement: null,
    };
    expect(pressBlock(box)).toBe(paragraph);
  });

  it("a control is still left alone, whatever words it has", () => {
    const button = {
      ...touched({ skip: {} }),
      innerText: "Mark this prayer as prayed",
      childNodes: [{ nodeType: 3, textContent: "Mark this prayer as prayed" }],
      parentElement: null,
    };
    expect(pressBlock(button)).toBeNull();
  });

  it("is nothing for a label too short to be worth copying", () => {
    expect(pressBlock(touched({ block: { innerText: "x".repeat(MIN_CHARS - 1) } }))).toBeNull();
    expect(pressBlock(touched({ block: { innerText: "   \n  " } }))).toBeNull();
    expect(pressBlock(touched({ block: { innerText: "x".repeat(MIN_CHARS) } }))).not.toBeNull();
  });

  it("is nothing for a target that cannot be asked", () => {
    expect(pressBlock(null)).toBeNull();
    expect(pressBlock({} as never)).toBeNull();
  });
});

describe("what leaves a hold alone", () => {
  const skips = SKIP_SELECTOR.split(",").map((s) => s.trim());

  it("a verse and a paragraph of the Fathers, which open their own pill", () => {
    expect(skips).toContain("[data-own-press]");
    for (const file of ["components/bible/VerseRow.tsx", "components/saints/ParagraphRow.tsx"]) {
      expect(readFileSync(file, "utf8"), `${file} must mark the text that has its own hold`).toMatch(/data-own-press=""/);
    }
  });

  it("everything that is pressed to do something", () => {
    for (const s of ["a", "button", "summary", "label", "[role='button']", "[role='tab']", "[role='menuitem']", "[role='option']", "[role='switch']", "[role='slider']"]) {
      expect(skips, s).toContain(s);
    }
  });

  it("a field, which keeps the phone's own selection", () => {
    for (const s of ["input", "textarea", "select", "[contenteditable]:not([contenteditable='false'])"]) {
      expect(skips, s).toContain(s);
    }
  });

  it("a bar, and anything that opts out", () => {
    expect(skips).toContain("nav");
    expect(skips).toContain("[data-no-press]");
  });
});

describe("what counts as a block", () => {
  const blocks = BLOCK_SELECTOR.split(",").map((s) => s.trim());

  it("prose, a list item, a quotation and a heading", () => {
    for (const s of ["p", "li", "blockquote", "h1", "h2", "h3", "h4", "figcaption", "dd", "pre"]) {
      expect(blocks, s).toContain(s);
    }
  });

  it("anything marked for copying, ahead of what it sits in", () => {
    // closest() returns the NEAREST match, so the order here does not decide
    // it; the marker being a block at all is what lets a code inside a
    // paragraph be the thing that is copied.
    expect(blocks).toContain("[data-copy]");
  });

  it("not a bare div or span: those are layout, and most of them are controls", () => {
    expect(blocks).not.toContain("div");
    expect(blocks).not.toContain("span");
  });
});

describe("the element that holds the words, where no tag says so", () => {
  const text = (s: string) => ({ nodeType: 3, textContent: s });

  it("needs a dozen characters of its own: a count or a badge is not prose", () => {
    expect(wordsHolder({ childNodes: [text("x".repeat(OWN_WORDS_MIN - 1))], parentElement: null })).toBeNull();
    const enough = { childNodes: [text("x".repeat(OWN_WORDS_MIN))], parentElement: null };
    expect(wordsHolder(enough)).toBe(enough);
  });

  it("does not count words that are only inside its children", () => {
    const wrapper = { childNodes: [{ nodeType: 1, textContent: "A whole paragraph of somebody else's words." }, text("     ")], parentElement: null };
    expect(wordsHolder(wrapper)).toBeNull();
  });

  it("looks a few parents up and no further: the page is not a block", () => {
    const page = { childNodes: [text("Words that belong to the whole page, far above.")], parentElement: null };
    let el: { childNodes: unknown[]; parentElement: unknown } = page;
    for (let i = 0; i < 6; i++) el = { childNodes: [], parentElement: el };
    expect(wordsHolder(el as never)).toBeNull();
    expect(wordsHolder({ childNodes: [], parentElement: page } as never)).toBe(page);
  });

  it("is nothing for nothing", () => {
    expect(wordsHolder(null)).toBeNull();
    expect(wordsHolder({})).toBeNull();
  });
});

describe("the words of a block", () => {
  it("are what a reader would type out", () => {
    expect(blockText({ innerText: `  O Lord,${String.fromCharCode(160)}have mercy.  \n\n\n\nAmen.  \n` })).toBe("O Lord, have mercy.\n\nAmen.");
  });

  it("fall back to the raw text where nothing has been laid out", () => {
    expect(blockText({ innerText: null, textContent: " Glory to Thee. " })).toBe("Glory to Thee.");
    expect(blockText({})).toBe("");
  });
});

describe("a hold against a scroll", () => {
  it("survives a finger that only trembles", () => {
    expect(hasDrifted({ x: 100, y: 400 }, { x: 100 + PRESS_SLOP_PX, y: 400 - PRESS_SLOP_PX })).toBe(false);
  });

  it("ends when the finger travels, either way", () => {
    expect(hasDrifted({ x: 100, y: 400 }, { x: 100, y: 400 + PRESS_SLOP_PX + 1 })).toBe(true);
    expect(hasDrifted({ x: 100, y: 400 }, { x: 100 - PRESS_SLOP_PX - 1, y: 400 })).toBe(true);
  });

  it("is a little longer than the verse pill's, and well short of a second", () => {
    expect(PRESS_MS).toBeGreaterThan(400);
    expect(PRESS_MS).toBeLessThanOrEqual(600);
  });
});

describe("the apps' stylesheet", () => {
  const css = readFileSync("app/globals.css", "utf8").replace(/\r\n/g, "\n");

  it("switches the system's selection off inside the shells, and nowhere else", () => {
    expect(css).toMatch(/html\.is-native body \{\n -webkit-user-select: none;\n user-select: none;\n -webkit-touch-callout: none;\n\}/);
    // Never on a bare body or html: a browser keeps its selection.
    expect(css).not.toMatch(/(^|\n)(html|body|html, body|html,\nbody) \{[^}]*user-select: none/);
  });

  it("leaves every field selectable, so it can be typed in", () => {
    expect(css).toMatch(
      /html\.is-native :is\(input, textarea, select, \[contenteditable\]:not\(\[contenteditable="false"\]\)\) \{\n -webkit-user-select: text;\n user-select: text;/,
    );
  });
});

describe("the pill", () => {
  const host = readFileSync("components/native/PressToCopy.tsx", "utf8");
  const layout = readFileSync("app/layout.tsx", "utf8");

  it("is mounted on every screen, inside the language provider", () => {
    expect(layout).toMatch(/<PressToCopy \/>\s*<\/MessagesProvider>/);
  });

  it("does nothing in a browser, and never stands in a scroll's way", () => {
    expect(host).toMatch(/if \(!isNativeClient\(\)\) return;/);
    expect(host).not.toMatch(/preventDefault\(/);
    for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"]) {
      expect(host, type).toMatch(new RegExp(`addEventListener\\("${type}", \\w+, \\{ passive: true \\}\\)`));
    }
  });

  it("copies by the way that works in both apps", () => {
    expect(host).toMatch(/copyText\(text\)/);
    expect(host).not.toMatch(/navigator\.clipboard/);
  });
});
