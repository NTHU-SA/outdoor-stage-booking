"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Loader2, AlertTriangle, CheckCircle2, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { SemesterSetting } from "@/utils/semester"
import { getCurrentSemester, getNextSemester, getMaxBookableDate } from "@/utils/semester"
import { updateSemesterSettings, toggleNextSemesterOpen } from "@/app/actions/admin-settings"

type SettingsClientProps = {
  initialSemesters: SemesterSetting[]
}

export function SettingsClient({ initialSemesters }: SettingsClientProps) {
  const [semesters, setSemesters] = useState(initialSemesters)
  const [saving, setSaving] = useState<string | null>(null)

  const currentSemester = getCurrentSemester(semesters)
  const nextSemester = getNextSemester(semesters, currentSemester)
  const maxBookableDate = getMaxBookableDate()

  const handleDateChange = async (semesterId: string, field: 'start_date' | 'end_date', date: Date | undefined) => {
    if (!date) return

    const dateString = format(date, 'yyyy-MM-dd')
    
    setSaving(semesterId)
    try {
      await updateSemesterSettings(semesterId, { [field]: dateString })
      
      // Update local state
      setSemesters(prev => prev.map(s => 
        s.id === semesterId ? { ...s, [field]: dateString } : s
      ))
      
      toast.success('學期日期已更新')
    } catch (error) {
      toast.error('更新失敗')
      console.error(error)
    } finally {
      setSaving(null)
    }
  }

  const handleToggleOpen = async (semesterId: string, currentValue: boolean) => {
    setSaving(semesterId)
    try {
      await toggleNextSemesterOpen(semesterId, !currentValue)
      
      // Update local state
      setSemesters(prev => prev.map(s => 
        s.id === semesterId ? { ...s, is_next_semester_open: !currentValue } : s
      ))
      
      toast.success(currentValue ? '已關閉下學期借用' : '已開放下學期借用')
    } catch (error) {
      toast.error('更新失敗')
      console.error(error)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            借用限制狀態
          </CardTitle>
          <CardDescription>
            目前系統的借用限制設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Current Semester */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  當前學期
                </Badge>
              </div>
              <p className="font-semibold">
                {currentSemester?.semester_name || '無（非學期期間）'}
              </p>
              {currentSemester && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(currentSemester.start_date), 'yyyy/MM/dd')} - {format(new Date(currentSemester.end_date), 'yyyy/MM/dd')}
                </p>
              )}
            </div>

            {/* Next Semester Status */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                {nextSemester?.is_next_semester_open ? (
                  <Badge className="bg-green-500">
                    <Unlock className="h-3 w-3 mr-1" />
                    開放借用
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <Lock className="h-3 w-3 mr-1" />
                    鎖定中
                  </Badge>
                )}
              </div>
              <p className="font-semibold">
                {nextSemester?.semester_name || '下學期'}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextSemester?.is_next_semester_open 
                  ? '使用者可預約下學期空間' 
                  : '使用者無法預約下學期空間'}
              </p>
            </div>

            {/* 4 Month Limit */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">
                  4 個月限制
                </Badge>
              </div>
              <p className="font-semibold">
                最遠可預約至
              </p>
              <p className="text-sm text-muted-foreground">
                {format(maxBookableDate, 'yyyy/MM/dd', { locale: zhTW })}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          {nextSemester && !nextSemester.is_next_semester_open && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    下學期借用已鎖定
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                    一般使用者目前無法預約 {nextSemester.semester_name} ({format(new Date(nextSemester.start_date), 'MM/dd')} - {format(new Date(nextSemester.end_date), 'MM/dd')}) 的空間。
                    課表確認後，請開啟下方的「開放下學期借用」開關。
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Semester Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        {semesters.map((semester) => (
          <Card key={semester.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{semester.semester_name}</span>
                {currentSemester?.id === semester.id && (
                  <Badge className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    當前
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                設定學期日期範圍和借用開放狀態
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label>開始日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !semester.start_date && "text-muted-foreground"
                        )}
                        disabled={saving === semester.id}
                      >
                        {saving === semester.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CalendarIcon className="mr-2 h-4 w-4" />
                        )}
                        {semester.start_date 
                          ? format(new Date(semester.start_date), 'yyyy/MM/dd', { locale: zhTW })
                          : '選擇日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={semester.start_date ? new Date(semester.start_date) : undefined}
                        onSelect={(date) => handleDateChange(semester.id, 'start_date', date)}
                        locale={zhTW}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label>結束日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !semester.end_date && "text-muted-foreground"
                        )}
                        disabled={saving === semester.id}
                      >
                        {saving === semester.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CalendarIcon className="mr-2 h-4 w-4" />
                        )}
                        {semester.end_date 
                          ? format(new Date(semester.end_date), 'yyyy/MM/dd', { locale: zhTW })
                          : '選擇日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={semester.end_date ? new Date(semester.end_date) : undefined}
                        onSelect={(date) => handleDateChange(semester.id, 'end_date', date)}
                        locale={zhTW}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Toggle Open */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">開放下學期借用</Label>
                  <p className="text-sm text-muted-foreground">
                    開啟後，一般使用者可預約此學期的空間
                  </p>
                </div>
                <Switch
                  checked={semester.is_next_semester_open}
                  onCheckedChange={() => handleToggleOpen(semester.id, semester.is_next_semester_open)}
                  disabled={saving === semester.id}
                />
              </div>

              {/* Last Updated */}
              <p className="text-xs text-muted-foreground">
                最後更新：{format(new Date(semester.updated_at), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>借用規則說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">一般使用者限制：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>僅能預約未來 4 個月內的日期</li>
              <li>需於 7 天前申請預約</li>
              <li>每次預約僅能借用單日（不能跨日連續借用）</li>
              <li>下學期課表確認前，無法預約下學期的空間</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">管理員：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>不受 4 個月限制</li>
              <li>不受 7 天前申請限制</li>
              <li>可在下學期鎖定期間預約</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

