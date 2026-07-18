import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { shopMessageSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Replies into an existing thread, from either side. Participation is
 * proven by RLS: the conversation is fetched with the caller's own
 * client, so if it comes back at all the caller is the buyer or the
 * seller. Which side they are decides the sender tag; a user who owns
 * the seller row speaks as the store.
 */

async function loadParticipant(req: Request, conversationId: string) {
  const supabase = await createClientFromRequest(req);
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

async function handlePOST(req: Request) {
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
    req,
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

// A reaction toggle on one message: the only reaction is a heart, or null to
// clear it. messageId distinguishes this from the read-mark body shape.
const reactSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  reaction: z.union([z.literal("❤️"), z.null()]),
});

/**
 * PATCH handles two thread updates, told apart by body shape:
 *   { conversationId }                        → mark the caller's side read
 *   { conversationId, messageId, reaction }   → toggle a message reaction
 * Both prove participation via loadParticipant (the conversation is fetched
 * with the caller's own RLS-scoped client).
 */
async function handlePATCH(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // React path first: a body carrying messageId is a reaction toggle.
  if (body && typeof body === "object" && "messageId" in body) {
    const parsed = reactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { user, conversation, side } = await loadParticipant(
      req,
      parsed.data.conversationId,
    );
    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }
    if (!conversation || !side) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const admin = createAdminClient();
    // Scope the update to this conversation so a participant can only react to
    // messages in a thread they're part of.
    const { error } = await admin
      .from("shop_messages")
      .update({ reaction: parsed.data.reaction })
      .eq("id", parsed.data.messageId)
      .eq("conversation_id", conversation.id);
    if (error) {
      // Pre-migration the reaction column may not exist yet. Fail soft so the
      // optimistic UI simply reconciles to no-reaction on the next read.
      console.warn("[shop] reaction update failed", error.message);
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = readSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { user, conversation, side } = await loadParticipant(
    req,
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

export const POST = corsRoute(handlePOST);
export const PATCH = corsRoute(handlePATCH);
export const OPTIONS = corsPreflight;
