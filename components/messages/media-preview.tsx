"use client"

import { useState } from "react"
import { X, Download, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MediaPreviewProps {
  fileUrl: string
  fileType?: string
  fileName?: string
  className?: string
}

export function MediaPreview({
  fileUrl,
  fileType,
  fileName,
  className,
}: MediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Debug log
  if (fileUrl) {
    console.log("MediaPreview rendering:", { fileUrl, fileType, fileName })
  }

  // Determine file category
  const getFileCategory = () => {
    if (!fileType) return "document"

    const type = fileType.toLowerCase()
    
    // Check for simple type strings first (from chat-view.tsx)
    if (type === "image") return "image"
    if (type === "video") return "video"
    if (type === "pdf") return "pdf"
    
    // Then check for MIME types
    if (type.startsWith("image/")) return "image"
    if (type.startsWith("video/")) return "video"
    if (type.includes("pdf")) return "pdf"
    if (type.includes("document") || type.includes("word")) return "document"
    if (type.includes("sheet") || type.includes("csv")) return "spreadsheet"
    if (type.includes("presentation") || type.includes("powerpoint")) return "presentation"

    return "document"
  }

  const category = getFileCategory()

  // Get file extension from URL or type
  const getFileExtension = () => {
    const url = fileUrl.split("?")[0]
    const path = url.split("/").pop() || ""
    const ext = path.split(".").pop()?.toUpperCase() || "FILE"
    return ext.substring(0, 4)
  }

  const renderPreview = () => {
    switch (category) {
      case "image":
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative overflow-hidden rounded-lg group cursor-pointer inline-block max-w-md",
              className
            )}
          >
            {!imageError ? (
              <>
                <img
                  src={fileUrl}
                  alt="Message image"
                  className="rounded-lg block w-auto max-w-full"
                  onError={() => {
                    console.error("Image failed to load:", fileUrl)
                    setImageError(true)
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <div className="bg-gray-200 rounded-lg flex items-center justify-center border border-gray-300 p-4" style={{ minHeight: "200px" }}>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Image failed to load</p>
                  <p className="text-xs text-gray-500 mt-1">{fileName || "Image"}</p>
                </div>
              </div>
            )}
          </button>
        )

      case "video":
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative overflow-hidden rounded-lg group cursor-pointer inline-block max-w-md",
              className
            )}
          >
            <video
              src={fileUrl}
              className="rounded-lg block w-auto max-w-full bg-black"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-6 border-l-white border-t-4 border-t-transparent border-b-4 border-b-transparent ml-1" />
              </div>
            </div>
          </button>
        )

      case "pdf":
        // For PDFs, show a preview using an iframe or image
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative overflow-hidden rounded-lg group cursor-pointer inline-block",
              className
            )}
          >
            {!previewError ? (
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="block rounded-lg"
                  style={{ width: "320px", height: "256px" }}
                  onError={() => setPreviewError(true)}
                  title="PDF Preview"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300" style={{ width: "320px", height: "256px" }}>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-2">📄 PDF</p>
                  <p className="text-xs text-gray-500">{fileName || "PDF Document"}</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </button>
        )

      default:
        // For other documents, try to show a preview or thumbnail
        return (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative overflow-hidden rounded-lg group cursor-pointer inline-block",
              className
            )}
          >
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center border border-blue-200" style={{ width: "320px", height: "192px" }}>
              <div className="text-center">
                <p className="text-3xl mb-2">📄</p>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {getFileExtension()}
                </p>
                <p className="text-xs text-gray-600 max-w-xs truncate px-4">
                  {fileName || "Document"}
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </button>
        )
    }
  }

  const renderFullView = () => {
    switch (category) {
      case "image":
        return (
          <div className="flex items-center justify-center">
            <img
              src={fileUrl}
              alt="Full view"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        )

      case "video":
        return (
          <div className="flex items-center justify-center">
            <video
              src={fileUrl}
              controls
              autoPlay
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        )

      case "pdf":
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-[70vh] rounded-lg"
                title="PDF Viewer"
              />
            </div>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Button className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </a>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <div className="text-center mb-4">
                <p className="text-5xl mb-2">📄</p>
                <p className="text-lg font-semibold text-gray-800">{fileName || "Document"}</p>
                <p className="text-sm text-gray-600 mt-2">
                  File type: {fileType || "Unknown"}
                </p>
              </div>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                <Button className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
              </a>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {renderPreview()}

      {/* Full view dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="media-preview-description">
          <DialogHeader>
            <DialogTitle>{fileName || "Media"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4" id="media-preview-description">
            {renderFullView()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
