"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchSection } from "./search-section"
import { FriendsSection } from "./friends-section"
import { FollowSuggestions } from "./follow-suggestions"
import { DiscoverGrid } from "./discover-grid"
import { Search, Users, Grid3X3 } from "lucide-react"

interface ExploreContentProps {
  userId: string
}

export function ExploreContent({ userId }: ExploreContentProps) {
  const [activeTab, setActiveTab] = useState("discover")

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} suppressHydrationWarning>
        <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11 shadow-md border-0 bg-linear-to-r from-card/50 to-card/30" suppressHydrationWarning>
          <TabsTrigger value="discover" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200 data-[state=active]:shadow-md data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20" suppressHydrationWarning>
            <Grid3X3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200 data-[state=active]:shadow-md data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20" suppressHydrationWarning>
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Search</span>
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200 data-[state=active]:shadow-md data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20" suppressHydrationWarning>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Friends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4 sm:mt-6 animate-in fade-in duration-300" suppressHydrationWarning>
          <DiscoverGrid userId={userId} />
        </TabsContent>

        <TabsContent value="search" className="mt-4 sm:mt-6 animate-in fade-in duration-300" suppressHydrationWarning>
          <SearchSection userId={userId} />
        </TabsContent>

        <TabsContent value="friends" className="mt-4 sm:mt-6 space-y-6 animate-in fade-in duration-300" suppressHydrationWarning>
          <FollowSuggestions userId={userId} limit={10} />
          <FriendsSection userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
