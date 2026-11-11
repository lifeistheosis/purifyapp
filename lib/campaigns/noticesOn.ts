// Whether prayer campaigns tell anyone anything in their inbox (1.9, phase
// 4): a creator that a moderator has read their campaign, and a reader who
// asked that a campaign in their prayers has an update
// (lib/campaigns/notices.ts, which says what each is and why it names
// nobody).
//
// ON, from 2026-11-11, at the owner's yes to the words the inbox says them in
// ("yes campaign lines", call 29). It was off until the inbox could say the
// two in their own words: drawn by its kind alone, the one would have read
// "approved your post" and the other "replied to your post". The inbox's two
// components (the admin chat's: components/community/NotificationsInbox.tsx
// and the bell's sheet) now ask `target_kind === "campaign"` first, and
// lib/campaigns/__tests__/notices.test.ts refuses this switch on without
// that.
//
// To turn them off again, set this to false: no row is written, and the line
// that lets a reader ask to be told of updates is not drawn, so nobody is
// offered a promise the app would not keep. No secret is here, so the server
// and the screens both read it.

export const CAMPAIGN_NOTICES: boolean = true;
