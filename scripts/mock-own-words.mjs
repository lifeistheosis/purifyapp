// Community, a reader's own words edited and deleted (1.9, build 95 note 10),
// on the native export: the touched screens held to checkMock, and the
// touched controls tapped the way a reader taps them, with motion on.
//
// A reader's ask, sent by the owner: "We should have the ability to remove or
// edit our comments under replies and posts". The controls appear only for a
// signed-in reader's own posts and replies, which the gate's tap walk cannot
// reach (its export has no server, and on the main web nothing is the walk's
// own). So the routes are answered here, in the browser, with plain sample
// words, for a reader signed in as Anna: her own post (edited), her own reply
// (edited) under Ben's post after a placeholder, and a post its writer
// deleted after others replied. Nothing leaves the machine.
//
//   npm run build:android, then:
//   node scripts/mock-own-words.mjs                  checkMock with pixels: the six states, at 390, 800 and
//                                                    1032 wide, on every palette (mock-check.mjs, EVERY),
//                                                    in English and in Arabic
//   WALK=1 node scripts/mock-own-words.mjs           the tap walk: every touched control, real touch, motion on
//   SHOTS=dir node scripts/mock-own-words.mjs        and a still of each state (2x) in that folder
//   WIDTHS=390 LOCALES=en node scripts/mock-own-words.mjs   a narrower run
//   ONLY=03,04 node scripts/mock-own-words.mjs       only those states, by number
import fs from "node:fs";
import path from "node:path";

