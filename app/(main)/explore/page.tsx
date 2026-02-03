import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExploreView } from "@/components/explore/explore-view"

export default async function ExplorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get all posts (excluding user's own posts) for explore grid
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (*),
      likes (id),
      comments (id)
    `)
    .neq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const postsWithCounts =
    posts?.map((post) => ({
      ...post,
      likes_count: post.likes?.length || 0,
      comments_count: post.comments?.length || 0,
    })) || []

  return <ExploreView posts={postsWithCounts} currentUserId={user.id} />
}
