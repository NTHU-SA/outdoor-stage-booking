import { createClient } from "@/utils/supabase/server"
import { ReportForm } from "./report-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let defaultValues = {
    applicant_name: "",
    email: "",
    unit: "",
  }

  // Pre-fill user info if logged in
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (profile) {
      defaultValues = {
        applicant_name: profile.full_name || "",
        email: profile.email || user.email || "",
        unit: "",
      }
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">報修系統</h2>
        <p className="text-muted-foreground">
          Request Form for Issue Report / Construction Application
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            國立清華大學學生會野台報修系統
          </CardTitle>
          <CardDescription className="space-y-4 pt-2">
            <p>
              為維護野台空間品質與師生使用安全，若遇到環境或設施相關問題或需要維修改善之處，再請填寫表單，我們收到後會轉交相關單位盡速處理。
            </p>
            <p className="text-sm text-muted-foreground">
              To maintain building quality and ensure the safety of faculty and students, please report any classroom, facility, or environmental issues through the designated form for prompt handling.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportForm defaultValues={defaultValues} />
        </CardContent>
      </Card>
    </div>
  )
}

