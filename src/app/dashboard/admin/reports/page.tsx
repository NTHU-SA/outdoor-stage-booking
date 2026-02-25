import { getMaintenanceRequests } from "@/app/actions/maintenance"
import { ReportList } from "./report-list"

export default async function AdminReportsPage() {
  const requests = await getMaintenanceRequests()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">報修系統管理</h2>
          <p className="text-muted-foreground">
            查看與處理報修系統
          </p>
        </div>
      </div>
      
      <ReportList initialRequests={requests} />
    </div>
  )
}

