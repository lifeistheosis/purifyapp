import Link from "next/link";
import type { Verse, ChapterCrossRefs, ChapterCommentary } from "@/lib/bible/load";

const DISPLAY_TO_SLUG: Record<string, string> = {
  Genesis: "genesis", Exodus: "exodus", Leviticus: "leviticus", Numbers: "numbers",
  Deuteronomy: "deuteronomy", Joshua: "joshua", Judges: "judges", Ruth: "ruth",
  "1 Samuel": "1-samuel", "2 Samuel": "2-samuel", "1 Kings": "1-kings", "2 Kings": "2-kings",
  "1 Chronicles": "1-chronicles", "2 Chronicles": "2-chronicles", Ezra: "ezra",
  Nehemiah: "nehemiah", Esther: "esther", Job: "job", Psalms: "psalms",
  Proverbs: "proverbs", Ecclesiastes: "ecclesiastes", "Song of Solomon": "song-of-solomon",
  Isaiah: "isaiah", Jeremiah: "jeremiah", Lamentations: "lamentations", Ezekiel: "ezekiel",
  Daniel: "daniel", Hosea: "hosea", Joel: "joel", Amos: "amos", Obadiah: "obadiah",
  Jonah: "jonah", Micah: "micah", Nahum: "nahum", Habakkuk: "habakkuk",
  Zephaniah: "zephaniah", Haggai: "haggai", Zechariah: "zechariah", Malachi: "malachi",
  Matthew: "matthew", Mark: "mark", Luke: "luke", John: "john", Acts: "acts",
  Romans: "romans", "1 Corinthians": "1-corinthians", "2 Corinthians": "2-corinthians",
  Galatians: "galatians", Ephesians: "ephesians", Philippians: "philippians",
  Colossians: "colossians", "1 Thessalonians": "1-thessalonians",
  "2 Thessalonians": "2-thessalonians", "1 Timothy": "1-timothy", "2 Timothy": "2-timothy",
  Titus: "titus", Philemon: "philemon", Hebrews: "hebrews", James: "james",
  "1 Peter": "1-peter", "2 Peter": "2-peter", "1 John": "1-john", "2 John": "2-john",
  "3 John": "3-john", Jude: "jude", Revelation: "revelation",
};

function refHref(display: string): string | null {
  // "John 1:1-3" or "1 Samuel 2:5" or "Genesis 1:1–2:3"
  const m = display.match(/^((?:[1-3] )?[A-Za-z ]+?) (\d+):(\d+)/);
  if (!m) return null;
  const slug = DISPLAY_TO_SLUG[m[1].trim()];
  if (!slug) return null;
  return `/bible/${slug}/${m[2]}#v${m[3]}`;
}

export function ChapterReader({
  verses,
  crossRefs,
  commentary,
}: {
  verses: Verse[];
  crossRefs?: ChapterCrossRefs;
  commentary?: ChapterCommentary;
}) {
  return (
    <article className="font-serif text-paper/90 text-[19px] md:text-[20px] leading-[1.75]">
      <div className="space-y-7">
        {verses.map((v) => {
          const refs = crossRefs?.[String(v.n)] ?? [];
          const notes = commentary?.[String(v.n)] ?? [];
          return (
            <div key={v.n} id={`v${v.n}`} className="scroll-mt-24">
              <p className="indent-0">
                <sup className="font-sans text-[11px] font-medium text-paper/40 tracking-[0.05em] mr-2 align-super">
                  {v.n}
                </sup>
                {v.text}
              </p>
              {refs.length > 0 && (
                <p className="mt-2 font-sans text-[12px] text-paper/45 leading-[1.7]">
                  <span className="text-paper/35 mr-2">cf.</span>
                  {refs.map((r, i) => {
                    const href = refHref(r.display);
                    const sep = i < refs.length - 1 ? " · " : "";
                    return href ? (
                      <span key={r.display + i}>
                        <Link
                          href={href}
                          className="hover:text-paper transition-colors"
                        >
                          {r.display}
                        </Link>
                        {sep}
                      </span>
                    ) : (
                      <span key={r.display + i}>
                        {r.display}
                        {sep}
                      </span>
                    );
                  })}
                </p>
              )}
              {notes.length > 0 && (
                <div className="mt-4 space-y-3">
                  {notes.map((n, i) => (
                    <blockquote
                      key={i}
                      className="border-l-2 border-accent/50 pl-4 py-1"
                    >
                      <p className="font-serif text-[15px] md:text-[16px] leading-[1.65] text-paper/80">
                        {n.text}
                      </p>
                      <p className="mt-2 font-sans text-[11px] uppercase tracking-[1.2px] text-paper/45">
                        {n.author}
                        <span className="text-paper/30"> · </span>
                        <span className="normal-case tracking-normal italic text-paper/55">
                          {n.work}
                        </span>
                      </p>
                    </blockquote>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
