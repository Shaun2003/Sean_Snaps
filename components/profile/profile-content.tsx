"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid3X3, Bookmark, Heart, Settings, MessageCircle, Camera } from "lucide-react"
import { EditProfileDialog } from "./edit-profile-dialog"
import { FollowersDialog } from "./followers-dialog"
import { PostDetailDialog } from "@/components/explore/post-detail-dialog"
import Link from "next/link"
import type { Profile, Post } from "@/lib/types"

interface PostWithCounts extends Post {
  likes_count: number
  comments_count: number
  profiles?: Profile
}

export function ProfileContent({
  profile,
  currentUserId,
}: {
  profile: Profile
  currentUserId: string
}) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [posts, setPosts] = useState<PostWithCounts[]>([])
  const [savedPosts, setSavedPosts] = useState<PostWithCounts[]>([])
  const [likedPosts, setLikedPosts] = useState<PostWithCounts[]>([])
  const [selectedPost, setSelectedPost] = useState<PostWithCounts | null>(null)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const supabase = createClient()
  const isOwnProfile = profile.id === currentUserId

  useEffect(() => {
    fetchProfileData()
  }, [profile.id])

  async function fetchProfileData() {
    const [followCheck, followers, following, userPosts] = await Promise.all([
      supabase.from("followers").select("id").eq("follower_id", currentUserId).eq("following_id", profile.id).single(),
      supabase.from("followers").select("id", { count: "exact" }).eq("following_id", profile.id),
      supabase.from("followers").select("id", { count: "exact" }).eq("follower_id", profile.id),
      supabase
        .from("posts")
        .select("*, profiles(*)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ])

    setIsFollowing(!!followCheck.data)
    setFollowerCount(followers.count || 0)
    setFollowingCount(following.count || 0)

    if (userPosts.data) {
      const postsWithCounts = await Promise.all(
        userPosts.data.map(async (post) => {
          const [likes, comments] = await Promise.all([
            supabase.from("post_likes").select("id", { count: "exact" }).eq("post_id", post.id),
            supabase.from("comments").select("id", { count: "exact" }).eq("post_id", post.id),
          ])
          return {
            ...post,
            likes_count: likes.count || 0,
            comments_count: comments.count || 0,
          }
        }),
      )
      setPosts(postsWithCounts)
    }

    if (isOwnProfile) {
      const { data: saved } = await supabase
        .from("saved_posts")
        .select("post_id, posts(*, profiles(*))")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })

      if (saved) {
        const savedWithCounts = await Promise.all(
          saved
            .filter((s: any) => s.posts)
            .map(async (s: any) => {
              const [likes, comments] = await Promise.all([
                supabase.from("post_likes").select("id", { count: "exact" }).eq("post_id", s.posts.id),
                supabase.from("comments").select("id", { count: "exact" }).eq("post_id", s.posts.id),
              ])
              return {
                ...s.posts,
                likes_count: likes.count || 0,
                comments_count: comments.count || 0,
              }
            }),
        )
        setSavedPosts(savedWithCounts)
      }

      const { data: liked } = await supabase
        .from("post_likes")
        .select("post_id, posts(*, profiles(*))")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })

      if (liked) {
        const likedWithCounts = await Promise.all(
          liked
            .filter((l: any) => l.posts)
            .map(async (l: any) => {
              const [likes, comments] = await Promise.all([
                supabase.from("post_likes").select("id", { count: "exact" }).eq("post_id", l.posts.id),
                supabase.from("comments").select("id", { count: "exact" }).eq("post_id", l.posts.id),
              ])
              return {
                ...l.posts,
                likes_count: likes.count || 0,
                comments_count: comments.count || 0,
              }
            }),
        )
        setLikedPosts(likedWithCounts)
      }
    }
  }

  async function handleFollow() {
    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", profile.id)
      setIsFollowing(false)
      setFollowerCount((c) => c - 1)
    } else {
      await supabase.from("followers").insert({
        follower_id: currentUserId,
        following_id: profile.id,
      })
      await supabase.from("notifications").insert({
        user_id: profile.id,
        actor_id: currentUserId,
        type: "follow",
      })
      setIsFollowing(true)
      setFollowerCount((c) => c + 1)
    }
  }

  const PostGrid = ({ posts }: { posts: PostWithCounts[] }) => (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {posts.map((post) => (
        <button
          key={post.id}
          onClick={() => setSelectedPost(post)}
          className="aspect-square relative group overflow-hidden bg-muted"
        >
          {post.image_url ? (
            <img src={post.image_url || "/placeholder.svg"} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center p-1 sm:p-2 text-[10px] sm:text-xs text-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
              {post.content?.slice(0, 30)}...
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 sm:gap-4 text-white">
            <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold">
              <Heart className="size-3 sm:size-5 fill-white" />
              {post.likes_count}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold">
              <MessageCircle className="size-3 sm:size-5 fill-white" />
              {post.comments_count}
            </span>
          </div>
        </button>
      ))}
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <div className="flex flex-col items-center gap-4 py-4 sm:py-6 md:flex-row md:items-start md:gap-8">
        {/* Avatar section */}
        <div className="relative group shrink-0">
          <div className="p-0.5 sm:p-1 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-500">
            <Avatar className="size-20 sm:size-28 md:size-36 border-2 sm:border-4 border-background">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl sm:text-4xl md:text-5xl bg-gradient-to-br from-primary/80 to-primary">
                {profile.display_name?.[0] || profile.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setShowEditProfile(true)}
              className="absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full bg-primary text-primary-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="size-3 sm:size-4" />
            </button>
          )}
        </div>

        {/* Profile info */}
        <div className="flex-1 w-full text-center md:text-left">
          {/* Username and actions row */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:flex-row md:items-center">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold truncate max-w-full">{profile.username}</h1>
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowEditProfile(true)}
                    className="rounded-lg text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Edit profile
                  </Button>
                  <Link href="/settings">
                    <Button variant="ghost" size="icon" className="rounded-lg size-8 sm:size-9">
                      <Settings className="size-4 sm:size-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    variant={isFollowing ? "secondary" : "default"}
                    size="sm"
                    onClick={handleFollow}
                    className="rounded-lg min-w-20 sm:min-w-24 text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Link href={`/messages?user=${profile.id}`}>
                    <Button variant="secondary" size="sm" className="rounded-lg text-xs sm:text-sm h-8 sm:h-9">
                      Message
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 mb-3 sm:mb-4 md:justify-start">
            <div className="text-center md:text-left">
              <span className="font-bold text-base sm:text-lg">{posts.length}</span>
              <span className="text-muted-foreground text-xs sm:text-sm ml-1">posts</span>
            </div>
            <button onClick={() => setShowFollowers(true)} className="text-center md:text-left hover:opacity-70">
              <span className="font-bold text-base sm:text-lg">{followerCount}</span>
              <span className="text-muted-foreground text-xs sm:text-sm ml-1">followers</span>
            </button>
            <button onClick={() => setShowFollowing(true)} className="text-center md:text-left hover:opacity-70">
              <span className="font-bold text-base sm:text-lg">{followingCount}</span>
              <span className="text-muted-foreground text-xs sm:text-sm ml-1">following</span>
            </button>
          </div>

          {/* Bio section */}
          <div className="space-y-0.5 sm:space-y-1 px-4 md:px-0">
            {profile.display_name && <p className="font-semibold text-sm sm:text-base">{profile.display_name}</p>}
            {profile.bio && (
              <p className="text-xs sm:text-sm whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-primary hover:underline inline-block"
              >
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-2 sm:mt-4">
        <TabsList className="w-full justify-center border-t rounded-none bg-transparent h-auto p-0 gap-4 sm:gap-8">
          <TabsTrigger
            value="posts"
            className="rounded-none border-t-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-2 sm:py-3 px-1 sm:px-2 gap-1 sm:gap-1.5"
          >
            <Grid3X3 className="size-3 sm:size-4" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">Posts</span>
          </TabsTrigger>
          {isOwnProfile && (
            <>
              <TabsTrigger
                value="saved"
                className="rounded-none border-t-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-2 sm:py-3 px-1 sm:px-2 gap-1 sm:gap-1.5"
              >
                <Bookmark className="size-3 sm:size-4" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider">Saved</span>
              </TabsTrigger>
              <TabsTrigger
                value="liked"
                className="rounded-none border-t-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent py-2 sm:py-3 px-1 sm:px-2 gap-1 sm:gap-1.5"
              >
                <Heart className="size-3 sm:size-4" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider">Liked</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-2 sm:mt-4">
          {posts.length === 0 ? (
            <div className="text-center py-8 sm:py-16 text-muted-foreground">
              <Camera className="size-12 sm:size-16 mx-auto mb-3 sm:mb-4 opacity-30" />
              <h3 className="text-base sm:text-xl font-semibold mb-1">No Posts Yet</h3>
              <p className="text-xs sm:text-sm">When you share photos, they'll appear here.</p>
            </div>
          ) : (
            <PostGrid posts={posts} />
          )}
        </TabsContent>

        {isOwnProfile && (
          <>
            <TabsContent value="saved" className="mt-2 sm:mt-4">
              {savedPosts.length === 0 ? (
                <div className="text-center py-8 sm:py-16 text-muted-foreground">
                  <Bookmark className="size-12 sm:size-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                  <h3 className="text-base sm:text-xl font-semibold mb-1">Save</h3>
                  <p className="text-xs sm:text-sm">Save photos to revisit them later.</p>
                </div>
              ) : (
                <PostGrid posts={savedPosts} />
              )}
            </TabsContent>

            <TabsContent value="liked" className="mt-2 sm:mt-4">
              {likedPosts.length === 0 ? (
                <div className="text-center py-8 sm:py-16 text-muted-foreground">
                  <Heart className="size-12 sm:size-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                  <h3 className="text-base sm:text-xl font-semibold mb-1">Likes</h3>
                  <p className="text-xs sm:text-sm">Posts you've liked will appear here.</p>
                </div>
              ) : (
                <PostGrid posts={likedPosts} />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      <EditProfileDialog
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        profile={profile}
        onProfileUpdated={fetchProfileData}
      />

      <FollowersDialog
        open={showFollowers}
        onOpenChange={setShowFollowers}
        userId={profile.id}
        type="followers"
        currentUserId={currentUserId}
      />

      <FollowersDialog
        open={showFollowing}
        onOpenChange={setShowFollowing}
        userId={profile.id}
        type="following"
        currentUserId={currentUserId}
      />

      {selectedPost && (
        <PostDetailDialog
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
