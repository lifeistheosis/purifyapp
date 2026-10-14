import { getBoardMessage } from "@/lib/whatsNew/boardLive";
import { BoardMessageLive } from "@/components/whats-new/BoardMessageLive";

/**
 * The weekly board message at the top of /whats-new.
 *
 * Renders nothing when no message has been written, so a missed week degrades
 * to the evergreen welcome around it rather than to an empty heading or a
 * stale one. That is the failure mode this replaced: the old hand-written
 * block sat on Beta 1.7 for eight releases because nothing made it obvious it
 * had gone out of date.
 *
 * Since 2026-09-04 the message is read from the board_messages table, edited
 * from /admin, with data/changelog/board.json as the fallback and the native
 * bundle. See lib/whatsNew/boardLive.ts.
 *
 * Deliberately not translated. Every other locale falls back to English here,
 * the same way the long-prose sections of this page already do, because a
 * weekly note written on Sunday cannot wait on translation and a stale
 * translation would be worse than an honest English one. `TranslationDisclaimer`
 * at the top of the page already says so.
 */
export async function BoardMessage() {
  const { message } = await getBoardMessage();
  // Drawn even with no message: in the apps a content pack may bring one
  // (components/whats-new/BoardMessageLive.tsx), and with none it draws
  // nothing, as this did.
  return <BoardMessageLive message={message ?? null} />;
}
