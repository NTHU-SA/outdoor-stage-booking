"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/hooks/use-user"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const USER_TYPE_LABELS: Record<string, string> = {
  teacher: "教師",
  staff: "職員",
  external: "校外人士",
  student: "學生",
}

type Profile = {
  full_name: string | null
  phone: string | null
  user_type: string | null
}

export default function ProfilePage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone: "",
    user_type: "",
  })
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      setIsLoadingProfile(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, user_type")
        .eq("id", user.id)
        .single()

      if (error) {
        // 若沒有找到資料，保持預設空值即可
        if (error.code !== "PGRST116") {
          console.error(error)
          toast.error("載入基本資料時發生錯誤")
        }
      } else if (data) {
        setProfile({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          user_type: data.user_type ?? "",
        })
      }

      setIsLoadingProfile(false)
    }

    if (user) {
      loadProfile()
    }
  }, [user, supabase])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    if (!profile.full_name || profile.full_name.trim().length === 0) {
      toast.error("請填寫顯示名稱 / 姓名")
      return
    }

    setIsSaving(true)

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          user_type: profile.user_type || null,
        },
        { onConflict: "id" }
      )

    setIsSaving(false)

    if (error) {
      console.error(error)
      toast.error("更新基本資料失敗，請稍後再試")
      return
    }

    toast.success("基本資料更新成功")
  }

  if (loading || isLoadingProfile || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">使用者基本資料</h1>
        <p className="text-sm text-muted-foreground">
          此頁面僅用於系統顯示與聯絡使用，不會對外公開您的個人資訊。
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>個人資料設定</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Email（不可修改）</Label>
              <Input value={user.email ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">顯示名稱 / 姓名</Label>
              <Input
                id="full_name"
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="例如：王小明"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">聯絡電話</Label>
              <Input
                id="phone"
                value={profile.phone ?? ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="例如：您的電話"
              />
            </div>

            <div className="space-y-2">
              <Label>職稱</Label>
              <Select
                value={profile.user_type ?? ""}
                onValueChange={(value) => setProfile((prev) => ({ ...prev, user_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇您的職稱" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">{USER_TYPE_LABELS.teacher}</SelectItem>
                  <SelectItem value="staff">{USER_TYPE_LABELS.staff}</SelectItem>
                  <SelectItem value="external">{USER_TYPE_LABELS.external}</SelectItem>
                  <SelectItem value="student">{USER_TYPE_LABELS.student}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                disabled={isSaving}
              >
                返回儀表板
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                儲存變更
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


