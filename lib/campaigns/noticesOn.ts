// Whether prayer campaigns tell anyone anything in their inbox (1.9, phase
// 4): a creator that a moderator has read their campaign, and a reader who
// asked that a campaign in their prayers has an update
// (lib/campaigns/notices.ts, which says what each is and why it names
// nobody).
//
// OFF, and it stays off until the inbox can say the two in their own words.
// The inbox draws a row by its kind, so before its two components ask
// `target_kind === "campaign"` first, the one would read "approved your post"
// and the other "replied to your post". Those components are the admin
// chat's (components/community/NotificationsInbox.tsx and the bell's sheet);
// turning this on is the last line of that change, and
// lib/campaigns/__tests__/notices.test.ts refuses it while the inbox still
// has no words for a campaign.
//
// While it is off: no row is written, and the line that lets a reader ask to
// be told of updates is not drawn, so nobody is offered a promise the app
// would not keep. No secret is here, so the server and the screens both read
// it.

export const CAMPAIGN_NOTICES: boolean = false;
