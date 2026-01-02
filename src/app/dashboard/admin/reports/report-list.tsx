"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { MaintenanceRequest, getMaintenanceRequests } from "@/app/actions/maintenance"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReportDetailDialog } from "./report-detail-dialog"
import { Eye, RefreshCw } from "lucide-react"

type ReportListProps = {
  initialRequests: MaintenanceRequest[]
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

export function ReportList({ initialRequests }: ReportListProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(initialRequests)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)

  const handleFilterChange = async (status: string) => {
    setStatusFilter(status)
    setIsLoading(true)
    try {
      const data = await getMaintenanceRequests(status)
      setRequests(data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await getMaintenanceRequests(statusFilter)
      setRequests(data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdated = async () => {
    // Refresh the list after status update
    await handleRefresh()
    setSelectedRequest(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">狀態篩選：</span>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待處理</SelectItem>
              <SelectItem value="processing">處理中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="rejected">已駁回</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">待處理</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
            {initialRequests.filter(r => r.status === 'pending').length}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400">處理中</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {initialRequests.filter(r => r.status === 'processing').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">已完成</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {initialRequests.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">已駁回</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {initialRequests.filter(r => r.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">狀態</TableHead>
              <TableHead>申請人</TableHead>
              <TableHead>身份</TableHead>
              <TableHead>地點</TableHead>
              <TableHead>問題描述</TableHead>
              <TableHead>提交時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  目前沒有回報記錄
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow 
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedRequest(request)}
                >
                  <TableCell>
                    <Badge className={statusColors[request.status]} variant="secondary">
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{request.applicant_name}</TableCell>
                  <TableCell>{affiliationLabels[request.affiliation]}</TableCell>
                  <TableCell>{request.location}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.description}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "MM/dd HH:mm", { locale: zhTW })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      {selectedRequest && (
        <ReportDetailDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  )
}

