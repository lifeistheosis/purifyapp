// DRAFT, NOT RUN BY THE APP: waits for his word (Fable's release check 1, M1).
//
// Psalms 113 to 115 are divided as the Septuagint divides them since 1.9
// (84a7bb9, scripts/bibles/psalms-113-115.mjs): no word changed, only where
// each verse stands. A reader's notes, highlights, saved verses, Remember
// cards, journal verse cards and last place on old 114:1-18 and 115:1-19 now
// point at other verses, or at none (114 has 9 verses now, 115 has 10). This
// is the one-time move of what a device keeps, by the script's own mapping:
//
//   113:1-8   stays     113:1-8
//   114:1-18  becomes   113:9-26
//   115:1-9   becomes   114:1-9
//   115:10-19 becomes   115:1-10
//
// The order is what keeps anything from moving twice (the draft note,
// docs/1.9-build/drafts/psalms-113-115-move.md): the owner's SQL moves the
// server's rows once, in the 1.9 merge, before any device runs 1.9
// (docs/1.9-build/sql/psalms-113-115-move.sql); then each device moves its
// own copies once, at launch, before its first pull. Nothing is tombstoned:
// once the server has moved, an old place is another verse's new place (old
// 115:10's tombstone would delete the row now at 115:10, old 115:19's note).
// And no time is made new, so a device sends nothing it did not change, and
// another device's later edit still wins. Pure but for the storage handed
// in, so the tests run it against a stand-in.

/** Where an old verse of Psalms 113 to 115 stands now; every other verse is where it was. */
export function movedVerse(chapter: number, verse: number): { chapter: number; verse: number } {
  if (chapter === 114) return { chapter: 113, verse: verse + 8 };
  if (chapter === 115) return verse <= 9 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 9 };
  return { chapter, verse };
}

/** Whether an old place is one that moved. */
export function moves(book: string, chapter: number): boolean {
  return book === "psalms" && (chapter === 114 || chapter === 115);
}

/** An old span of verses in one chapter, as one span or two (across the new line between 114 and 115). */
export function movedSpan(chapter: number, from: number, to: number): { chapter: number; from: number; to: number }[] {
  const a = movedVerse(chapter, from);
  const b = movedVerse(chapter, to);
  if (a.chapter === b.chapter) return [{ chapter: a.chapter, from: a.verse, to: b.verse }];
  return [
    { chapter: a.chapter, from: a.verse, to: 9 },
    { chapter: b.chapter, from: 1, to: b.verse },
  ];
}

/** A chapter bookmark's new chapter: the chapter the old one now begins in. */
export function movedChapter(chapter: number): number {
  return chapter === 114 ? 113 : chapter === 115 ? 114 : chapter;
}

const TOKEN = /^\[\[verse psalms (114|115):(\d{1,3})(?:-(\d{1,3}))?\]\]$/;

/**
 * A journal page's text with its Psalm 114 and 115 verse cards moved. A card
 * is a paragraph of its own, one line, so the text is moved line by line and
 * no moved card is moved again; a card across the new line becomes two cards.
 */
export function moveVerseCards(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      const m = TOKEN.exec(line);
      if (!m) return line;
      const chapter = Number(m[1]);
      const from = Number(m[2]);
      const to = m[3] ? Number(m[3]) : from;
      return movedSpan(chapter, from, to)
        .map((s) => `[[verse psalms ${s.chapter}:${s.from}${s.to > s.from ? `-${s.to}` : ""}]]`)
        .join("\n\n");
    })
    .join("\n");
}

/** The device's storage, as the move needs it. */
export type MoveStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
};

export const PSALMS_MOVED_KEY = "purify:psalms113.moved";

export type MoveReport = { annotations: number; bookmarks: number; remember: number; journal: number; florilegium: number; lastRead: boolean };

const ANNOTATION = /^purify:bible:psalms:(114|115):(\d{1,3})$/;

const parse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/**
 * Move everything this device keeps on old Psalms 114 and 115, once. Returns
 * what moved; null when it had run before. Never throws: a store it cannot
 * read is left as it is.
 */
