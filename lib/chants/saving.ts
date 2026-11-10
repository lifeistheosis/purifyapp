/**
 * Who may keep a chant on the phone (1.9, item 8): the one switch.
 *
 * "plus": as a book's readings are kept (components/player/SaveOffline.tsx
 * asks Plus first), and the Plus screen's Listen offline line names chants
 * (lib/premium/plusRows.ts). "free": every reader may keep one, and that line
 * speaks of books alone. Nothing else changes with it. The saving itself is
 * lib/chants/offline.ts.
 *
 * Pure, and alone in its file, so the Plus rows and their tests read it
 * without the player.
 */
export const CHANT_SAVING: "plus" | "free" = "plus";
