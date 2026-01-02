"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { MaintenanceRequest, updateMaintenanceStatus } from "@/app/actions/maintenance"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Download, ExternalLink, User, Phone, Mail, MapPin, Calendar, FileText, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

type ReportDetailDialogProps = {
  request: MaintenanceRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdated: () => void
}

const statusLabels: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  completed: "已完成",
  rejected: "已駁回",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const affiliationLabels: Record<string, string> = {
  student: "學生",
  teacher: "教師",
  staff: "行政人員",
}

export function ReportDetailDialog({ 
  request, 
  open, 
  onOpenChange, 
  onStatusUpdated 
}: ReportDetailDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<string>(request.status)
  const [adminNotes, setAdminNotes] = useState<string>(request.admin_notes || "")
  const [isHidden, setIsHidden] = useState<boolean>(request.is_hidden || false)

  const handleUpdateStatus = async () => {
    if (newStatus === request.status && adminNotes === (request.admin_notes || "") && isHidden === request.is_hidden) {
      toast.info("沒有變更")
      return
    }

    setIsUpdating(true)
    try {
      await updateMaintenanceStatus(
        request.id, 
        newStatus as 'pending' | 'processing' | 'completed' | 'rejected',
        adminNotes,
        isHidden
      )
      toast.success("狀態已更新")
      onStatusUpdated()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "更新失敗"
      toast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            報修系統詳情
            <Badge className={statusColors[request.status]} variant="secondary">
              {statusLabels[request.status]}
            </Badge>
            {request.is_hidden && (
                <Badge variant="outline" className="text-muted-foreground border-dashed">
                    已隱藏
                </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            提交於 {format(new Date(request.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Applicant Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">申請人資訊</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{request.applicant_name}</span>
                  <Badge variant="outline">{affiliationLabels[request.affiliation]}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{request.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{request.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${request.email}`} className="text-primary hover:underline">
                    {request.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">問題資訊</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{request.location}</span>
                </div>
                {request.occurrence_time && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      發生於 {format(new Date(request.occurrence_time), "yyyy/MM/dd", { locale: zhTW })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">問題描述</h4>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="whitespace-pre-wrap">{request.description}</p>
            </div>
          </div>

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                附件 ({request.attachments.length})
              </h4>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                {request.attachments.map((url, index) => (
                  <div key={index} className="relative group rounded-lg border overflow-hidden">
                    {isImageUrl(url) ? (
                      <div className="aspect-square relative">
                        <Image
                          src={url}
                          alt={`附件 ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="secondary">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square flex flex-col items-center justify-center p-4 bg-muted/50">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          下載檔案
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium">處理狀態與設定</h4>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>更改狀態</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待處理</SelectItem>
                    <SelectItem value="processing">處理中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="rejected">已駁回</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="block">公開顯示設定</Label>
                <div className="flex items-center justify-between border rounded-md p-2 h-10">
                    <div className="flex items-center gap-2">
                        {isHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                        <span className="text-sm">{isHidden ? "已隱藏 (僅管理員可見)" : "公開顯示"}</span>
                    </div>
                    <Switch checked={isHidden} onCheckedChange={setIsHidden} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>管理備註（可選）</Label>
              <Textarea
                placeholder="輸入處理備註或說明..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleUpdateStatus} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存變更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

