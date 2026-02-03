export function handleSupabaseError(error: any, context?: string): void {
  if (error?.message?.includes("Failed to fetch")) {
    console.warn(`[v0] Network error in ${context || "Supabase operation"}. This is expected in preview environment.`)
    return
  }

  console.error(`[v0] Error in ${context}:`, error)
}

export function isNetworkError(error: any): boolean {
  return error?.message?.includes("Failed to fetch") || error?.message?.includes("Network request failed")
}
