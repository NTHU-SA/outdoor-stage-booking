"use client"

import { MoonStar, Languages, Sun } from "lucide-react"
import { useAppPreferences } from "@/components/app-preferences-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const {
    t,
    themePreference,
    setThemePreference,
    resolvedTheme,
    languagePreference,
    setLanguagePreference,
    resolvedLanguage,
  } = useAppPreferences()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MoonStar className="size-5" />
              {t("settings.theme.title")}
            </CardTitle>
            <CardDescription>{t("settings.theme.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-select">{t("settings.theme.title")}</Label>
              <Select
                value={themePreference}
                  onValueChange={(value) => setThemePreference(value as "light" | "dark")}
              >
                <SelectTrigger id="theme-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="size-4" />
                      {t("settings.theme.light")}
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <MoonStar className="size-4" />
                      {t("settings.theme.darkBeta")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.theme.current")}: {resolvedTheme === "dark" ? t("settings.theme.current.dark") : t("settings.theme.current.light")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-5" />
              {t("settings.language.title")}
            </CardTitle>
            <CardDescription>{t("settings.language.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language-select">{t("settings.language.title")}</Label>
              <Select
                value={languagePreference}
                onValueChange={(value) => setLanguagePreference(value as "system" | "zh" | "en" | "ja")}
              >
                <SelectTrigger id="language-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("settings.language.system")}</SelectItem>
                  <SelectItem value="zh">{t("settings.language.chinese")}</SelectItem>
                  <SelectItem value="en">{t("settings.language.englishBeta")}</SelectItem>
                  <SelectItem value="ja">{t("settings.language.japaneseBeta")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.language.current")}: {resolvedLanguage === "zh" ? t("settings.language.chinese") : resolvedLanguage === "ja" ? t("settings.language.japanese") : t("settings.language.english")}
            </p>
            <p className="text-sm text-muted-foreground">{t("settings.note")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
