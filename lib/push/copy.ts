/**
 * Every string Purify can put on a lock screen.
 *
 * THE POINT OF A TABLE. You cannot test text that does not exist yet, and
 * before this file the admin broadcast was an arbitrary string checked only
 * for length. So the enforcement had to start by moving the text: from
 * "anything, validated" to "one of these, parameterised". Words live here and
 * only here, and lib/push/__tests__/doctrine.test.ts fails the build if a
 * title or body literal appears anywhere else under lib/push.
 *
 * That scan is the load-bearing half. The word lists in ./doctrine.ts catch a
 * careless sentence; the scan catches a whole new sender appearing in a file
 * nobody thought to check, which is how the five payloads that existed before
 * this file came to differ from each other in the first place.
 *
 * THE SHAPE OF A PERMITTED NOTIFICATION. It names an hour, or says that
 * something is there. It never says how the reader has been doing, never says
 * how long it has been, and never asks for anything back. The monastery does
 * not tell the monk he is falling behind on his goals. It strikes the talanton
 * and the community comes.
 *
 * The `rationale` field is deliberately not machine-checked. It is the part
 * that cannot be automated, so it is written down instead of assumed: a human
 * adding a row has to say, in prose, why this one earns a lock screen.
 */

import { checkNotificationCopy } from "./doctrine";

export type NotificationKey =
  | "morning"
  | "evening"
  | "campaign"
  | "fastBegins"
  | "feast"
  | "announcement"
  | "eikonBoxOpen"
  | "communityReply"
  | "communityMention"
  | "communityFollow"
  | "communityNameDay"
  | "communityPrayed"
  | "communityGift"
  | "communityQuestion"
  | "communityAnswer"
  | "communityApproved";

export type NotificationCopy = {
  key: NotificationKey;
  title: string;
  body: string;
  /** A site path. Parameterised where the destination depends on a row. */
  url: string | ((params: { id: string }) => string);
  /** Why this may reach a lock screen. Read by a human at review time. */
  rationale: string;
};

