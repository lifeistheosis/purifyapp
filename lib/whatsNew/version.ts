// Single source of truth for the "What's new" notification state. Bump
// CURRENT_VERSION whenever a release surfaces in the hero chip so the glowing
// "New" badge returns for every reader (their localStorage holds the last
// version they opened; a mismatch re-arms the badge).

export const CURRENT_VERSION = "Beta 2.1";

export const WHATS_NEW_SEEN_KEY = "purify:whatsNewSeen";
