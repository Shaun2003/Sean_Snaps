import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ProfileView } from "@/components/profile/profile-view"

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (!profile) {
    notFound()
  }

  // If viewing own profile, redirect to /profile
  if (profile.id === user.id) {
    redirect("/profile")
  }

  const { data: isFollowing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", profile.id)
    .single()

  let posts: any[] = []
  if (!profile.is_private || !!isFollowing) {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
    posts = data || []
  }

  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id)

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id)

  return (
    <ProfileView
      profile={profile}
      posts={posts}
      followersCount={followersCount || 0}
      followingCount={followingCount || 0}
      isOwnProfile={false}
      isFollowing={!!isFollowing}
      currentUserId={user.id}
    />
  )
}
