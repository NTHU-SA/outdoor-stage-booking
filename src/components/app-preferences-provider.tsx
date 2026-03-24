"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { ThemeProvider, useTheme } from "next-themes"

export type AppLanguage = "zh" | "en" | "ja"
export type AppLanguagePreference = AppLanguage | "system"
export type AppThemePreference = "light" | "dark"

type TranslationKey =
  | "sidebar.section.booking"
  | "sidebar.section.admin"
  | "sidebar.rules"
  | "sidebar.calendar"
  | "sidebar.spaces"
  | "sidebar.myBookings"
  | "sidebar.admin.approvals"
  | "sidebar.admin.rooms"
  | "sidebar.admin.users"
  | "sidebar.settings"
  | "sidebar.guest"
  | "sidebar.clickToLogin"
  | "sidebar.signOut"
  | "settings.title"
  | "settings.description"
  | "settings.theme.title"
  | "settings.theme.description"
  | "settings.theme.light"
  | "settings.theme.dark"
  | "settings.theme.darkBeta"
  | "settings.theme.current"
  | "settings.theme.current.light"
  | "settings.theme.current.dark"
  | "settings.language.title"
  | "settings.language.description"
  | "settings.language.system"
  | "settings.language.chinese"
  | "settings.language.english"
  | "settings.language.englishBeta"
  | "settings.language.japanese"
  | "settings.language.japaneseBeta"
  | "settings.language.current"
  | "settings.note"
  | "spaces.pageTitle"
  | "spaces.empty"
  | "spaces.emptyHint"
  | "widget.singleBooking"
  | "widget.multiBooking"
  | "myBookings.pageTitle"
  | "myBookings.showHistory"
  | "myBookings.col.room"
  | "myBookings.col.date"
  | "myBookings.col.time"
  | "myBookings.col.purpose"
  | "myBookings.col.status"
  | "myBookings.col.createdAt"
  | "myBookings.col.actions"
  | "myBookings.emptyHistory"
  | "myBookings.emptyUpcoming"
  | "myBookings.socketUsage"
  | "myBookings.edit"
  | "myBookings.status.approved"
  | "myBookings.status.rejected"
  | "myBookings.status.pending"
  | "myBookings.status.cancelled"

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  zh: {
    "sidebar.section.booking": "野台借用",
    "sidebar.section.admin": "管理員功能",
    "sidebar.rules": "借用規則",
    "sidebar.calendar": "總覽日曆",
    "sidebar.spaces": "借用空間",
    "sidebar.myBookings": "我的預約",
    "sidebar.admin.approvals": "預約管理",
    "sidebar.admin.rooms": "空間管理",
    "sidebar.admin.users": "人員管理",
    "sidebar.settings": "設定",
    "sidebar.guest": "訪客",
    "sidebar.clickToLogin": "點此登入",
    "sidebar.signOut": "登出",
    "settings.title": "顯示與語言",
    "settings.description": "可調整主題與語言。預設為中文。",
    "settings.theme.title": "主題",
    "settings.theme.description": "預設為亮色模式，深色模式目前為 Beta 版本。",
    "settings.theme.light": "亮色",
    "settings.theme.dark": "深色",
    "settings.theme.darkBeta": "深色（Beta）",
    "settings.theme.current": "目前主題",
    "settings.theme.current.light": "亮色",
    "settings.theme.current.dark": "深色",
    "settings.language.title": "語言",
    "settings.language.description": "選擇介面語言。",
    "settings.language.system": "跟隨瀏覽器",
    "settings.language.chinese": "中文",
    "settings.language.english": "英文",
    "settings.language.englishBeta": "英文（Beta）",
    "settings.language.japanese": "日文",
    "settings.language.japaneseBeta": "日文（Beta）",
    "settings.language.current": "目前語言",
    "settings.note": "若啟用跟隨瀏覽器且語言非中文、英文、日文，將回退為中文。",
    "spaces.pageTitle": "空間一覽",
    "spaces.empty": "沒有找到符合條件的空間",
    "spaces.emptyHint": "目前沒有可顯示的空間",
    "widget.singleBooking": "單時段預約",
    "widget.multiBooking": "多時段預約（帶入清單）",
    "myBookings.pageTitle": "我的預約紀錄",
    "myBookings.showHistory": "顯示歷史紀錄",
    "myBookings.col.room": "空間",
    "myBookings.col.date": "日期",
    "myBookings.col.time": "時段",
    "myBookings.col.purpose": "事由",
    "myBookings.col.status": "狀態",
    "myBookings.col.createdAt": "申請時間",
    "myBookings.col.actions": "操作",
    "myBookings.emptyHistory": "尚無預約紀錄",
    "myBookings.emptyUpcoming": "目前無有效預約，請開啟歷史紀錄查看過往預約",
    "myBookings.socketUsage": "需要使用插座",
    "myBookings.edit": "編輯",
    "myBookings.status.approved": "已核准",
    "myBookings.status.rejected": "已拒絕",
    "myBookings.status.pending": "待審核",
    "myBookings.status.cancelled": "已取消",
  },
  en: {
    "sidebar.section.booking": "Outdoor Stage",
    "sidebar.section.admin": "Admin",
    "sidebar.rules": "Rules",
    "sidebar.calendar": "Calendar",
    "sidebar.spaces": "Spaces",
    "sidebar.myBookings": "My Bookings",
    "sidebar.admin.approvals": "Booking Management",
    "sidebar.admin.rooms": "Space Management",
    "sidebar.admin.users": "User Management",
    "sidebar.settings": "Settings",
    "sidebar.guest": "Guest",
    "sidebar.clickToLogin": "Click to sign in",
    "sidebar.signOut": "Sign out",
    "settings.title": "Display & Language",
    "settings.description": "Control color theme and language. Browser preference is used when set to System.",
    "settings.theme.title": "Theme",
    "settings.theme.description": "Default is Light mode. Dark mode is available as a beta feature.",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.darkBeta": "Dark (Beta)",
    "settings.theme.current": "Current theme",
    "settings.theme.current.light": "Light",
    "settings.theme.current.dark": "Dark",
    "settings.language.title": "Language",
    "settings.language.description": "Choose UI language.",
    "settings.language.system": "Browser default",
    "settings.language.chinese": "Chinese",
    "settings.language.english": "English",
    "settings.language.englishBeta": "English (Beta)",
    "settings.language.japanese": "Japanese",
    "settings.language.japaneseBeta": "Japanese (Beta)",
    "settings.language.current": "Current language",
    "settings.note": "Language fallback is Chinese when browser language is not Chinese, English, or Japanese.",
    "spaces.pageTitle": "Spaces",
    "spaces.empty": "No matching spaces found",
    "spaces.emptyHint": "No spaces are currently available",
    "widget.singleBooking": "Single-slot booking",
    "widget.multiBooking": "Multi-slot booking (from list)",
    "myBookings.pageTitle": "My Booking History",
    "myBookings.showHistory": "Show history",
    "myBookings.col.room": "Space",
    "myBookings.col.date": "Date",
    "myBookings.col.time": "Time",
    "myBookings.col.purpose": "Purpose",
    "myBookings.col.status": "Status",
    "myBookings.col.createdAt": "Submitted at",
    "myBookings.col.actions": "Actions",
    "myBookings.emptyHistory": "No booking history yet",
    "myBookings.emptyUpcoming": "No active bookings. Enable history to view past bookings.",
    "myBookings.socketUsage": "Socket needed",
    "myBookings.edit": "Edit",
    "myBookings.status.approved": "Approved",
    "myBookings.status.rejected": "Rejected",
    "myBookings.status.pending": "Pending",
    "myBookings.status.cancelled": "Cancelled",
  },
  ja: {
    "sidebar.section.booking": "野外ステージ",
    "sidebar.section.admin": "管理者",
    "sidebar.rules": "利用ルール",
    "sidebar.calendar": "カレンダー",
    "sidebar.spaces": "スペース",
    "sidebar.myBookings": "予約一覧",
    "sidebar.admin.approvals": "予約管理",
    "sidebar.admin.rooms": "スペース管理",
    "sidebar.admin.users": "ユーザー管理",
    "sidebar.settings": "設定",
    "sidebar.guest": "ゲスト",
    "sidebar.clickToLogin": "ログイン",
    "sidebar.signOut": "ログアウト",
    "settings.title": "表示と言語",
    "settings.description": "配色テーマと言語を設定します。システム選択時はブラウザ設定に従います。",
    "settings.theme.title": "テーマ",
    "settings.theme.description": "既定はライトモードです。ダークモードはベータ版として利用できます。",
    "settings.theme.light": "ライト",
    "settings.theme.dark": "ダーク",
    "settings.theme.darkBeta": "ダーク（ベータ）",
    "settings.theme.current": "現在のテーマ",
    "settings.theme.current.light": "ライト",
    "settings.theme.current.dark": "ダーク",
    "settings.language.title": "言語",
    "settings.language.description": "UI の言語を選択します。",
    "settings.language.system": "ブラウザ設定",
    "settings.language.chinese": "中国語",
    "settings.language.english": "英語",
    "settings.language.englishBeta": "英語（ベータ）",
    "settings.language.japanese": "日本語",
    "settings.language.japaneseBeta": "日本語（ベータ）",
    "settings.language.current": "現在の言語",
    "settings.note": "ブラウザ言語が中国語・英語・日本語以外の場合、中国語を既定値として使用します。",
    "spaces.pageTitle": "スペース一覧",
    "spaces.empty": "条件に一致するスペースがありません",
    "spaces.emptyHint": "表示できるスペースがありません",
    "widget.singleBooking": "単一枠で予約",
    "widget.multiBooking": "複数枠で予約（リスト適用）",
    "myBookings.pageTitle": "予約履歴",
    "myBookings.showHistory": "履歴を表示",
    "myBookings.col.room": "スペース",
    "myBookings.col.date": "日付",
    "myBookings.col.time": "時間帯",
    "myBookings.col.purpose": "利用目的",
    "myBookings.col.status": "状態",
    "myBookings.col.createdAt": "申請日時",
    "myBookings.col.actions": "操作",
    "myBookings.emptyHistory": "予約履歴はまだありません",
    "myBookings.emptyUpcoming": "有効な予約はありません。履歴表示をオンにすると過去の予約を確認できます。",
    "myBookings.socketUsage": "コンセント利用あり",
    "myBookings.edit": "編集",
    "myBookings.status.approved": "承認済み",
    "myBookings.status.rejected": "却下",
    "myBookings.status.pending": "審査中",
    "myBookings.status.cancelled": "キャンセル済み",
  },
}

