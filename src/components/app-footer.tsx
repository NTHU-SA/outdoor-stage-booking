"use client"

import { Heart } from "lucide-react"
import { usePathname } from "next/navigation"

type AppFooterProps = {
  showOnDashboard?: boolean
}

export function AppFooter({ showOnDashboard = false }: AppFooterProps) {
  const pathname = usePathname()

  if (!showOnDashboard && pathname?.startsWith("/dashboard")) {
    return null
  }

  return (
    <footer className="border-t bg-muted/40 mt-auto">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-5">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 34th 國立清華大學學生會 版權所有</p>
          <p className="flex items-center gap-1.5">
            Made with
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            by NTHUSA IT Team
          </p>
        </div>
      </div>
    </footer>
  )
}

