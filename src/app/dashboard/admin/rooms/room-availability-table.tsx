"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export type Period = {
  id: string
  start: string
  end: string
}

// Fixed periods definition based on requirements
export const PERIODS = Array.from({ length: 28 }, (_, i) => {
  const startTotalMinutes = 8 * 60 + i * 30
  const endTotalMinutes = startTotalMinutes + 30
  
  const startHour = Math.floor(startTotalMinutes / 60).toString().padStart(2, '0')
  const startMin = (startTotalMinutes % 60).toString().padStart(2, '0')
  const endHour = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0')
  const endMin = (endTotalMinutes % 60).toString().padStart(2, '0')
  
  return {
    id: (i + 1).toString(),
    label: `${startHour}:${startMin}~${endHour}:${endMin}`,
    start: `${startHour}:${startMin}`,
    end: `${endHour}:${endMin}`,
  }
})

const DAYS = [
  { value: 1, label: '星期一' },
  { value: 2, label: '星期二' },
  { value: 3, label: '星期三' },
  { value: 4, label: '星期四' },
  { value: 5, label: '星期五' },
  { value: 6, label: '星期六' },
  { value: 0, label: '星期日' },
]

export type UnavailablePeriod = {
  day: number
  start: string
  end: string
}

type RoomAvailabilityTableProps = {
  value: UnavailablePeriod[]
  onChange: (value: UnavailablePeriod[]) => void
}

export function RoomAvailabilityTable({ value, onChange }: RoomAvailabilityTableProps) {
  const isSelected = (day: number, period: typeof PERIODS[0]) => {
    return value.some(
      (p) => p.day === day && p.start === period.start && p.end === period.end
    )
  }

  const handleToggle = (day: number, period: typeof PERIODS[0], checked: boolean) => {
    if (checked) {
      // Add period
      onChange([
        ...value,
        {
          day,
          start: period.start,
          end: period.end,
        },
      ])
    } else {
      // Remove period
      onChange(
        value.filter(
          (p) => !(p.day === day && p.start === period.start && p.end === period.end)
        )
      )
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-background">
      <div className="grid grid-cols-[2.5rem_7rem_repeat(7,1fr)] bg-muted/50 text-[13px] font-semibold text-center border-b">
        <div className="p-2 border-r">節次</div>
        <div className="p-2 border-r">時間</div>
        {DAYS.map((day) => (
          <div key={day.value} className="p-2 border-r last:border-r-0">
            {day.label}
          </div>
        ))}
      </div>
      <div className="text-[13px] max-h-[400px] overflow-y-auto">
        {PERIODS.map((period, idx) => (
          <div 
            key={period.id} 
            className={cn(
              "grid grid-cols-[2.5rem_7rem_repeat(7,1fr)] transition-colors",
              idx % 2 === 0 ? "bg-background" : "bg-muted/20",
              "hover:bg-muted/40"
            )}
          >
            <div className="p-1 border-r border-b text-center flex items-center justify-center font-medium text-muted-foreground">
              {period.id}
            </div>
            <div className="p-1 border-r border-b text-center flex items-center justify-center text-muted-foreground text-[11px]">
              {period.label}
            </div>
            {DAYS.map((day) => {
              const checked = isSelected(day.value, period)
              return (
                <div
                  key={day.value}
                  className={cn(
                    "p-1 border-r last:border-r-0 border-b flex items-center justify-center transition-colors",
                    checked && "bg-destructive/10"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => handleToggle(day.value, period, c === true)}
                    className="h-4 w-4 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

