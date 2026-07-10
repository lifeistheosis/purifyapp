import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopMessageSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Replies into an existing thread, from either side. Participation is
 * proven by RLS: the conversation is fetched with the caller's own
 * client, so if it comes back at all the caller is the buyer or the
 * seller. Which side they are decides the sender tag; a user who owns
 * the seller row speaks as the store.
 */

async function loadParticipant(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, conversation: null, side: null } as const;

  const { data: conversation } = await supabase
    .from("shop_conversations")
    .select("id, buyer_user_id, seller_id, status")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return { user, conversation: null, side: null } as const;

  let side: "buyer" | "seller";
  if (conversation.buyer_user_id === user.id) {
    side = "buyer";
  } else {
    // RLS returned the row and the caller isn't the buyer, so they own
    // the seller row; no second lookup needed.
    side = "seller";
  }
  return { user, conversation, side } as const;
}

export async function POST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { user, conversation, side } = await loadParticipant(
    parsed.data.conversationId,
  );
  if (!user) {
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  }
  if (!conversation || !side) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  if (conversation.status !== "open") {
    return NextResponse.json(
      { error: "This conversation is closed." },
      { status: 409 },
    );
  }
  if (await rateLimited(`shop-msg:${user.id}`, 3600, 120)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("shop_messages").insert({
    conversation_id: conversation.id,
    sender: side,
    sender_user_id: user.id,
    body: parsed.data.body,
  });
  if (error) {
    console.warn("[shop] message insert failed", error.message);
    return NextResponse.json(
      { error: "Couldn't send the message. Please try again." },
      { status: 500 },
    );
  }
  await admin
    .from("shop_conversations")
    .update({
      last_message_at: now,
      ...(side === "buyer"
        ? { buyer_last_read_at: now }
        : { seller_last_read_at: now }),
    })
    .eq("id", conversation.id);

  return NextResponse.json({ ok: true });
}

const readSchema = z.object({ conversationId: z.string().uuid() });

/** Mark the caller's side of a thread as read (thread page on open). */
export async function PATCH(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = readSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { user, conversation, side } = await loadParticipant(
    parsed.data.conversationId,
  );
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!conversation || !side) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  await admin
    .from("shop_conversations")
    .update(
      side === "buyer"
        ? { buyer_last_read_at: new Date().toISOString() }
        : { seller_last_read_at: new Date().toISOString() },
    )
    .eq("id", conversation.id);
  return NextResponse.json({ ok: true });
}
