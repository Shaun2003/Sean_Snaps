import { createClient as createServerClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials")
}

const supabase = createServerClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") // 'post' or 'comment'
    const id = searchParams.get("id")

    if (!type || !id) {
      return NextResponse.json({ error: "Missing type or id" }, { status: 400 })
    }

    const table = type === "post" ? "post_reactions" : "comment_reactions"
    const idColumn = type === "post" ? "post_id" : "comment_id"

    const { data: reactions, error } = await supabase
      .from(table)
      .select("emoji, user_id")
      .eq(idColumn, id)

    if (error) {
      console.error("Error fetching reactions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!reactions || reactions.length === 0) {
      return NextResponse.json({ reactions: [], profiles: {} })
    }

    // Get unique user IDs
    const userIds = Array.from(new Set(reactions.map((r: any) => r.user_id)))

    // Fetch user profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds)

    if (profileError) {
      console.error("Error fetching profiles:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const profilesMap = new Map()
    profiles?.forEach((profile: any) => {
      profilesMap.set(profile.id, profile)
    })

    return NextResponse.json({
      reactions,
      profiles: Object.fromEntries(profilesMap),
    })
  } catch (err) {
    console.error("API error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, emoji, userId } = body

    if (!type || !id || !emoji || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const table = type === "post" ? "post_reactions" : "comment_reactions"
    const idColumn = type === "post" ? "post_id" : "comment_id"

    // Check if reaction already exists
    const { data: existing, error: checkError } = await supabase
      .from(table)
      .select("id")
      .eq(idColumn, id)
      .eq("user_id", userId)
      .eq("emoji", emoji)

    if (checkError) {
      console.error("Error checking existing reaction:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      // Delete the reaction (toggle off)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, id)
        .eq("user_id", userId)
        .eq("emoji", emoji)

      if (deleteError) {
        console.error("Error deleting reaction:", deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ removed: true })
    }

    // Delete any existing reaction for this user (keep only one emoji per reaction)
    const { error: deleteOldError } = await supabase
      .from(table)
      .delete()
      .eq(idColumn, id)
      .eq("user_id", userId)

    if (deleteOldError) {
      console.error("Error deleting old reaction:", deleteOldError)
      // Don't fail on this, just log it
    }

    // Insert new reaction
    const reactionData = {
      user_id: userId,
      emoji,
    }
    
    if (type === "post") {
      Object.assign(reactionData, { post_id: id })
    } else {
      Object.assign(reactionData, { comment_id: id })
    }

    const { error: insertError } = await supabase.from(table).insert(reactionData)

    if (insertError) {
      console.error("Error inserting reaction:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ added: true })
  } catch (err) {
    console.error("API error:", err)
    return NextResponse.json(
      { error: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
