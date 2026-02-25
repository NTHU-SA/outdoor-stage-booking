import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppFooter } from "@/components/app-footer"
import Image from "next/image"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex min-h-svh flex-1 flex-col w-full">
        {/* Mobile-only sticky header with hamburger menu */}
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 py-3 md:hidden">
          <SidebarTrigger className="size-8" />
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" />
            <span className="font-semibold text-sm">國立清華大學學生會野台借用系統</span>
          </div>
        </div>
        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">{children}</div>
        <AppFooter showOnDashboard />
      </main>
    </SidebarProvider>
  )
}

