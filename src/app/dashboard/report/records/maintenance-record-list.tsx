"use client"

import { useState } from "react"
import { MaintenanceRecord } from "@/utils/supabase/queries"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { toTaipeiTime } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type MaintenanceRecordListProps = {
  initialRecords: MaintenanceRecord[]
}

export function MaintenanceRecordList({ initialRecords }: MaintenanceRecordListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">待處理</Badge>
      case 'processing':
        return <Badge className="bg-blue-600 hover:bg-blue-700">處理中</Badge>
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-700">已完成</Badge>
      case 'rejected':
        return <Badge variant="destructive">已駁回</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredRecords = initialRecords.filter(record => {
    // Only show visible records (unless user is admin, but this list is for public)
    // The query already handles is_hidden for public, but let's be safe
    if (record.is_hidden) return false

    const searchContent = `${record.location} ${record.applicant_name} ${record.description}`.toLowerCase()
    return searchContent.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          placeholder="搜尋位置、申請人或描述..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecords.map((record) => (
          <Card 
            key={record.id} 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setSelectedRecord(record)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium line-clamp-1" title={record.location}>
                  {record.location}
                </CardTitle>
                {getStatusBadge(record.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {format(toTaipeiTime(record.created_at), "yyyy/MM/dd HH:mm")}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {record.description}
              </p>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              申請人：{record.applicant_name}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>報修詳情</DialogTitle>
            <DialogDescription>
              {selectedRecord && format(toTaipeiTime(selectedRecord.created_at), "yyyy/MM/dd HH:mm")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-1">狀態</h4>
                    {getStatusBadge(selectedRecord.status)}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">位置</h4>
                    <p>{selectedRecord.location}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">申請人</h4>
                    <p>{selectedRecord.applicant_name}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">單位</h4>
                    <p>{selectedRecord.unit}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">問題描述</h4>
                  <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                    {selectedRecord.description}
                  </div>
                </div>

                {selectedRecord.image_url && (
                  <div>
                    <h4 className="font-semibold mb-2">相關照片</h4>
                    <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                      <Image
                        src={selectedRecord.image_url}
                        alt="報修照片"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}

                {selectedRecord.admin_notes && (
                  <div>
                    <h4 className="font-semibold mb-2">處理說明</h4>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                      {selectedRecord.admin_notes}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

