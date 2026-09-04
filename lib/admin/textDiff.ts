/**
 * Word-level diff for the patch-notes review queue.
 *
 * The queue shows a proposed edit the way Word shows a tracked change: the
 * words that went, struck through; the words that came, underlined; the rest
 * as it was. A paragraph rewritten in one place should light up in one place,
 * not turn red end to end, which is what a line diff on a single-line blurb
 * would do.
 *
 * Longest common subsequence over whitespace-delimited tokens, with the
 * whitespace kept on each token so the output re-joins to the exact input.
 * Quadratic in token count, which is fine: the longest item in the file is
 * about six hundred words, and the queue renders a handful of them at a time.
 * No dependency, because package.json has no diff library and one is not
 * worth adding for forty lines.
 */

export type DiffOp = { kind: "same" | "add" | "del"; text: string };

function tokens(s: string): string[] {
  // Each token carries its trailing whitespace, so joining the "same" and
  // "add" ops reproduces `b` exactly and joining "same" and "del" reproduces `a`.
  return s.match(/\S+\s*|\s+/g) ?? [];
}

export function diffWords(a: string, b: string): DiffOp[] {
  if (a === b) return a ? [{ kind: "same", text: a }] : [];
  const x = tokens(a);
  const y = tokens(b);
  const n = x.length;
  const m = y.length;

  // lcs[i][j] = length of the LCS of x[i..] and y[j..].
  const lcs: Uint16Array[] = [];
  for (let i = 0; i <= n; i++) lcs.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        x[i].trim() === y[j].trim()
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  const push = (kind: DiffOp["kind"], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.kind === kind) last.text += text;
    else ops.push({ kind, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i].trim() === y[j].trim()) {
      // Prefer the new side's whitespace so "add" and "same" join to `b`.
      push("same", y[j]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("del", x[i]);
      i++;
    } else {
      push("add", y[j]);
      j++;
    }
  }
  while (i < n) push("del", x[i++]);
  while (j < m) push("add", y[j++]);
  return ops;
}

/** True when the two strings differ by more than whitespace. */
export function changed(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() !== b.replace(/\s+/g, " ").trim();
}