export const NOTIFICATION_COPY: Readonly<Record<NotificationKey, NotificationCopy>> = {
  morning: {
    key: "morning",
    title: "Morning prayer",
    body: "Open the morning rule when you rise.",
    url: "/prayers/morning",
    rationale:
      "An hour the reader themselves set a time for. It names the hour and offers the door, and says nothing about whether yesterday's was prayed.",
  },
  evening: {
    key: "evening",
    title: "Evening prayer",
    body: "Open the evening rule when you lie down.",
    url: "/prayers/evening",
    rationale: "As morning. The pair is one opt-in, not two features multiplying.",
  },
  campaign: {
    key: "campaign",
    title: "Your prayer campaign",
    body: "Open it when you are ready.",
    url: ({ id }) => `/campaigns/detail?id=${encodeURIComponent(id)}`,
    rationale:
      "A campaign is frequently 'for my mother's surgery'. The payload crosses APNs and FCM in plaintext and is stored in a Postgres column, so the intention stays behind the lock and this says only that the thing exists. It named a beneficiary until 2026-08-22, which made not opening the app a failure toward a person.",
  },
  fastBegins: {
    key: "fastBegins",
    title: "A fast begins tomorrow",
    body: "The rule for it is in the calendar.",
    url: "/calendar",
    rationale:
      "The one urgency Purify is allowed to carry, because the Church supplies it rather than the product. It states a fact about the year and does not ask the reader to prepare, promise or report.",
  },
  feast: {
    key: "feast",
    title: "A feast is kept today",
    body: "Today's commemoration is in the calendar.",
    url: "/calendar",
    rationale: "As above. A fact about the day, with a door to it.",
  },
  announcement: {
    key: "announcement",
    title: "A word from Purify",
    body: "There is something new to read.",
    url: "/whats-new",
    rationale:
      "The default template for an operator broadcast. Free text remains possible through the admin route, but it passes the same check this row does, so the template is the path of least resistance rather than the only one.",
  },
  eikonBoxOpen: {
    key: "eikonBoxOpen",
    title: "The EIKON Box is open",
    body: "Claim yours in Purify. We gather each box to the number claimed.",
    url: "/account/eikon-box",
    rationale:
      "The owner's word to Pro members that a drop is open (app/api/admin/eikon-box/announce). It names no date and no count: the claim window is on the drop's own page, and a deadline on a lock screen is a clock on the reader. The ready-made words used to give the closing date, which the bar refuses.",
  },

  // ── Community (lib/community/push.ts) ──────────────────────────────────
  //
  // A person did something that concerns you: answered you, named you,
  // followed you, greeted you, prayed for you. Each is one thing that is
  // there, sent only to the reader it concerns and only while they leave
  // community notifications on. NOBODY IS NAMED, since 2026-11-01 (the
  // owner's word on the notifications findings): the other reader's name
  // stays in the inbox inside the app, as what they wrote always has, and
  // the lock screen, read by whoever is in the room, says only what
  // happened. The words are in every reader's language, under the keys
  // push.community.* in lib/i18n/messages (communityPushCopy picks them);
  // these English rows are the same words, and the ones the bar is read
  // against.
  communityReply: {
    key: "communityReply",
    title: "Someone replied to your post",
    body: "It is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "A reader answered the reader's own post. It says only that the answer exists; who gave it and what they said stay in the app, behind the lock.",
  },
  communityMention: {
    key: "communityMention",
    title: "Someone mentioned you",
    body: "It is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "Somebody addressed the reader by name in a conversation. Being spoken to is the one thing a person would want to know about, and nothing else is said.",
  },
  communityFollow: {
    key: "communityFollow",
    title: "Someone followed you",
    body: "It is in Community.",
    url: ({ id }) => `/community#@${id}`,
    rationale: "A person chose to follow the reader. It says so and opens their profile; it does not count followers or name them.",
  },
  communityNameDay: {
    key: "communityNameDay",
    title: "Someone wished you many years",
    body: "It is in Community.",
    url: ({ id }) => `/community#@${id}`,
    rationale:
      "A greeting from another reader on the reader's name day. The feast supplies the occasion and a person supplies the greeting; the application only carries it.",
  },
  communityPrayed: {
    key: "communityPrayed",
    title: "Someone prayed for you",
    body: "It is in Community.",
    url: ({ id }) => `/community#@${id}`,
    rationale:
      "The reader asked others to pray for them, and someone has. It is the answer to their own request, and it says nothing about how many have or have not.",
  },
  communityGift: {
    key: "communityGift",
    title: "Someone gave you Purify Plus",
    body: "It is in your account.",
    url: "/account",
    rationale: "A gift another reader bought for this one. It is theirs whether or not they open the app today, so nothing here hurries them.",
  },
  communityQuestion: {
    key: "communityQuestion",
    title: "Someone asked a question for clergy",
    body: "It is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "Sent only to verified clergy, who chose to answer readers' questions. The question itself is not shown: it may be personal, and the lock screen is read by whoever is in the room.",
  },
  communityAnswer: {
    key: "communityAnswer",
    title: "Someone answered your question",
    body: "It is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale: "Verified clergy answered the reader's own question. The reader asked; this is the reply arriving.",
  },
  communityApproved: {
    key: "communityApproved",
    title: "Your post was approved",
    body: "It is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "The reader's own post waited for a moderator, and they were told so when they wrote it. This closes that, once, and asks for nothing.",
  },
};

export type CommunityPushKind =
  | "reply"
  | "mention"
  | "follow"
  | "name_day"
  | "prayed"
  | "gift"
  | "question"
  | "answer"
  | "approved";

const COMMUNITY_ROW: Record<CommunityPushKind, NotificationKey> = {
  reply: "communityReply",
  mention: "communityMention",
  follow: "communityFollow",
  name_day: "communityNameDay",
  prayed: "communityPrayed",
  gift: "communityGift",
  question: "communityQuestion",
  answer: "communityAnswer",
  approved: "communityApproved",
};

/** Where each kind's words are kept in the message catalogs, in every language. */
export const COMMUNITY_PUSH_KEYS: Record<CommunityPushKind, { title: string; body: string }> = {
  reply: { title: "push.community.reply", body: "push.community.body" },
  mention: { title: "push.community.mention", body: "push.community.body" },
  follow: { title: "push.community.follow", body: "push.community.body" },
  name_day: { title: "push.community.nameDay", body: "push.community.body" },
  prayed: { title: "push.community.prayed", body: "push.community.body" },
  gift: { title: "push.community.gift", body: "push.community.giftBody" },
  question: { title: "push.community.question", body: "push.community.body" },
  answer: { title: "push.community.answer", body: "push.community.body" },
  approved: { title: "push.community.approved", body: "push.community.body" },
};

