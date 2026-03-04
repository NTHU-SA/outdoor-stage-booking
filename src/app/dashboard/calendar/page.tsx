import { OverviewCalendar } from "./overview-calendar"

export default function CalendarOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">總覽日曆</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        在此查看所有空間的借用狀況，可切換月、週、日視圖，並篩選特定空間。
      </p>
      <OverviewCalendar />
    </div>
  )
}
