// The main web, read as a phone with a signal reads it: GET only, each address
// once, nothing ever sent (the gate's walks with --online). The same reader the
// tap walk and the guardrail walk each keep inline; the motion walk takes it
// from here.

const fetched = new Map();

/** A Playwright route handler for the main web's addresses and its public pictures. */
export async function mainWeb(route) {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) {
      fetched.set(
        url,
        (async () => {
          const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !["host", "connection"].includes(k.toLowerCase())));
          const r = await fetch(url, { headers });
          const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
          return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
        })(),
      );
    }
    return route.fulfill(await fetched.get(url));
  } catch {
    return route.abort();
  }
}

// ── Stand-ins ──────────────────────────────────────────────────────────

/** Days ago, as the main web writes a post's time. */
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

/**
 * Stand-ins for parts the main web feeds only now and then (2026-11-13, the
 * arbiter's routing; found by Updates 16). A part that shows readers' posts is
 * drawn only where the main web has some, and the walks' screens are not those
 * places, so its lines were never drawn or measured: the chapter's discussions
 * (components/bible/ChapterDiscussions.tsx) were the case, a reader's name and
 * the post's age at 4.24:1 on Light, on a card no gate run had seen. Where the
 * main web answers one of these addresses with nothing to show, the walk
 * answers it with one post in plain sample words, and says so; where the main
 * web has posts, they are shown as they are. Never sent anywhere: a stand-in is
 * an answer in the browser, as the mock scripts' are.
 */
export const STAND_INS = [
  {
    name: "a chapter's discussions (components/bible/ChapterDiscussions.tsx)",
    test: (u) => u.pathname === "/api/community/posts" && u.searchParams.has("chapter"),
    answer: (u) => ({
      posts: [
        {
          id: "51a2d1e5-0000-4000-8000-000000000001",
          kind: "discussion",
          title: "A question about this chapter",
          body: "A reader's words about the chapter, as a post in Community shows them, two lines at the most.",
          quote_text: null,
          quote_source: null,
          quote_href: null,
          author_name: "A reader",
          author_avatar: null,
          author_verified: false,
          author_mark: null,
          author_handle: null,
          author_decoration: null,
          author_name_color: null,
          author_clergy: null,
          reply_count: 2,
          like_count: 0,
          dislike_count: 0,
          created_at: daysAgo(28),
          pinned_at: null,
          category: null,
          chapter_ref: u.searchParams.get("chapter"),
          feast_slug: null,
          amen_count: 0,
          praying_count: 0,
          glory_count: 0,
          clergy_reply_count: 0,
        },
      ],
    }),
  },
];

/** The stand-ins drawn so far, by name, for the walk's report. */
export const stoodIn = new Set();

/**
 * The stand-in for one of the main web's answers, or null to keep the answer:
 * only an address named in STAND_INS, only a 200, and only when it has no posts
 * to show (a 404 is the part switched off, and stays so).
 */
export function standInFor(url, answer) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const s = STAND_INS.find((x) => x.test(u));
  if (!s || answer?.status !== 200) return null;
  let json;
  try {
    json = JSON.parse(Buffer.from(answer.body).toString("utf8"));
  } catch {
    return null;
  }
  if (Array.isArray(json?.posts) && json.posts.length > 0) return null;
  stoodIn.add(s.name);
  return { status: 200, headers: { ...answer.headers, "content-type": "application/json" }, body: Buffer.from(JSON.stringify(s.answer(u))) };
}