/**
 * One community notification's words and link, in the reader's language.
 *
 * `target` is a post id for the kinds about a post, else the actor's @handle,
 * which opens their profile: an address, read after the phone is unlocked,
 * and never shown. No name is taken at all, so none can reach a lock screen.
 * `words` is the reader's message catalog (lib/i18n getMessages, on the
 * server); a translation that is missing, or that would break the bar, gives
 * way to the English row, never to nothing.
 */
export function communityPushCopy(
  kind: CommunityPushKind,
  target: string | null,
  words?: Readonly<Record<string, string>>,
): { title: string; body: string; url: string } {
  const row = NOTIFICATION_COPY[COMMUNITY_ROW[kind]];
  const keys = COMMUNITY_PUSH_KEYS[kind];
  const translated = { title: words?.[keys.title], body: words?.[keys.body] };
  const usable =
    typeof translated.title === "string" &&
    typeof translated.body === "string" &&
    checkNotificationCopy({ title: translated.title, body: translated.body }).length === 0;
  const url =
    typeof row.url === "function" ? (target ? row.url({ id: target }) : "/community#conversations") : row.url;
  return {
    title: usable ? (translated.title as string) : row.title,
    body: usable ? (translated.body as string) : row.body,
    url,
  };
}

/** The scheduled prayer rules. Takes no caller text, deliberately. */
export function reminderCopy(kind: "morning" | "evening"): {
  title: string;
  body: string;
  url: string;
} {
  const row = NOTIFICATION_COPY[kind];
  return { title: row.title, body: row.body, url: row.url as string };
}

/**
 * One campaign reminder.
 *
 * The id reaches the URL and never the visible text. That separation is the
 * whole privacy design: a deep link is opened after the phone is unlocked, and
 * a title is read by whoever is in the room.
 */
export function campaignCopy(campaignId: string): {
  title: string;
  body: string;
  url: string;
} {
  const row = NOTIFICATION_COPY.campaign;
  const url = row.url as (p: { id: string }) => string;
  return { title: row.title, body: row.body, url: url({ id: campaignId }) };
}

/**
 * The ready-made words for announcing an EIKON Box drop (the EIKON Box tab).
 * The drop's own name when it clears the bar ("The Nativity box is open"),
 * else the row's title, so the words offered can always be sent as they are.
 * The owner may change them; the route holds what is sent to the same bar.
 */
export function eikonBoxAnnouncement(dropTitle: string): { title: string; body: string; url: string } {
  const row = NOTIFICATION_COPY.eikonBoxOpen;
  const named = `${dropTitle.replace(/\s+/g, " ").trim()} is open`;
  const title = dropTitle.trim() && checkNotificationCopy({ title: named, body: row.body }).length === 0 ? named : row.title;
  return { title, body: row.body, url: row.url as string };
}

/**
 * The templates an operator may broadcast without writing anything.
 *
 * Returned to the admin UI so the recurring cases are one click. A template
 * cannot fail the check, because the table it comes from is what the doctrine
 * test iterates.
 */
export function broadcastTemplates(): { key: NotificationKey; title: string; body: string; url: string }[] {
  return (["announcement", "fastBegins", "feast"] as const).map((k) => {
    const row = NOTIFICATION_COPY[k];
    return { key: row.key, title: row.title, body: row.body, url: row.url as string };
  });
}

/**
 * A development-time assertion that the table itself is clean.
 *
 * The real gate is the test. This exists so a row added during a dev session
 * fails at import rather than at CI twenty minutes later.
 */
if (process.env.NODE_ENV !== "production") {
  for (const row of Object.values(NOTIFICATION_COPY)) {
    const violations = checkNotificationCopy(row);
    if (violations.length > 0) {
      throw new Error(
        `NOTIFICATION_COPY.${row.key} breaches the copy bar: ${violations
          .map((v) => v.clause)
          .join(", ")}`,
      );
    }
  }
}
