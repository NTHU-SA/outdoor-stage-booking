import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { ApproverReviewClient } from "./approver-review-client"
import { getApproverBookings } from "@/app/actions/admin-approvers"

export default async function ApproverReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const data = await getApproverBookings()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">多階層審核任務</h2>
          <p className="text-muted-foreground text-sm mt-1">
            您被指定為空間管理人，以下為需要您審核的預約申請。
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<div className="h-10" />}>
            <ApproverReviewClient initialData={data} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
