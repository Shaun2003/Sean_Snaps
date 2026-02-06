"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface MediaBatch {
  fileUrl: string
  fileType?: string
  fileName?: string
}

interface MediaBatchProps {
  items: MediaBatch[]
  className?: string
}

export function MediaBatch({ items, className }: MediaBatchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (items.length <= 3) {
    // Show all if 3 or less
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {items.map((item, idx) => (
          <SingleMediaPreview key={idx} item={item} />
        ))}
      </div>
    )
  }

  // Batch view for 4+ items
  const firstItem = items[0]
  const remainingCount = items.length - 1

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative overflow-hidden rounded-lg group cursor-pointer inline-block max-w-sm",
          className
        )}
      >
        {/* First item thumbnail */}
        {firstItem.fileType?.startsWith("image") && (
          <img
            src={firstItem.fileUrl}
            alt="Media batch"
            className="rounded-lg block w-auto max-w-sm h-auto object-cover"
          />
        )}
        {firstItem.fileType?.startsWith("video") && (
          <video
            src={firstItem.fileUrl}
            className="rounded-lg block w-auto max-w-sm h-auto bg-black"
          />
        )}

        {/* Overlay with count */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <p className="text-white text-3xl font-bold mb-1">
              +{remainingCount}
            </p>
            <p className="text-white text-sm">More</p>
          </div>
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ChevronRight className="w-8 h-8 text-white" />
        </div>
      </button>

      {/* Full view modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl" aria-describedby="media-batch-description">
          <DialogHeader>
            <DialogTitle>
              Media ({selectedIndex + 1}/{items.length})
            </DialogTitle>
          </DialogHeader>

          <div id="media-batch-description" className="flex flex-col gap-4">
            {/* Current item */}
            <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden">
              {items[selectedIndex].fileType?.startsWith("image") && (
                <img
                  src={items[selectedIndex].fileUrl}
                  alt={`Media ${selectedIndex + 1}`}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
              {items[selectedIndex].fileType?.startsWith("video") && (
                <video
                  src={items[selectedIndex].fileUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ← Previous
              </button>

              {/* Thumbnail strip */}
              <div className="flex gap-2 overflow-x-auto py-2 flex-1">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      "shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors",
                      idx === selectedIndex
                        ? "border-blue-500"
                        : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {item.fileType?.startsWith("image") && (
                      <img
                        src={item.fileUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.fileType?.startsWith("video") && (
                      <video
                        src={item.fileUrl}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1))
                }
                disabled={selectedIndex === items.length - 1}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Next →
              </button>
            </div>

            {/* File info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {items[selectedIndex].fileName}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper component for single media preview
function SingleMediaPreview({ item }: { item: MediaBatch }) {
  return item.fileType?.startsWith("image") ? (
    <img
      src={item.fileUrl}
      alt={item.fileName || "Media"}
      className="rounded-lg max-w-sm w-auto h-auto"
    />
  ) : item.fileType?.startsWith("video") ? (
    <video
      src={item.fileUrl}
      controls
      className="rounded-lg max-w-sm w-auto h-auto bg-black"
    />
  ) : null
}
