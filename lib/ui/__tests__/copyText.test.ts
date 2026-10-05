// Copy has to work in both apps, and the iPhone's is not a secure context.
// The why is in ../copyText.ts.

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText, copyThroughField } from "../copyText";

type FakeField = {
  value: string;
  tabIndex: number;
  style: Record<string, string>;
  attrs: Record<string, string>;
  selected: [number, number] | null;
  focused: boolean;
  removed: boolean;
  setAttribute: (k: string, v: string) => void;
  focus: () => void;
  select: () => void;
  setSelectionRange: (a: number, b: number) => void;
  remove: () => void;
};

function stubDocument({ exec = true, throws = false }: { exec?: boolean; throws?: boolean } = {}) {
  const fields: FakeField[] = [];
  const appended: FakeField[] = [];
  const copied: string[] = [];
  const active = { refocused: 0, focus: () => void (active.refocused += 1) };
  const doc = {
    activeElement: active,
    body: { appendChild: (f: FakeField) => void appended.push(f) },
    createElement: () => {
      const f: FakeField = {
        value: "",
        tabIndex: 0,
        style: {},
        attrs: {},
        selected: null,
        focused: false,
        removed: false,
        setAttribute: (k, v) => void (f.attrs[k] = v),
        focus: () => void (f.focused = true),
        select: () => void (f.selected = [0, f.value.length]),
        setSelectionRange: (a, b) => void (f.selected = [a, b]),
        remove: () => void (f.removed = true),
      };
      fields.push(f);
      return f;
    },
    execCommand: (command: string) => {
      if (throws) throw new Error("not allowed");
      const f = fields[fields.length - 1];
      // The browser copies what is selected, and only while it is on the page.
      if (command === "copy" && exec && f && f.selected && appended.includes(f) && !f.removed) {
        copied.push(f.value.slice(f.selected[0], f.selected[1]));
        return true;
      }
      return false;
    },
  };
  vi.stubGlobal("document", doc);
  return { fields, appended, copied, active };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copying text", () => {
  it("uses the clipboard where the device has one", async () => {
    const written: string[] = [];
    vi.stubGlobal("navigator", { clipboard: { writeText: async (t: string) => void written.push(t) } });
    const d = stubDocument();
    expect(await copyText("Lord, have mercy.")).toBe(true);
    expect(written).toEqual(["Lord, have mercy."]);
    expect(d.fields).toHaveLength(0);
  });

  it("copies through a field where there is no clipboard, as in the iPhone app", async () => {
    vi.stubGlobal("navigator", {});
    const d = stubDocument();
    expect(await copyText("In the beginning was the Word.\nJohn 1:1")).toBe(true);
    expect(d.copied).toEqual(["In the beginning was the Word.\nJohn 1:1"]);
  });

  it("copies through a field when the clipboard refuses", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: async () => {
          throw new Error("NotAllowedError");
        },
      },
    });
    const d = stubDocument();
    expect(await copyText("Glory to Thee, O God.")).toBe(true);
    expect(d.copied).toEqual(["Glory to Thee, O God."]);
  });

  it("says so when nothing worked, so a button never claims a copy it did not make", async () => {
    vi.stubGlobal("navigator", {});
    stubDocument({ exec: false });
    expect(await copyText("x")).toBe(false);
    stubDocument({ throws: true });
    expect(await copyText("x")).toBe(false);
  });

  it("does nothing where there is no page", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", undefined);
    expect(await copyText("x")).toBe(false);
  });
});

describe("the field it copies through", () => {
  it("is selectable, off the page, and gone afterwards", () => {
    const d = stubDocument();
    expect(copyThroughField("Amen.")).toBe(true);
    const field = d.fields[0];
    expect(field.removed).toBe(true);
    expect(field.selected).toEqual([0, 5]);
    // A form field stays selectable inside the apps' unselectable page; said
    // outright as well, for the browsers that need telling.
    expect(field.style.userSelect).toBe("text");
    expect(field.style.webkitUserSelect).toBe("text");
    expect(field.style.position).toBe("fixed");
    expect(field.style.opacity).toBe("0");
    // 16px: an iPhone zooms to a smaller field the instant it is focused.
    expect(field.style.fontSize).toBe("16px");
    expect(field.attrs["aria-hidden"]).toBe("true");
    expect(field.tabIndex).toBe(-1);
  });

  it("hands focus back to where it was", () => {
    const d = stubDocument();
    copyThroughField("Amen.");
    expect(d.active.refocused).toBe(1);
  });

  it("is removed even when the copy throws", () => {
    const d = stubDocument({ throws: true });
    expect(copyThroughField("Amen.")).toBe(false);
    expect(d.fields[0].removed).toBe(true);
  });
});

describe("every copy button a reader can reach", () => {
  it("goes through this helper, never the bare clipboard", () => {
    for (const file of [
      "components/bible/VerseRow.tsx",
      "components/saints/ParagraphRow.tsx",
      "components/today/VerseCardActions.tsx",
      "components/ui/ShareButton.tsx",
      "components/community/profile/ProfileViewer.tsx",
      "components/shop/ambassador/AmbassadorDashboard.tsx",
      "components/native/PressToCopy.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      // A call, not prose: the comments that explain the change name the old way.
      expect(src, `${file} calls the clipboard bare`).not.toMatch(/navigator\.clipboard\.writeText\s*\(/);
      expect(src, `${file} does not use lib/ui/copyText`).toMatch(/from "@\/lib\/ui\/copyText"/);
    }
  });
});
