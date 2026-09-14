import { supabase } from "@/lib/supabase/client";

type ConversationUnreadInfo = {
  id: string;
  updated_at: string;
  last_message_sender_id: string | null;
};

/**
 * A conversation is unread for a user when the other participant's most
 * recent message is newer than this user's last-read time for that thread
 * (or they've never read it at all).
 */
export async function getUnreadConversationIds(
  userId: string,
  role: "car_owner" | "shop_owner"
): Promise<Set<string>> {
  let conversations: ConversationUnreadInfo[];

  if (role === "car_owner") {
    const { data } = await supabase
      .from("conversations")
      .select("id, updated_at, last_message_sender_id")
      .eq("car_owner_id", userId);
    conversations = data ?? [];
  } else {
    const { data: shopRow } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", userId)
      .single();

    if (!shopRow) return new Set();

    const { data } = await supabase
      .from("conversations")
      .select("id, updated_at, last_message_sender_id")
      .eq("shop_id", shopRow.id);
    conversations = data ?? [];
  }

  const candidates = conversations.filter(
    (c) => c.last_message_sender_id && c.last_message_sender_id !== userId
  );
  if (candidates.length === 0) return new Set();

  const { data: readRows } = await supabase
    .from("conversation_reads")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId)
    .in(
      "conversation_id",
      candidates.map((c) => c.id)
    );

  const lastReadByConversation = new Map(
    (readRows ?? []).map((row) => [row.conversation_id, row.last_read_at])
  );

  const unread = new Set<string>();
  for (const c of candidates) {
    const lastRead = lastReadByConversation.get(c.id);
    if (!lastRead || new Date(c.updated_at) > new Date(lastRead)) {
      unread.add(c.id);
    }
  }
  return unread;
}

export const CONVERSATION_READ_EVENT = "conversation-read";

/** Marks a conversation as read up to now for the given user. */
export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_reads")
    .upsert(
      { conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" }
    );
  // Nav's unread dot is fetched independently of this call (different
  // component, own effect), so without this it can race ahead and compute
  // "unread" using the pre-update read state. Let it know to re-check.
  window.dispatchEvent(new Event(CONVERSATION_READ_EVENT));
}
