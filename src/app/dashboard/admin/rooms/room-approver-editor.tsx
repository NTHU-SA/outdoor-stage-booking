"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircle, Trash2, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type ApproverEntry = {
  user_id: string
  step_order: number
  label: string
}

export type UserOption = {
  id: string
  full_name: string | null
  email: string
  user_type: string | null
}

interface RoomApproverEditorProps {
  approvers: ApproverEntry[]
  onChange: (approvers: ApproverEntry[]) => void
  userOptions: UserOption[]
  isLoading?: boolean
}

const USER_TYPE_LABELS: Record<string, string> = {
  teacher: "教師",
  staff: "職員",
  assistant: "助教",
  student: "學生",
}

export function RoomApproverEditor({
  approvers,
  onChange,
  userOptions,
  isLoading = false,
}: RoomApproverEditorProps) {
  const [localApprovers, setLocalApprovers] = useState<ApproverEntry[]>(approvers)

  useEffect(() => {
    setLocalApprovers(approvers)
  }, [approvers])

  const handleAdd = () => {
    const nextOrder = localApprovers.length > 0
      ? Math.max(...localApprovers.map(a => a.step_order)) + 1
      : 1
    const updated = [
      ...localApprovers,
      { user_id: "", step_order: nextOrder, label: `第 ${nextOrder} 階段審核` },
    ]
    setLocalApprovers(updated)
    onChange(updated)
  }

  const handleRemove = (index: number) => {
    const updated = localApprovers
      .filter((_, i) => i !== index)
      .map((a, i) => ({ ...a, step_order: i + 1 }))
    setLocalApprovers(updated)
    onChange(updated)
  }

  const handleChange = (index: number, field: keyof ApproverEntry, value: string | number) => {
    const updated = localApprovers.map((a, i) =>
      i === index ? { ...a, [field]: value } : a
    )
    setLocalApprovers(updated)
    onChange(updated)
  }

  // Filter out users that are already selected
  const getAvailableUsers = (currentUserId: string) => {
    const selectedIds = localApprovers.map(a => a.user_id).filter(id => id !== currentUserId)
    return userOptions.filter(u => !selectedIds.includes(u.id))
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        載入人員清單中...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">多層級審核人</Label>
        <Badge variant="outline" className="text-xs">
          {localApprovers.length > 0 ? `${localApprovers.length} 位審核人` : "無多層級審核"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        指定後，預約需依序通過各階段審核人核准才算成功。不指定則維持原本管理員審核流程。
      </p>

      {localApprovers.length > 0 && (
        <div className="space-y-2">
          {localApprovers.map((approver, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="secondary" className="shrink-0 text-xs">
                第 {approver.step_order} 階
              </Badge>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Select
                  value={approver.user_id}
                  onValueChange={(value) => handleChange(index, "user_id", value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="選擇審核人" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableUsers(approver.user_id).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                        {user.user_type && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({USER_TYPE_LABELS[user.user_type] || user.user_type})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={approver.label}
                  onChange={(e) => handleChange(index, "label", e.target.value)}
                  placeholder="標籤，例如：空間管理人"
                  className="text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        新增審核階段
      </Button>
    </div>
  )
}
