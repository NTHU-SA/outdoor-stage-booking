import { AppNavbar } from "@/components/app-navbar"
import { AppFooter } from "@/components/app-footer"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <AppFooter showOnDashboard />
    </div>
  )
}
