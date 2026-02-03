import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ChatView } from "@/components/messages/chat-view"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify user is part of this conversation
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single()

  if (!participation) {
    notFound()
  }

  // Get other participant
  const { data: otherParticipant } = await supabase
    .from("conversation_participants")
    .select(`
      profiles (id, username, avatar_url, full_name)
    `)
    .eq("conversation_id", id)
    .neq("user_id", user.id)
    .single()

  // Get messages
  const { data: messages } = await supabase
    .from("messages")
    .select(`
      *,
      profiles (id, username, avatar_url)
    `)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  return (
    <ChatView
      conversationId={id}
      otherUser={
        otherParticipant?.profiles as {
          id: string
          username: string | null
          avatar_url: string | null
          full_name: string | null
        }
      }
      initialMessages={messages || []}
      currentUserId={user.id}
    />
  )
}
