// The built-in word list for lib/moderation/filter.ts, base64 per term so the
// words are not sitting in plain text in a public repository. Decoded once,
// on the server only; the list never reaches a browser.
//
// Each entry: [term, flags, suffixes?]
//   flags[0]  t  censored in posts and replies, and refused in handles
//             h  refused in handles only (a word with honest uses in writing,
//                like a historical name or a medical word)
//   flags[1]  w  in writing, a whole word (plus the listed suffixes)
//             p  in writing, inside other words too, minus ALLOW below
//             -  not checked in writing
//   flags[2]  a  in a handle, anywhere (dots, underscores and digits squeezed out)
//             k  in a handle, a whole token only (so sexton and canal stay free)
//
// The team adds to this from the admin panel (community_filter_terms) without
// a release; those are read alongside.
import "server-only";

export type TermEntry = [term: string, flags: string, suffixes?: string];

const ENCODED: TermEntry[] = [
["bmlnZ2Vy", "tpa"],
  ["bmlnZ2E=", "tpa"],
  ["bmlnbGV0", "twa", "s"],
  ["Y29vbg==", "twk", "s"],
  ["amlnYWJvbw==", "tpa"],
  ["cG9yY2htb25rZXk=", "tpa"],
  ["c3BpYw==", "twk", "s|k|ks"],
  ["d2V0YmFjaw==", "tpa"],
  ["YmVhbmVy", "twa", "s"],
  ["Z29vaw==", "twk", "s"],
  ["emlwcGVyaGVhZA==", "tpa"],
  ["a2lrZQ==", "twk", "s"],
  ["a3lrZQ==", "twk", "s"],
  ["cmFnaGVhZA==", "tpa"],
  ["dG93ZWxoZWFk", "tpa"],
  ["cGFraQ==", "twk", "s"],
  ["Z29sbGl3b2c=", "tpa"],
  ["ZGFya2ll", "twa", "s"],
  ["ZGFya3k=", "twk"],
  ["d29w", "twk", "s"],
  ["ZGFnbw==", "twk", "s|es"],
  ["eWlk", "twk", "s"],
  ["cmVkc2tpbg==", "twa", "s"],
  ["ZmFnZ290", "tpa"],
  ["ZmFn", "twk", "s|gy"],
  ["ZHlrZQ==", "twk", "s"],
  ["dHJhbm55", "twa"],
  ["dHJhbm5pZXM=", "twa"],
  ["c2hlbWFsZQ==", "tpa"],
  ["cmV0YXJk", "twa", "s|ed|ation"],
  ["ZnVjaw==", "tpa"],
  ["Y3VudA==", "tpa"],
  ["Ymxvd2pvYg==", "tpa"],
  ["aGFuZGpvYg==", "tpa"],
  ["cmltam9i", "tpa"],
  ["ZGlsZG8=", "tpa"],
  ["aml6eg==", "tpa"],
  ["Z2FuZ2Jhbmc=", "tpa"],
  ["YnVra2FrZQ==", "tpa"],
  ["c2x1dA==", "twa", "s|ty"],
  ["Y2hpbms=", "h-k"],
  ["bmF6aQ==", "h-k"],
  ["aGl0bGVy", "h-a"],
  ["a2tr", "h-a"],
  ["cG9ybg==", "h-a"],
  ["bnNmdw==", "h-a"],
  ["eHh4", "h-a"],
  ["b25seWZhbnM=", "h-a"],
  ["c2V4", "h-k"],
  ["c2V4eQ==", "h-a"],
  ["bnVkZQ==", "h-k"],
  ["bnVkZXM=", "h-k"],
  ["bmFrZWQ=", "h-k"],
  ["Ym9vYg==", "h-k"],
  ["Ym9vYnM=", "h-k"],
  ["dGl0cw==", "h-k"],
  ["dGl0dGllcw==", "h-a"],
  ["ZGljaw==", "h-k"],
  ["Y29jaw==", "h-k"],
  ["cHVzc3k=", "h-a"],
  ["cGVuaXM=", "h-a"],
  ["dmFnaW5h", "h-a"],
  ["YW5hbA==", "h-k"],
  ["Y3Vt", "h-k"],
  ["cmFwZQ==", "h-k"],
  ["cmFwaXN0", "h-k"],
  ["cGVkbw==", "h-k"],
  ["cGVkb3BoaWxl", "h-a"],
  ["cGFlZG8=", "h-k"],
  ["aW5jZXN0", "h-a"],
  ["Yml0Y2g=", "h-a"],
  ["d2hvcmU=", "h-a"],
  ["c2F0YW4=", "h-a"],
  ["bHVjaWZlcg==", "h-a"],
  ["YW50aWNocmlzdA==", "h-a"],
];

/** Ordinary words that happen to contain a listed one, never touched. */
const ALLOW_ENCODED = ["c25pZ2dlcg==", "c25pZ2dlcnM=", "c25pZ2dlcmVk", "c25pZ2dlcmluZw==", "c2N1bnRob3JwZQ==", "cGVuaXN0b25l", "dGhlcmFwaXN0", "dGhlcmFwaXN0cw==", "c2V4dG9u", "c2V4dG9ucw==", "YW5hbHlzaXM=", "Y2FuYWw=", "YmFuYWw="];

const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");

export const BUILT_IN_TERMS: TermEntry[] = ENCODED.map(([t, f, s]) => (s ? [decode(t), f, s] : [decode(t), f]));
export const ALLOWED_WORDS: ReadonlySet<string> = new Set(ALLOW_ENCODED.map(decode));
