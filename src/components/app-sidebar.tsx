"use client"

import { Calendar, CalendarDays, Home, Inbox, LogOut, User, LayoutDashboard, BookOpen, Users, Cog, LogIn } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useUser } from "@/hooks/use-user"
import { useAppPreferences } from "@/components/app-preferences-provider"
import { createClient } from "@/utils/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"

const items = [
  {
    titleKey: "sidebar.rules" as const,
    url: "/dashboard/rules",
    icon: BookOpen,
    highlight: true,
  },
  {
    titleKey: "sidebar.calendar" as const,
    url: "/dashboard/calendar",
    icon: CalendarDays,
    highlight: false,
  },
  {
    titleKey: "sidebar.spaces" as const,
    url: "/dashboard/spaces",
    icon: Home,
    highlight: false,
  },
  {
    titleKey: "sidebar.myBookings" as const,
    url: "/dashboard/my-bookings",
    icon: Calendar,
  },
  {
    titleKey: "sidebar.settings" as const,
    url: "/dashboard/settings",
    icon: Cog,
  },
]

const adminItems = [
  {
    titleKey: "sidebar.admin.approvals" as const,
    url: "/dashboard/admin/approvals",
    icon: Inbox,
  },
  {
    titleKey: "sidebar.admin.rooms" as const,
    url: "/dashboard/admin/rooms",
    icon: LayoutDashboard,
  },
  {
    titleKey: "sidebar.admin.users" as const,
    url: "/dashboard/admin/users",
    icon: Users,
  },
]



export function AppSidebar() {
  const { user, loading } = useUser()
  const { t } = useAppPreferences()
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  // Close mobile sidebar sheet when navigating
  const handleMobileNavClick = () => {
    setOpenMobile(false)
  }

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')
    }

    checkAdmin()
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleSignIn = () => {
    router.push("/login")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center px-4 py-2 group-data-[collapsible=icon]:px-0">
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <div className="relative h-8 w-full mb-2">
              <Image src="/banner.png" alt="國立清華大學學生會" fill sizes="220px" className="object-contain object-left" />
            </div>
            <span className="truncate text-xl font-semibold text-[#B482BC]">野台借用系統</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.section.booking")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter(item => {
                  if (item.url === "/dashboard/my-bookings" && !user) return false;
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className={item.highlight ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50" : ""}
                    >
                      <a href={item.url} onClick={handleMobileNavClick}>
                        <item.icon className={item.highlight ? "text-red-600 dark:text-red-400" : ""} />
                        <span>{t(item.titleKey)}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.section.admin")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <a href={item.url} onClick={handleMobileNavClick}>
                        <item.icon />
                        <span>{t(item.titleKey)}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {loading ? (
              <SidebarMenuButton size="lg" className="cursor-default">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="grid flex-1 gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </SidebarMenuButton>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.email?.split('@')[0] || 'User'}</span>
                      <span className="truncate text-xs">{user?.email || ''}</span>
                    </div>
                    <User className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem
                    className="p-0 font-normal focus:bg-transparent"
                    onClick={() => router.push("/dashboard/profile")}
                  >
                    <div className="flex w-full cursor-pointer items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.email?.split('@')[0] || 'User'}</span>
                        <span className="truncate text-xs">{user?.email || ''}</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" />
                    {t("sidebar.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" onClick={handleSignIn}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LogIn className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{t("sidebar.guest")}</span>
                  <span className="truncate text-xs">{t("sidebar.clickToLogin")}</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
