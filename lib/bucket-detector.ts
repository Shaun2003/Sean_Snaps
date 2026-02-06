import { createClient } from "@/lib/supabase/client"

/**
 * Utility to detect and validate Supabase storage buckets
 */
export async function detectAvailableBuckets(): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error("Failed to list buckets:", error)
      return []
    }
    
    const bucketNames = buckets?.map((b: any) => b.name) || []
    console.log("[BucketDetector] Available buckets:", bucketNames)
    return bucketNames
  } catch (err) {
    console.error("[BucketDetector] Error detecting buckets:", err)
    return []
  }
}

/**
 * Find the best bucket for file upload
 * Prefers: voice_notes > messages > any public bucket
 */
export async function findBestBucket(fileType: 'audio' | 'file' = 'file'): Promise<string | null> {
  try {
    const buckets = await detectAvailableBuckets()
    
    if (buckets.length === 0) {
      console.warn("[BucketDetector] No buckets found")
      return null
    }
    
    // For audio, prefer voice_notes first
    if (fileType === 'audio') {
      if (buckets.includes('voice_notes')) {
        console.log("[BucketDetector] Using voice_notes bucket for audio")
        return 'voice_notes'
      }
    }
    
    // Fallback to messages bucket for any file type
    if (buckets.includes('messages')) {
      console.log("[BucketDetector] Using messages bucket")
      return 'messages'
    }
    
    // Use first available bucket
    console.log("[BucketDetector] Using first available bucket:", buckets[0])
    return buckets[0]
  } catch (err) {
    console.error("[BucketDetector] Error finding best bucket:", err)
    return null
  }
}

/**
 * Check if a specific bucket exists
 */
export async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    const buckets = await detectAvailableBuckets()
    return buckets.includes(bucketName)
  } catch (err) {
    console.error("[BucketDetector] Error checking bucket:", err)
    return false
  }
}

/**
 * Get bucket information including size and policies
 */
export async function getBucketInfo(bucketName: string): Promise<{
  exists: boolean
  isPublic: boolean
  name: string
} | null> {
  try {
    const supabase = createClient()
    const { data: buckets } = await supabase.storage.listBuckets()
    
    const bucket = buckets?.find((b: any) => b.name === bucketName)
    
    if (!bucket) {
      return null
    }
    
    return {
      exists: true,
      isPublic: bucket.public || false,
      name: bucket.name
    }
  } catch (err) {
    console.error("[BucketDetector] Error getting bucket info:", err)
    return null
  }
}

/**
 * Diagnose storage issues
 */
export async function diagnoseStorageSetup(): Promise<{
  status: 'ok' | 'warning' | 'error'
  message: string
  buckets: string[]
  recommendations: string[]
}> {
  const buckets = await detectAvailableBuckets()
  
  if (buckets.length === 0) {
    return {
      status: 'error',
      message: 'No storage buckets found',
      buckets: [],
      recommendations: [
        'Create a "messages" bucket in Supabase Storage',
        'Or create a "voice_notes" bucket for voice recordings',
        'Ensure your Supabase project is properly configured'
      ]
    }
  }
  
  const hasVoiceNotes = buckets.includes('voice_notes')
  const hasMessages = buckets.includes('messages')
  
  if (!hasVoiceNotes && !hasMessages) {
    return {
      status: 'warning',
      message: 'Neither voice_notes nor messages bucket found',
      buckets,
      recommendations: [
        'Create a "messages" bucket for file uploads',
        'Optionally create a dedicated "voice_notes" bucket for voice recordings',
        'Ensure buckets are marked as public in Storage settings'
      ]
    }
  }
  
  return {
    status: 'ok',
    message: 'Storage setup looks good',
    buckets,
    recommendations: []
  }
}
