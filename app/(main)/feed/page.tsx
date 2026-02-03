import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FeedView } from "@/components/feed/feed-view"
import { StoriesBar } from "@/components/stories/stories-bar"

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get posts from users the current user follows + own posts
  const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id)

  const followingIds = following?.map((f) => f.following_id) || []
  const userIds = [...followingIds, user.id]

  const { data: posts } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (*),
      likes (id, user_id),
      comments (id)
    `)
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(50)

  const postsWithCounts =
    posts?.map((post) => ({
      ...post,
      likes_count: post.likes?.length || 0,
      comments_count: post.comments?.length || 0,
      is_liked: post.likes?.some((like: { user_id: string }) => like.user_id === user.id) || false,
    })) || []

  // Get active stories
  const { data: stories } = await supabase
    .from("stories")
    .select(`
      *,
      profiles (*)
    `)
    .in("user_id", userIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  // Group stories by user
  const storiesByUser =
    stories?.reduce(
      (acc, story) => {
        if (!acc[story.user_id]) {
          acc[story.user_id] = {
            user: story.profiles,
            stories: [],
          }
        }
        acc[story.user_id].stories.push(story)
        return acc
      },
      {} as Record<string, { user: (typeof stories)[0]["profiles"]; stories: typeof stories }>,
    ) || {}

  return (
    <div className="container mx-auto max-w-lg">
      <StoriesBar storiesByUser={storiesByUser} currentUserId={user.id} />
      <FeedView posts={postsWithCounts} currentUserId={user.id} />
    </div>
  )
}
