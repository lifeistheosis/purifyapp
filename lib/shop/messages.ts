import type { SupabaseClient } from "@supabase/supabase-js";

import type { ShopMessage } from "@/lib/shop/types";

// The public message columns a thread renders. sender_user_id is deliberately
// NOT selected — the counterparty's auth id never needs to reach a browser.
const BASE_COLS = "id, conversation_id, sender, body, created_at";

/**
 * Load a conversation's messages for the thread view, tolerating a
 * pre-migration schema where the `reaction` column doesn't exist yet. It tries
 * the read with `reaction` first and falls back to the base columns if that
 * errors, so the thread keeps working before 20260718_message_reactions.sql is
 * applied (reactions simply don't render until then). Works with any Supabase
 * client — the buyer's browser client, the seller's server client, or the
 * service-role admin client.
 */
export async function fetchThreadMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ShopMessage[]> {
  const withReaction = await supabase
    .from("shop_messages")
    .select(`${BASE_COLS}, reaction`)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (!withReaction.error) {
    return (withReaction.data ?? []) as unknown as ShopMessage[];
  }
  const base = await supabase
    .from("shop_messages")
    .select(BASE_COLS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  return (base.data ?? []) as unknown as ShopMessage[];
}
