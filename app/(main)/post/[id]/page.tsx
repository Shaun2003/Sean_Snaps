import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { PostDetailView } from "@/components/post/post-detail-view"

export default async function PostDetailPage({
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

  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (*),
      likes (id, user_id),
      comments (
        *,
        profiles (*)
      )
    `)
    .eq("id", id)
    .single()

  if (!post) {
    notFound()
  }

  const postWithCounts = {
    ...post,
    likes_count: post.likes?.length || 0,
    comments_count: post.comments?.length || 0,
    is_liked: post.likes?.some((like: { user_id: string }) => like.user_id === user.id) || false,
  }

  return <PostDetailView post={postWithCounts} currentUserId={user.id} />
}
