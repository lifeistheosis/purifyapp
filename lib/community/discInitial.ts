// The letter on a reader's disc in Community, where they have no picture.
//
// It was `name[0]`: the first half of an emoji for a name that begins with
// one (a broken mark on the disc), and nothing at all for a name that begins
// with a space, which left the disc empty. The pre-build gate's first run
// (docs/1.9-build/notes/gate-run-1.md) asked that Community's round frame be
// looked at by eye: every disc that could be seen held its letter, and these
// two were the ways one could come up without.
//
// So: the first letter or digit of the name, whole, as a capital where its
// script writes one. A name with no letter in it (only marks or emoji) is
// "R", a reader, as an absent name always was.
//
// Georgian keeps its letter as written. It has no capitals in everyday
// writing: what the standard calls its upper case (Mtavruli, U+1C90 to
// U+1CBF) is for a headline set all in capitals, a name does not begin with
// one, and a phone whose fonts have no such letters would draw an empty box
// in its place.

/** The disc's letter: never empty, never half a character. */
export function discInitial(name: string | null | undefined): string {
  // for...of walks whole characters, so an emoji is one step, not two halves.
  for (const ch of name ?? "") {
    if (!/[\p{L}\p{N}]/u.test(ch)) continue;
    const capital = Array.from(ch.toUpperCase())[0] ?? ch;
    const point = capital.codePointAt(0) ?? 0;
    return point >= 0x1c90 && point <= 0x1cbf ? ch : capital;
  }
  return "R";
}
