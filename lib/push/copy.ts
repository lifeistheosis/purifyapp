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

  // ── Community (lib/community/push.ts) ──────────────────────────────────
  //
  // A person did something that concerns you: answered you, named you,
  // followed you, greeted you, prayed for you. Each is one thing that is
  // there, from one person, sent only to the reader it concerns and only
  // while they leave community notifications on. "{name}" is the other
  // reader's display name; communityPushCopy() fills it, checks the result
  // against the same bar, and falls back to the row without a name when a
  // name would break it. What they wrote never reaches the lock screen.
  communityReply: {
    key: "communityReply",
    title: "{name} replied to you",
    body: "Their reply is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "A reader answered the reader's own post. It says only that the answer exists and who gave it; the words stay in the app, behind the lock.",
  },
  communityMention: {
    key: "communityMention",
    title: "{name} mentioned you",
    body: "The conversation is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "Somebody addressed the reader by name in a conversation. Being spoken to is the one thing a person would want to know about, and nothing else is said.",
  },
  communityFollow: {
    key: "communityFollow",
    title: "{name} followed you",
    body: "Their profile is in Community.",
    url: ({ id }) => `/community#@${id}`,
    rationale: "A person chose to follow the reader. It names them and offers their profile; it does not count followers.",
  },
  communityNameDay: {
    key: "communityNameDay",
    title: "{name} wished you many years",
    body: "A greeting for your name day.",
    url: ({ id }) => `/community#@${id}`,
    rationale:
      "A greeting from another reader on the reader's name day. The feast supplies the occasion and a person supplies the greeting; the application only carries it.",
  },
  communityPrayed: {
    key: "communityPrayed",
    title: "{name} prayed for you",
    body: "In answer to your prayer request.",
    url: ({ id }) => `/community#@${id}`,
    rationale:
      "The reader asked others to pray for them, and someone has. It is the answer to their own request, and it says nothing about how many have or have not.",
  },
  communityGift: {
    key: "communityGift",
    title: "{name} sent you a gift",
    body: "Open Purify to receive it.",
    url: "/account",
    rationale: "A gift another reader bought for this one. It is theirs whether or not they open the app today, so nothing here hurries them.",
  },
  communityQuestion: {
    key: "communityQuestion",
    title: "A question for clergy",
    body: "A reader asked a question in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale:
      "Sent only to verified clergy, who chose to answer readers' questions. The question itself is not shown: it may be personal, and the lock screen is read by whoever is in the room.",
  },
  communityAnswer: {
    key: "communityAnswer",
    title: "{name} answered your question",
    body: "The answer is in Community.",
    url: ({ id }) => `/community#post-${id}`,
    rationale: "Verified clergy answered the reader's own question. The reader asked; this is the reply arriving.",
  },
  communityApproved: {
    key: "communityApproved",
    title: "Your post is up",
    body: "A moderator looked at it, and it is in Community now.",
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

/** The same rows without a person in them, for a name the bar refuses. */
const NAMELESS: Record<CommunityPushKind, string> = {
  reply: "A reply to your post",
  mention: "Someone mentioned you",
  follow: "A new follower",
  name_day: "A name day greeting",
  prayed: "Someone prayed for you",
  gift: "A gift for you",
  question: "A question for clergy",
  answer: "An answer to your question",
  approved: "Your post is up",
};

/**
 * One community notification's words and link.
 *
 * `target` is a post id for the kinds about a post, else the actor's @handle,
 * which opens their profile. The finished title is checked against the bar;
 * a name that breaks it (a digit, an exclamation mark) is left out rather
 * than sent.
 */
export function communityPushCopy(
  kind: CommunityPushKind,
  actorName: string | null,
  target: string | null,
): { title: string; body: string; url: string } {
  const row = NOTIFICATION_COPY[COMMUNITY_ROW[kind]];
  const name = (actorName ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const named = name && row.title.includes("{name}") ? row.title.replace("{name}", name) : null;
  const title =
    named && checkNotificationCopy({ title: named, body: row.body }).length === 0 ? named : NAMELESS[kind];
  const url =
    typeof row.url === "function" ? (target ? row.url({ id: target }) : "/community#conversations") : row.url;
  return { title, body: row.body, url };
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
