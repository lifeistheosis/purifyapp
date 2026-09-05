import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentBoardMessage, type BoardMessage } from "@/lib/whatsNew/board";

/**
 * The board message readers see, and where it came from.
 *
 * Same shape as lib/whatsNew/notes.ts: the live row when the board_messages
 * table answers, the committed data/changelog/board.json otherwise. The table
 * may not exist (the migration ships NOT SIGNED OFF), the build machine for the
 * native export has no service role key, and neither case may reach a reader
 * as anything but the file.
 */

export type BoardRow = {
  id: string;
  week: string;
  date: string;
  eyebrow: string;
  headline: string;
  body: string[];
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
  updated_by_email: string | null;
};

export const BOARD_COLUMNS =
  "id, week, date, eyebrow, headline, body, status, published_at, updated_at, updated_by_email";

export function boardRowToMessage(r: BoardRow): BoardMessage {
  return {
    week: r.week,
    date: r.date,
    eyebrow: r.eyebrow,
    headline: r.headline,
    body: Array.isArray(r.body) ? r.body.map(String) : [],
  };
}

export async function getBoardMessage(): Promise<{
  message: BoardMessage | undefined;
  fromFallback: boolean;
}> {
  const fallback = { message: currentBoardMessage(), fromFallback: true };
  try {
    const supa = createAdminClient();
    const { data, error } = await supa
      .from("board_messages")
      .select(BOARD_COLUMNS)
      .eq("status", "published")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return fallback;
    return { message: boardRowToMessage(data as BoardRow), fromFallback: false };
  } catch {
    return fallback;
  }
}