import { EVERY, checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const WALK = process.env.WALK === "1";
const SHOTS = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
const WIDTHS = (process.env.WIDTHS ?? "390,800,1032").split(",").map(Number);
const LOCALES = (process.env.LOCALES ?? "en,ar").split(",");
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const WORN = { palettes: EVERY, pixels: true };
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

const ANNA = "11111111-1111-4111-8111-111111111111";
const P_MINE = "44444444-4444-4444-8444-444444444444";
const P_REMOVED = "45454545-4545-4545-8545-454545454545";
const P_BEN = "46464646-4646-4646-8646-464646464646";
const R_REMOVED = "52525252-5252-4252-8252-525252525252";
const R_ANNA = "53535353-5353-4353-8353-535353535353";

const ago = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const SESSION = {
  access_token: "stills.stills.stills",
  refresh_token: "stills",
  token_type: "bearer",
  expires_in: 31_536_000,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000,
  user: { id: ANNA, aud: "authenticated", role: "authenticated", email: "anna@example.com", app_metadata: {}, user_metadata: { display_name: "Anna" }, created_at: "2026-01-01T00:00:00Z" },
};

const post = (o) => ({
  kind: "discussion",
  title: null,
  body: null,
  quote_text: null,
  quote_source: null,
  quote_href: null,
  author_avatar: null,
  author_verified: false,
  author_mark: null,
  author_decoration: null,
  author_name_color: null,
  author_clergy: null,
  like_count: 0,
  dislike_count: 0,
  pinned_at: null,
  category: null,
  chapter_ref: null,
  feast_slug: null,
  amen_count: 0,
  praying_count: 0,
  glory_count: 0,
  clergy_reply_count: 0,
  edited_at: null,
  ...o,
});
const reply = (o) => ({ author_avatar: null, author_mark: null, author_decoration: null, author_name_color: null, author_clergy: null, like_count: 0, dislike_count: 0, amen_count: 0, praying_count: 0, glory_count: 0, edited_at: null, ...o });

function world() {
  return {
    posts: [
      post({ id: P_MINE, title: "Keeping the Nativity Fast", body: "What do you keep on Wednesdays and Fridays?", author_name: "Anna", author_handle: "anna", reply_count: 1, like_count: 2, created_at: ago(3), edited_at: ago(1) }),
      post({ id: P_REMOVED, author_name: "Reader", author_handle: null, reply_count: 2, created_at: ago(5), removed_by_author: true }),
      post({ id: P_BEN, body: "Lord, have mercy.", author_name: "Ben", author_handle: "ben", reply_count: 2, created_at: ago(6) }),
    ],
    replies: {
      [P_MINE]: [reply({ id: "61616161-6161-4161-8161-616161616161", post_id: P_MINE, body: "We keep the fast as the Church gives it.", author_name: "Ben", author_handle: "ben", created_at: ago(2) })],
      [P_REMOVED]: [
        reply({ id: "62626262-6262-4262-8262-626262626262", post_id: P_REMOVED, body: "Thank you for asking this.", author_name: "Ben", author_handle: "ben", created_at: ago(4.5) }),
        reply({ id: "63636363-6363-4363-8363-636363636363", post_id: P_REMOVED, body: "Glory to God for all things.", author_name: "Clara", author_handle: "clara", created_at: ago(4) }),
      ],
      [P_BEN]: [
        reply({ id: R_REMOVED, post_id: P_BEN, body: "", author_name: "Reader", author_handle: null, created_at: ago(5.5), removed_by_author: true, author_muted: false }),
        reply({ id: R_ANNA, post_id: P_BEN, body: "Amen. Glory to God.", author_name: "Anna", author_handle: "anna", created_at: ago(5), edited_at: ago(1) }),
        reply({ id: "64646464-6464-4464-8464-646464646464", post_id: P_BEN, body: "Amen.", author_name: "Ben", author_handle: "ben", created_at: ago(4) }),
      ],
    },
  };
}

/** The main web's answers, for this reader and these posts; what the app sent is kept in `calls`. */
async function answer(ctx, w, calls) {
  await ctx.route("https://purifyapp.net/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const cors = { "Access-Control-Allow-Origin": "https://localhost", Vary: "Origin" };
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" } });
    let sent = null;
    try {
      sent = JSON.parse(req.postData() ?? "null");
    } catch {
      sent = null;
    }
    calls.push({ method: req.method(), path: p, body: sent });
    if (p === "/api/community/posts" && req.method() === "GET") return json({ posts: w.posts });
    if (p === "/api/community/mine") return json({ postIds: [P_MINE], replyIds: [R_ANNA], reactions: { posts: {}, replies: {} }, responses: { posts: {}, replies: {} }, moderator: false });
    const thread = /^\/api\/community\/posts\/([0-9a-f-]{36})\/replies$/.exec(p);
    if (thread && req.method() === "GET") return json({ replies: w.replies[thread[1]] ?? [] });
    const onePost = /^\/api\/community\/posts\/([0-9a-f-]{36})$/.exec(p);
    if (onePost && req.method() === "PATCH") return json({ ok: true, post: { title: sent?.title ?? null, body: sent?.body ?? null, edited_at: new Date().toISOString() } });
    if (onePost && req.method() === "DELETE") return json({ ok: true, outcome: "withdrawn" });
    const oneReply = /^\/api\/community\/replies\/([0-9a-f-]{36})$/.exec(p);
    if (oneReply && req.method() === "PATCH") return json({ ok: true, reply: { body: sent?.body ?? "", edited_at: new Date().toISOString() } });
    if (oneReply && req.method() === "DELETE") return json({ ok: true, outcome: "withdrawn" });
    if (p === "/api/community/notifications") return json({ notifications: [], unread: 0 });
    if (p === "/api/community/moderation") return json({ waiting: 0 });
    if (p === "/api/campaigns/open") return json({ error: "Not found." }, 404);
    return json({ error: "Not found." }, 404);
  });
}

async function open(width, locale) {
  const set = {
    "purify.supabase.auth": JSON.stringify([{ name: "sb-placeholder-auth-token", value: JSON.stringify(SESSION) }]),
    ...(locale !== "en" ? { "CapacitorStorage.purify_locale": locale } : {}),
  };
  const phone = await openPhone({ scale: SHOTS ? 2 : 1, set });
  await phone.page.setViewportSize({ width, height: HEIGHT[width] ?? 900 });
  const calls = [];
  const w = world();
  await answer(phone.ctx, w, calls);
  await go(phone.page, "/community");
  await phone.page.waitForSelector(`#post-${P_MINE}`, { timeout: 30000 });
  await phone.page.waitForTimeout(900);
  return { ...phone, calls, w };
}

