"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  BookOpen,
  CalendarDays,
  Home,
  Calendar,
  Cog,
  Inbox,
  LayoutDashboard,
  Users,
  User,
  LogOut,
  LogIn,
  Menu,
  Shield,
  ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/hooks/use-user"
import { useAppPreferences } from "@/components/app-preferences-provider"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

export function AppNavbar() {
  const { user, loading } = useUser()
  const { t } = useAppPreferences()
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      setIsAdmin(profile?.role === "admin")
    }

    checkAdmin()
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/dashboard/rules")
  }

  const handleSignIn = () => {
    router.push("/login?next=/dashboard/spaces")
  }

  const navItems = [
    {
      label: t("nav.rules"),
      url: "/dashboard/rules",
      icon: BookOpen,
      requiresAuth: false,
    },
    {
      label: t("nav.calendar"),
      url: "/dashboard/calendar",
      icon: CalendarDays,
      requiresAuth: true,
    },
    {
      label: t("nav.spaces"),
      url: "/dashboard/spaces",
      icon: Home,
      requiresAuth: true,
    },
    {
      label: t("nav.myBookings"),
      url: "/dashboard/my-bookings",
      icon: Calendar,
      requiresAuth: true,
    },
  ]

  const adminItems = [
    {
      label: t("nav.admin.approvals"),
      url: "/dashboard/admin/approvals",
      icon: Inbox,
    },
    {
      label: t("nav.admin.rooms"),
      url: "/dashboard/admin/rooms",
      icon: LayoutDashboard,
    },
    {
      label: t("nav.admin.users"),
      url: "/dashboard/admin/users",
      icon: Users,
    },
  ]

  const isAdminActive = adminItems.some((item) => pathname.startsWith(item.url))

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <Link
            href={user ? "/dashboard/spaces" : "/dashboard/rules"}
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <div className="relative h-9 w-24 sm:w-28">
              <Image
                src="/banner.png"
                alt="國立清華大學學生會"
                fill
                sizes="(max-width: 640px) 96px, 112px"
                className="object-contain object-left"
                priority
              />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-[#B482BC] hidden min-[400px]:inline-block">
              野台借用系統
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems
              .filter((item) => !item.requiresAuth || Boolean(user))
              .map((item) => {
                const isActive = pathname === item.url || (item.url !== "/dashboard/spaces" && pathname.startsWith(item.url + "/"))
                const isSpacesActive = item.url === "/dashboard/spaces" && (pathname === "/dashboard/spaces" || pathname.startsWith("/dashboard/spaces/"))
                const active = isActive || isSpacesActive

                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}

            {/* Admin Menu Dropdown (Desktop) */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isAdminActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex items-center gap-1.5 h-8.5 px-3 text-sm font-medium",
                      isAdminActive && "bg-primary/10 text-primary font-semibold"
                    )}
                  >
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>{t("nav.admin")}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t("nav.admin")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {adminItems.map((item) => (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer w-full",
                          pathname.startsWith(item.url) && "font-semibold text-primary"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        {/* Right: Settings, Auth & User Info */}
        <div className="flex items-center gap-2">
          {/* Settings Link (Desktop) */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={cn(
              "hidden sm:inline-flex size-9",
              pathname === "/dashboard/settings" && "bg-muted text-foreground"
            )}
            title={t("nav.settings")}
          >
            <Link href="/dashboard/settings">
              <Cog className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">{t("nav.settings")}</span>
            </Link>
          </Button>

          {/* User / Login Section */}
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20 hidden sm:inline-block" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 h-9 rounded-full sm:rounded-md hover:bg-muted/80"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium max-w-[120px] truncate">
                    {user.email?.split("@")[0] || "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold truncate">
                      {user.email?.split("@")[0]}
                    </p>
                    {isAdmin && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 border-purple-500/50 text-purple-600 dark:text-purple-400">
                        管理員
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>{t("nav.profile")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                    <Cog className="h-4 w-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>{t("nav.signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={handleSignIn} className="gap-1.5">
              <LogIn className="h-4 w-4" />
              <span>{t("nav.login")}</span>
            </Button>
          )}

          {/* Mobile Hamburger Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden size-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col p-6">
              <SheetHeader className="text-left border-b pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="relative h-7 w-20">
                    <Image
                      src="/banner.png"
                      alt="Logo"
                      fill
                      className="object-contain object-left"
                    />
                  </div>
                  <span className="font-bold text-base text-[#B482BC]">野台借用系統</span>
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="space-y-1">
                  <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t("sidebar.section.booking")}
                  </p>
                  {navItems
                    .filter((item) => !item.requiresAuth || Boolean(user))
                    .map((item) => {
                      const isActive = pathname === item.url || (item.url !== "/dashboard/spaces" && pathname.startsWith(item.url + "/"))
                      const isSpacesActive = item.url === "/dashboard/spaces" && (pathname === "/dashboard/spaces" || pathname.startsWith("/dashboard/spaces/"))
                      const active = isActive || isSpacesActive

                      return (
                        <Link
                          key={item.url}
                          href={item.url}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                </div>

                {isAdmin && (
                  <div className="space-y-1 border-t pt-4">
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("nav.admin")}
                    </p>
                    {adminItems.map((item) => (
                      <Link
                        key={item.url}
                        href={item.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          pathname.startsWith(item.url)
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="space-y-1 border-t pt-4">
                  <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t("nav.settings")}
                  </p>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname === "/dashboard/settings"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Cog className="h-4 w-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </div>
              </div>

              {/* Mobile User Footer */}
              <div className="border-t pt-4 mt-auto">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.email?.split("@")[0]}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/dashboard/profile">
                          <User className="h-3.5 w-3.5 mr-1" />
                          {t("nav.profile")}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          handleSignOut()
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1" />
                        {t("nav.signOut")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignIn()
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {t("nav.login")}
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
