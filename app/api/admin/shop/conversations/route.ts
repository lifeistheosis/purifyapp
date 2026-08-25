import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { emailsByUserId } from "@/lib/admin/accountEmails";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner dashboard: every buyer <-> store conversation. Read-only plus
 * close/reopen — the owner watches for stuck threads and disputes but
 * never speaks AS a store; replies belong to the store's own console.
 * `?id=` returns one thread's messages; without it, the list.
 */

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const { data: messages, error } = await admin
      .from("shop_messages")
      .select("id, conversation_id, sender, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      { messages: messages ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: conversations, error } = await admin
    .from("shop_conversations")
    .select("*, store:shop_stores(public_name, slug)")
    .order("last_message_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Buyer emails. This read profiles.email, a column that does not exist, and
  // threw the 42703 away, so every conversation showed a blank buyer forever.
  // See lib/admin/accountEmails.ts.
  const buyerIds = [
    ...new Set((conversations ?? []).map((c) => c.buyer_user_id).filter(Boolean)),
  ] as string[];
  const emailById = await emailsByUserId(buyerIds);

  return NextResponse.json(
    {
      conversations: (conversations ?? []).map((c) => ({
        ...c,
        buyer_email: emailById.get(c.buyer_user_id) ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const patchSchema = z.object({
  conversationId: z.string().uuid(),
  status: z.enum(["open", "closed"]),
});

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_conversations")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.conversationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
