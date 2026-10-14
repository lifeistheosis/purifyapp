"use client";

import { BoardMessageView } from "@/components/whats-new/BoardMessageView";
import { useBoardMessage } from "@/lib/packs/usePacks";
import type { BoardMessage } from "@/lib/whatsNew/board";

/**
 * The board message, with the apps' content pack in front of the one the
 * page was built with when the pack's is newer (lib/packs/usePacks.ts).
 *
 * In the apps /whats-new was written when the build was made, so the weekly
 * message used to be whatever board.json said that day, for the life of the
 * build. On the website the server already reads the live table and the pack
 * is never used, so this draws exactly what it is handed.
 */
export function BoardMessageLive({ message }: { message: BoardMessage | null }) {
  const shown = useBoardMessage(message);
  return shown ? <BoardMessageView message={shown} /> : null;
}
