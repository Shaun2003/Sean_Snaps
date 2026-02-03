import { createClient } from "@/lib/supabase/client"

export async function createNotification({
  userId,
  actorId,
  type,
  postId,
  commentId,
  message,
}: {
  userId: string
  actorId: string
  type: "like" | "comment" | "follow"
  postId?: string
  commentId?: string
  message?: string
}) {
  // Don't notify yourself
  if (userId === actorId) return

  const supabase = createClient()

  await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: actorId,
    type,
    post_id: postId || null,
    comment_id: commentId || null,
    message: message || null,
  })
}