export function moveDevicePsalms(store: MoveStore): MoveReport | null {
  if (store.getItem(PSALMS_MOVED_KEY) === "1") return null;
  const report: MoveReport = { annotations: 0, bookmarks: 0, remember: 0, journal: 0, florilegium: 0, lastRead: false };

  // Notes and highlights. Every old value is read first, then the old keys
  // cleared, then the new ones written, since an old key (115:1) can be
  // another's new key (old 114:1 moves to 113:9, old 115:1 to 114:1).
  type Annotation = { at?: string; hlAt?: string; noteAt?: string; [k: string]: unknown };
  const old: { chapter: number; verse: number; value: Annotation }[] = [];
  for (const key of store.keys()) {
    const m = ANNOTATION.exec(key);
    if (!m) continue;
    const value = parse<Annotation>(store.getItem(key));
    if (!value || typeof value !== "object") continue;
    old.push({ chapter: Number(m[1]), verse: Number(m[2]), value });
  }
  for (const o of old) store.removeItem(`purify:bible:psalms:${o.chapter}:${o.verse}`);
  for (const o of old) {
    const to = movedVerse(o.chapter, o.verse);
    const key = `purify:bible:psalms:${to.chapter}:${to.verse}`;
    const there = parse<Annotation>(store.getItem(key));
    // Already there in the new numbering (pulled from the moved server): the newer stands.
    if (there && (there.at ?? "") > (o.value.at ?? "")) continue;
    store.setItem(key, JSON.stringify(o.value));
    report.annotations += 1;
  }

  // Saved verses and chapters.
  type Mark = { kind: string; book?: string; chapter?: number; verse?: number; label?: string; addedAt?: number };
  const marks = parse<Mark[]>(store.getItem("purify:bookmarks"));
  if (Array.isArray(marks)) {
    let changed = false;
    const next = marks.map((b) => {
      if (!b || b.book !== "psalms" || typeof b.chapter !== "number" || !moves("psalms", b.chapter)) return b;
      if (b.kind === "bible-verse" && typeof b.verse === "number") {
        const to = movedVerse(b.chapter, b.verse);
        changed = true;
        report.bookmarks += 1;
        return { ...b, chapter: to.chapter, verse: to.verse, label: (b.label ?? "").replace(/\d+:\d+$/, `${to.chapter}:${to.verse}`) };
      }
      if (b.kind === "bible-chapter") {
        const chapter = movedChapter(b.chapter);
        changed = true;
        report.bookmarks += 1;
        return { ...b, chapter, label: (b.label ?? "").replace(/\d+$/, String(chapter)) };
      }
      return b;
    });
    if (changed) store.setItem("purify:bookmarks", JSON.stringify(next));
  }

  // Remember the verse: its cards and their words, keyed "psalms/114/4".
  type Remember = { entries?: Record<string, { at?: number; [k: string]: unknown }>; texts?: Record<string, string>; answeredKey?: string; [k: string]: unknown };
  const remember = parse<Remember>(store.getItem("purify:remember"));
  if (remember && typeof remember === "object") {
    const moveKey = (key: string) => {
      const m = /^psalms\/(114|115)\/(\d{1,3})$/.exec(key);
      if (!m) return key;
      const to = movedVerse(Number(m[1]), Number(m[2]));
      return `psalms/${to.chapter}/${to.verse}`;
    };
    const entries: NonNullable<Remember["entries"]> = {};
    for (const [key, e] of Object.entries(remember.entries ?? {})) {
      const to = moveKey(key);
      if (to !== key) report.remember += 1;
      entries[to] = e;
    }
    const texts: Record<string, string> = {};
    for (const [key, words] of Object.entries(remember.texts ?? {})) texts[moveKey(key)] = words;
    if (report.remember) {
      store.setItem(
        "purify:remember",
        JSON.stringify({ ...remember, entries, texts, ...(remember.answeredKey ? { answeredKey: moveKey(remember.answeredKey) } : {}) }),
      );
    }
  }

  // Journal pages: their verse cards, and the time, so sync sends the page.
  type Page = { body?: string; updatedAt?: string; [k: string]: unknown };
  const pages = parse<Page[]>(store.getItem("purify:journal"));
  if (Array.isArray(pages)) {
    let changed = false;
    const next = pages.map((p) => {
      if (!p || typeof p.body !== "string") return p;
      const body = moveVerseCards(p.body);
      if (body === p.body) return p;
      changed = true;
      report.journal += 1;
      return { ...p, body };
    });
    if (changed) store.setItem("purify:journal", JSON.stringify(next));
  }

  // A florilegium's gathered verses: their place and its label. The words
  // were gathered verbatim and no word changed, so they stand.
  type Item = { kind?: string; book?: string; chapter?: number; verse?: number; reference?: string; [k: string]: unknown };
  type Collection = { items?: Item[]; updatedAt?: number; [k: string]: unknown };
  const collections = parse<Collection[]>(store.getItem("purify:florilegia"));
  if (Array.isArray(collections)) {
    let changed = false;
    const next = collections.map((c) => {
      if (!c || !Array.isArray(c.items)) return c;
      let touched = false;
      const items = c.items.map((it) => {
        if (!it || it.kind !== "scripture" || it.book !== "psalms" || typeof it.chapter !== "number" || typeof it.verse !== "number" || !moves("psalms", it.chapter)) return it;
        const to = movedVerse(it.chapter, it.verse);
        touched = true;
        report.florilegium += 1;
        return { ...it, chapter: to.chapter, verse: to.verse, reference: (it.reference ?? "").replace(/\d+:\d+$/, `${to.chapter}:${to.verse}`) };
      });
      if (!touched) return c;
      changed = true;
      return { ...c, items };
    });
    if (changed) store.setItem("purify:florilegia", JSON.stringify(next));
  }

  // The last place read.
  type Last = { book?: string; chapter?: number; verse?: number; [k: string]: unknown };
  const last = parse<Last>(store.getItem("purify:bible:last"));
  if (last && last.book === "psalms" && typeof last.chapter === "number" && moves("psalms", last.chapter)) {
    const to = movedVerse(last.chapter, typeof last.verse === "number" ? last.verse : 1);
    store.setItem("purify:bible:last", JSON.stringify({ ...last, chapter: to.chapter, verse: to.verse }));
    report.lastRead = true;
  }

  store.setItem(PSALMS_MOVED_KEY, "1");
  return report;
}
