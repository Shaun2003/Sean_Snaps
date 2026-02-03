import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ConversationsList } from "@/components/messages/conversations-list"

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's conversations
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id)

  const conversationIds = participations?.map((p) => p.conversation_id) || []

  const conversations: Array<{
    id: string
    updated_at: string
    other_user: {
      id: string
      username: string | null
      avatar_url: string | null
      full_name: string | null
    } | null
    last_message: {
      content: string
      created_at: string
      sender_id: string
    } | null
  }> = []

  if (conversationIds.length > 0) {
    const { data: convos } = await supabase
      .from("conversations")
      .select("id, updated_at")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false })

    if (convos) {
      for (const convo of convos) {
        // Get other participant
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profiles (id, username, avatar_url, full_name)
          `)
          .eq("conversation_id", convo.id)
          .neq("user_id", user.id)
          .single()

        // Get last message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        conversations.push({
          ...convo,
          other_user: otherParticipant?.profiles as (typeof conversations)[0]["other_user"],
          last_message: lastMessage,
        })
      }
    }
  }

  return <ConversationsList conversations={conversations} currentUserId={user.id} />
}