/** The walk's words, as the reader's own language has them (the catalogs). */
const wordsOf = (locale) => {
  const m = JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${locale}.json`), "utf8"));
  return {
    viewProfile: m["community.viewProfile"],
    edit: m["common.edit"],
    del: m["community.delete"],
    save: m["common.save"],
    cancel: m["common.cancel"],
    edited: m["community.edited"],
    removed: m["community.removedByAuthor"],
    deleteReply: m["community.deleteReplyConfirmTitle"],
    deletePost: m["community.deleteConfirmTitle"],
  };
};

const article = (id) => `#post-${id}`;
const menuButton = (page, id) => page.locator(`${article(id)} button[aria-haspopup="menu"]`).first();
const repliesToggle = (page, id) => page.locator(`${article(id)} button[aria-controls$="-replies"]`).first();
const replyMenu = (page, id) => page.locator(`#reply-${id} button[aria-haspopup="menu"]`).first();
const item = (page, name) => page.locator('[role="menu"] [role="menuitem"]', { hasText: name }).first();

async function openThread(page, id) {
  await repliesToggle(page, id).tap();
  await page.waitForSelector(`${article(id)} [id$="-replies"]`, { timeout: 10000 });
  await page.waitForTimeout(600);
}

// ── checkMock: the six states ───────────────────────────────────────────────

const STATES = [
  {
    name: "01-post-menu",
    label: "the reader's own post: its menu, with Edit beside Delete",
    selector: '[role="menu"]',
    prepare: async (page) => {
      await menuButton(page, P_MINE).tap();
      await page.waitForSelector('[role="menu"]');
    },
  },
  {
    name: "02-post-editing",
    label: "the reader's own post, open to edit: its title and words as fields, Cancel and Save",
    selector: article(P_MINE),
    prepare: async (page) => {
      await menuButton(page, P_MINE).tap();
      await item(page, "Edit").or(page.locator('[role="menu"] [role="menuitem"]').nth(1)).first().tap();
      await page.waitForSelector(`${article(P_MINE)} [data-edit-words]`);
    },
  },
  {
    name: "03-edited-and-removed-replies",
    label: "a thread with a reply removed by its author, and the reader's own reply, edited",
    selector: article(P_BEN),
    prepare: (page) => openThread(page, P_BEN),
  },
  {
    name: "04-reply-editing",
    label: "the reader's own reply, open to edit",
    selector: article(P_BEN),
    prepare: async (page) => {
      await openThread(page, P_BEN);
      await replyMenu(page, R_ANNA).tap();
      await page.locator('[role="menu"] [role="menuitem"]').nth(1).tap();
      await page.waitForSelector(`#reply-${R_ANNA} [data-edit-words]`);
    },
  },
  {
    name: "05-reply-delete-asked",
    label: "deleting the reader's own reply: asked first",
    selector: '[role="alertdialog"], [role="dialog"]',
    prepare: async (page) => {
      await openThread(page, P_BEN);
      await replyMenu(page, R_ANNA).tap();
      await page.locator('[role="menu"] [role="menuitem"]').nth(2).tap();
      await page.waitForSelector('[role="alertdialog"], [role="dialog"]');
      await page.waitForTimeout(500);
    },
  },
  {
    name: "06-removed-post",
    label: "a post removed by its author, its replies still there",
    selector: article(P_REMOVED),
    prepare: (page) => openThread(page, P_REMOVED),
  },
];

async function stills() {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const results = [];
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      for (const s of STATES) {
        if (ONLY && !ONLY.has(s.name.slice(0, 2))) continue;
        const { browser, page } = await open(width, locale);
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        try {
          await s.prepare(page);
          await page.waitForTimeout(500);
          const label = `${s.label} (${width}, ${locale})`;
          const ok = printMockCheck(await checkMock(page, s.selector, WORN), label);
          results.push([label, ok]);
          if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${s.name}-${width}-${locale}.png`) });
          if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(" | ")}`);
        } finally {
          await browser.close();
        }
      }
    }
  }
  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n${results.length - failed.length} of ${results.length} passed${failed.length ? `; failed: ${failed.map(([l]) => l).join("; ")}` : ""}`);
  process.exitCode = failed.length ? 1 : 0;
}

// ── The tap walk: every touched control, real touch, motion on ─────────────

async function walk() {
  const rows = [];
  const check = (ok, what) => {
    rows.push([ok, what]);
    console.log(`${ok ? "pass" : "FAIL"}  ${what}`);
  };
  const width = WIDTHS[0];
  const L = wordsOf(LOCALES[0]);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const editedMark = new RegExp(`·\\s*${esc(L.edited)}`);
  const { browser, page, calls } = await open(width, LOCALES[0]);
  try {
    const motion = await page.evaluate(() => ({ html: document.documentElement.getAttribute("data-motion"), reduce: matchMedia("(prefers-reduced-motion: reduce)").matches }));
    check(motion.html !== "reduce" && !motion.reduce, `motion is on (data-motion ${motion.html ?? "unset"}, reduced motion ${motion.reduce})`);

    const box = async (loc) => (await loc.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
    const sent = (method, p) => calls.filter((c) => c.method === method && c.path === p);

    // 1. The post's menu opens where the finger is, and the button does not move.
    const dots = menuButton(page, P_MINE);
    const before = await box(dots);
    await dots.tap();
    await page.waitForSelector('[role="menu"]');
    const labels = await page.locator('[role="menu"] [role="menuitem"]').allInnerTexts();
    check(labels.join("|") === [L.viewProfile, L.edit, L.del].join("|"), `the own post's menu holds ${labels.join(", ")}`);
    const after = await box(dots);
    check(Math.abs(after.y - before.y) <= 4, `the menu's button stays under the finger (${Math.round(after.y - before.y)}px)`);

    // 2. Edit: the words open as fields where they stood, the caret in them.
    const cardTop = (await box(page.locator(article(P_MINE)))).y;
    await item(page, L.edit).tap();
    await page.waitForSelector(`${article(P_MINE)} [data-edit-words]`);
    const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, value: (document.activeElement && "value" in document.activeElement ? document.activeElement.value : "") }));
    check(focus.tag === "TEXTAREA" && focus.value === "What do you keep on Wednesdays and Fridays?", `Edit puts the caret in the words (${focus.tag}, "${focus.value}")`);
    check(Math.abs((await box(page.locator(article(P_MINE)))).y - cardTop) <= 4, "the post does not jump as it opens to edit");
    const field = page.locator(`${article(P_MINE)} textarea`);
    const fb = await box(field);
    check(fb.y >= 0 && fb.y + Math.min(fb.height, 60) <= HEIGHT[width], "the field is on the screen");

    // 3. Save is offered only once the words change; then it sends the words and says edited.
    const save = page.locator(`${article(P_MINE)} [data-edit-words] button`, { hasText: L.save });
    check(await save.isDisabled(), "Save waits until the words change");
    await field.fill("What do you keep on Wednesdays and Fridays in the fast?");
    check(!(await save.isDisabled()), "Save is offered once they do");
    await save.tap();
    await page.waitForSelector(`${article(P_MINE)} [data-edit-words]`, { state: "detached" });
    const patched = sent("PATCH", `/api/community/posts/${P_MINE}`);
    check(patched.length === 1 && patched[0].body?.body === "What do you keep on Wednesdays and Fridays in the fast?" && patched[0].body?.title === "Keeping the Nativity Fast", `Save sends the title and words (${JSON.stringify(patched[0]?.body ?? null)})`);
    const words = await page.locator(article(P_MINE)).innerText();
    check(words.includes("in the fast?") && editedMark.test(words), "the post shows the new words, and says edited");

    // 4. Cancel puts it back as it was.
    await menuButton(page, P_MINE).tap();
    await item(page, L.edit).tap();
    await page.locator(`${article(P_MINE)} textarea`).fill("Words not kept");
    await page.locator(`${article(P_MINE)} [data-edit-words] button`, { hasText: L.cancel }).tap();
    await page.waitForSelector(`${article(P_MINE)} [data-edit-words]`, { state: "detached" });
    check(!(await page.locator(article(P_MINE)).innerText()).includes("Words not kept"), "Cancel keeps the words as they were");

    // 5. A thread: the removed reply says so, and names nobody; her own says edited.
    await openThread(page, P_BEN);
    const removed = await page.locator(`#reply-${R_REMOVED}`).innerText();
    check(removed.trim().startsWith(`${L.removed} · `), `the removed reply says only that (${removed.trim()})`);
    check(editedMark.test(await page.locator(`#reply-${R_ANNA}`).innerText()), "her edited reply says edited");
    check((await page.locator(`#reply-${R_REMOVED} button`).count()) === 0, "the removed reply has no menu and nothing to tap");

    // 6. Her reply: Edit, then Save.
    const rdots = replyMenu(page, R_ANNA);
    const rbefore = await box(rdots);
    await rdots.tap();
    await page.waitForSelector('[role="menu"]');
    const rlabels = await page.locator('[role="menu"] [role="menuitem"]').allInnerTexts();
    check(rlabels.join("|") === [L.viewProfile, L.edit, L.del].join("|"), `her reply's menu holds ${rlabels.join(", ")}`);
    check(Math.abs((await box(rdots)).y - rbefore.y) <= 4, "the reply's menu button stays under the finger");
    await item(page, L.edit).tap();
    await page.waitForSelector(`#reply-${R_ANNA} [data-edit-words]`);
    const rfocus = await page.evaluate(() => document.activeElement?.tagName);
    check(rfocus === "TEXTAREA", `Edit puts the caret in the reply (${rfocus})`);
    await page.locator(`#reply-${R_ANNA} textarea`).fill("Amen. Glory to God for all things.");
    await page.locator(`#reply-${R_ANNA} [data-edit-words] button`, { hasText: L.save }).tap();
    await page.waitForSelector(`#reply-${R_ANNA} [data-edit-words]`, { state: "detached" });
    const rpatched = sent("PATCH", `/api/community/replies/${R_ANNA}`);
    check(rpatched.length === 1 && rpatched[0].body?.body === "Amen. Glory to God for all things.", `Save sends the reply's words (${JSON.stringify(rpatched[0]?.body ?? null)})`);
    check((await page.locator(`#reply-${R_ANNA}`).innerText()).includes("for all things."), "the reply shows its new words");

    // 7. Delete her reply: asked first, and it becomes a placeholder (someone answered after it).
    await replyMenu(page, R_ANNA).tap();
    await item(page, L.del).tap();
    const dialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
    await dialog.waitFor();
    check((await dialog.innerText()).includes(L.deleteReply), "Delete asks first");
    await dialog.locator("button", { hasText: L.del }).last().tap();
    await page.waitForFunction(([id, w]) => document.querySelector(`#reply-${id}`)?.textContent?.startsWith(w), [R_ANNA, L.removed], { timeout: 10000 });
    check(sent("DELETE", `/api/community/replies/${R_ANNA}`).length === 1, "the delete is sent once");
    check((await page.locator(`#reply-${R_ANNA}`).innerText()).startsWith(L.removed), "her reply now says it was removed by its author, and names nobody");

    // 8. Delete her post: asked first, and it stays as a placeholder with Ben's reply under it.
    await menuButton(page, P_MINE).tap();
    await item(page, L.del).tap();
    const pdialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
    await pdialog.waitFor();
    check((await pdialog.innerText()).includes(L.deletePost), "deleting the post asks first");
    await pdialog.locator("button", { hasText: L.del }).last().tap();
    await page.waitForFunction(([id, w]) => document.querySelector(`#post-${id}`)?.textContent?.includes(w), [P_MINE, L.removed], { timeout: 10000 });
    check(sent("DELETE", `/api/community/posts/${P_MINE}`).length === 1, "the post's delete is sent once");
    const placeholder = await page.locator(article(P_MINE)).innerText();
    check(!/Anna|Keeping the Nativity Fast|Wednesdays/.test(placeholder), "the post's placeholder carries nothing of her");
    check((await page.locator(`${article(P_MINE)} button[aria-haspopup="menu"]`).count()) === 0, "the placeholder has no menu");
  } catch (e) {
    check(false, `the walk stopped: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
  } finally {
    await browser.close();
  }
  const failed = rows.filter(([ok]) => !ok);
  console.log(`\n${rows.length - failed.length} of ${rows.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
}

if (WALK) await walk();
else await stills();