const LANGUAGE_STORAGE_KEY = "app-language-preference"

type AppPreferencesContextValue = {
  themePreference: AppThemePreference
  setThemePreference: (value: AppThemePreference) => void
  resolvedTheme: "light" | "dark"
  languagePreference: AppLanguagePreference
  setLanguagePreference: (value: AppLanguagePreference) => void
  resolvedLanguage: AppLanguage
  t: (key: TranslationKey) => string
  mounted: boolean
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

function detectBrowserLanguage(): AppLanguage {
  if (typeof window === "undefined") return "zh"
  const candidates = navigator.languages.length > 0 ? navigator.languages : [navigator.language]

  const match = candidates.find((language) => {
    const normalized = language.toLowerCase()
    return normalized.startsWith("zh") || normalized.startsWith("ja") || normalized.startsWith("en")
  })

  if (!match) return "zh"
  if (match.toLowerCase().startsWith("zh")) return "zh"
  return match.toLowerCase().startsWith("ja") ? "ja" : "en"
}

function AppPreferencesInner({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [languagePreference, setLanguagePreferenceState] = useState<AppLanguagePreference>("zh")
  const [resolvedLanguage, setResolvedLanguage] = useState<AppLanguage>("zh")

  useEffect(() => {
    setMounted(true)

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === "system" || stored === "zh" || stored === "en" || stored === "ja") {
      setLanguagePreferenceState(stored)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (theme === "system") {
      setTheme("light")
    }
  }, [theme, setTheme, mounted])

  useEffect(() => {
    if (!mounted) return

    const resolveAndApply = () => {
      const nextLanguage = languagePreference === "system" ? detectBrowserLanguage() : languagePreference
      setResolvedLanguage(nextLanguage)
      document.documentElement.lang = nextLanguage === "ja" ? "ja" : nextLanguage === "zh" ? "zh-TW" : "en"
    }

    resolveAndApply()
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languagePreference)

    if (languagePreference === "system") {
      window.addEventListener("languagechange", resolveAndApply)
      return () => {
        window.removeEventListener("languagechange", resolveAndApply)
      }
    }

    return undefined
  }, [languagePreference, mounted])

  const resolvedTheme: "light" | "dark" = theme === "dark" ? "dark" : "light"

  const setThemePreference = useCallback(
    (value: AppThemePreference) => {
      setTheme(value)
    },
    [setTheme]
  )

  const setLanguagePreference = useCallback((value: AppLanguagePreference) => {
    setLanguagePreferenceState(value)
  }, [])

  const t = useCallback(
    (key: TranslationKey) => {
      const language = mounted ? resolvedLanguage : "zh"
      return translations[language][key]
    },
    [mounted, resolvedLanguage]
  )

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      themePreference: theme === "dark" ? "dark" : "light",
      setThemePreference,
      resolvedTheme,
      languagePreference,
      setLanguagePreference,
      resolvedLanguage,
      t,
      mounted,
    }),
    [theme, setThemePreference, resolvedTheme, languagePreference, setLanguagePreference, resolvedLanguage, t, mounted]
  )

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AppPreferencesInner>{children}</AppPreferencesInner>
    </ThemeProvider>
  )
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext)
  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider")
  }
  return context
}