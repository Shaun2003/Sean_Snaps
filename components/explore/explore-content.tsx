"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchSection } from "./search-section"
import { FriendsSection } from "./friends-section"
import { DiscoverGrid } from "./discover-grid"
import { Search, Users, Grid3X3 } from "lucide-react"

interface ExploreContentProps {
  userId: string
}

export function ExploreContent({ userId }: ExploreContentProps) {
  const [activeTab, setActiveTab] = useState("discover")

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Explore</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11">
          <TabsTrigger value="discover" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Grid3X3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Search</span>
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Friends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4 sm:mt-6">
          <DiscoverGrid userId={userId} />
        </TabsContent>

        <TabsContent value="search" className="mt-4 sm:mt-6">
          <SearchSection userId={userId} />
        </TabsContent>

        <TabsContent value="friends" className="mt-4 sm:mt-6">
          <FriendsSection userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
