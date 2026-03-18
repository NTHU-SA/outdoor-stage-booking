"use client"

import { Calendar, CalendarDays, Home, Inbox, PlusCircle, LogOut, User, LayoutDashboard, BookOpen, Users, Cog, AlertCircle, ClipboardList, LogIn, ShieldCheck } from "lucide-react"
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
import { createClient } from "@/utils/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"

const items = [
  {
    title: "借用規則",
    url: "/dashboard/rules",
    icon: BookOpen,
    highlight: true,
  },
  {
    title: "總覽日曆",
    url: "/dashboard/calendar",
    icon: CalendarDays,
    highlight: false,
  },
  {
    title: "借用空間",
    url: "/dashboard/spaces",
    icon: Home,
    highlight: false,
  },
  // {
  //   title: "預約空間(舊版)",
  //   url: "/dashboard/book",
  //   icon: PlusCircle,
  // },
  {
    title: "我的預約",
    url: "/dashboard/my-bookings",
    icon: Calendar,
  },
]

// removed reportItems

const adminItems = [
  {
    title: "預約管理",
    url: "/dashboard/admin/approvals",
    icon: Inbox,
  },
  {
    title: "空間管理",
    url: "/dashboard/admin/rooms",
    icon: LayoutDashboard,
  },
  {
    title: "人員管理",
    url: "/dashboard/admin/users",
    icon: Users,
  },
  {
    title: "系統設定",
    url: "/dashboard/admin/settings",
    icon: Cog,
  },
]

// Items for users who are room approvers (non-admin)
const approverItems = [
  {
    title: "多階層審核任務",
    url: "/dashboard/admin/approver-review",
    icon: ShieldCheck,
  },
]

export function AppSidebar() {
  const { user, loading } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isApprover, setIsApprover] = useState(false)
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
        setIsApprover(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')

      // Check if user is an approver for any room
      const { data: approverRoles } = await supabase
        .from('room_approvers')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      setIsApprover(!!approverRoles && approverRoles.length > 0)
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
            <div className="relative h-8 w-full mb-3">
              <Image src="/banner.png" alt="國立清華大學學生會" fill sizes="220px" className="object-contain object-left" />
            </div>
            <span className="truncate text-xl font-semibold">野台借用系統</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>野台借用</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter(item => {
                  if (item.title === "我的預約" && !user) return false;
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className={item.highlight ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50" : ""}
                    >
                      <a href={item.url} onClick={handleMobileNavClick}>
                        <item.icon className={item.highlight ? "text-red-600 dark:text-red-400" : ""} />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>



        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>管理員功能</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <a href={item.url} onClick={handleMobileNavClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isApprover && (
          <SidebarGroup>
            <SidebarGroupLabel>審核管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {approverItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <a href={item.url} onClick={handleMobileNavClick}>
                        <item.icon />
                        <span>{item.title}</span>
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
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" onClick={handleSignIn}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LogIn className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">訪客</span>
                  <span className="truncate text-xs">點此登入</span>
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
