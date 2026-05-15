'use client'

import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReasonDocs } from "reason-editor"
import { useState, useEffect } from "react"

export default function Page() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  // Initialize QueryClient only on the client side after mount
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="h-screen w-screen">
          <ReasonDocs />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
