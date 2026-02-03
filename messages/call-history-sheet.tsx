"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CallHistory, Profile, Conversation } from "@/lib/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, Video, PhoneIncoming, PhoneMissed, PhoneOutgoing, Users } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface CallHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

interface CallWithDetails extends CallHistory {
  caller: Profile
  conversation: Conversation & { participants: Profile[] }
}

export function CallHistorySheet({ open, onOpenChange, userId }: CallHistorySheetProps) {
  const [calls, setCalls] = useState<CallWithDetails[]>([])
  const { toast } = useToast()

  const fetchCalls = useCallback(async () => {
    const supabase = createClient()

    // Get conversations user is part of
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId)

    if (!participations) return

    const conversationIds = participations.map((p) => p.conversation_id)

    // Get call history for those conversations
    const { data: callsData } = await supabase
      .from("call_history")
      .select(`
        *,
        caller:profiles!call_history_caller_id_fkey (*)
      `)
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(50)

    if (!callsData) return

    // Get conversation details for each call
    const callsWithDetails = await Promise.all(
      callsData.map(async (call) => {
        const { data: conv } = await supabase.from("conversations").select("*").eq("id", call.conversation_id).single()

        const { data: parts } = await supabase
          .from("conversation_participants")
          .select("profiles (*)")
          .eq("conversation_id", call.conversation_id)
          .neq("user_id", userId)

        return {
          ...call,
          conversation: {
            ...conv!,
            participants: parts?.map((p) => p.profiles as Profile) || [],
          },
        } as CallWithDetails
      }),
    )

    setCalls(callsWithDetails)
  }, [userId])

  useEffect(() => {
    if (open) {
      fetchCalls()
    }
  }, [open, fetchCalls])

  const getCallIcon = (call: CallWithDetails) => {
    const isOutgoing = call.caller_id === userId

    if (call.status === "missed") {
      return <PhoneMissed className="h-4 w-4 text-destructive" />
    }
    if (isOutgoing) {
      return <PhoneOutgoing className="h-4 w-4 text-green-500" />
    }
    return <PhoneIncoming className="h-4 w-4 text-blue-500" />
  }

  const getCallLabel = (call: CallWithDetails) => {
    const isOutgoing = call.caller_id === userId

    if (call.status === "missed") {
      return isOutgoing ? "No answer" : "Missed"
    }
    if (call.status === "declined") {
      return "Declined"
    }
    return isOutgoing ? "Outgoing" : "Incoming"
  }

  const handleRecall = async (call: CallWithDetails) => {
    const supabase = createClient()

    await supabase.from("call_history").insert({
      conversation_id: call.conversation_id,
      caller_id: userId,
      call_type: call.call_type,
      status: "answered",
      duration: 0,
    })

    toast({
      title: `${call.call_type === "voice" ? "Voice" : "Video"} Call`,
      description: "Call feature is a placeholder. In production, integrate with WebRTC.",
    })

    fetchCalls()
  }

  const getParticipantName = (call: CallWithDetails) => {
    if (call.conversation.is_group && call.conversation.name) {
      return call.conversation.name
    }
    return call.conversation.participants[0]?.display_name || "Unknown"
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Call History</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {calls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No call history</p>
          ) : (
            calls.map((call) => (
              <div key={call.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                {call.conversation.is_group ? (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                ) : (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={call.conversation.participants[0]?.avatar_url || ""} />
                    <AvatarFallback>{getParticipantName(call)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1">
                  <p className="font-medium text-sm">{getParticipantName(call)}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {getCallIcon(call)}
                    <span>{getCallLabel(call)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{format(new Date(call.created_at), "MMM d, h:mm a")}</span>
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={() => handleRecall(call)}>
                  {call.call_type === "voice" ? (
                    <Phone className="h-5 w-5 text-green-500" />
                  ) : (
                    <Video className="h-5 w-5 text-blue-500" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
