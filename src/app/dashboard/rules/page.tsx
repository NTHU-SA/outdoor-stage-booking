import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">借用規則說明</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>借用原則與規範</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <p className="leading-7">
              為有效管理及運用本院野台空間，並兼顧各單位業務推動需求，特將相關借用原則說明如下，請各系所周知並轉知師生遵循。
            </p>
            <ul className="list-none space-y-2">
              <li>
                <span className="font-semibold">1. 借用方法：</span>填寫此表單申請
              </li>
              <li>
                <span className="font-semibold">2. 借用原則：</span>由於會議室數量有限，學生口試請先洽借研討室使用，以利會議室供其他行政及學術需求使用。
              </li>
              <li>
                <span className="font-semibold">3. 收費說明：</span>目前野台借用為利業務推動，暫不收取費用；惟後續將視使用狀況及實際需求，另行研議並訂定收費辦法。
              </li>
              <li>
                <span className="font-semibold">4. 借用時間：</span>全天 24 小時皆可申請借用（00:00 – 24:00）。
              </li>
              <li>
                <span className="font-semibold">5. 申請期限：</span>一般使用者須於借用日 <span className="text-red-600 font-semibold">3 天前</span>提出申請。
              </li>
              <li>
                <span className="font-semibold">6. 借用期限：</span>單次連續借用最多 <span className="text-red-600 font-semibold">2 週（14 天）</span>，系統將自動核准；超過 2 週需送交人工審核。
              </li>
              <li>
                <span className="font-semibold">7. 時間衝突：</span>同一空間同一時段僅允許一筆預約，系統將自動進行衝突比對，重疊時段申請將被拒絕。
              </li>
              <li>
                <span className="font-semibold">8. 鑰匙管理：</span>借用人請至院辦公室辦理鑰匙借取與歸還手續，並依規定使用與維護空間。
              </li>
            </ul>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">借用流程</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">使用者登記空間</span>
                <span>→</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">空間管理人通過野台借用</span>
                <span>→</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">使用者使用空間</span>
                <span>→</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">使用完畢</span>
                <span>→</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">使用者補登記現場借用的設備</span>
                <span>→</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">空間管理人確認設備OK後通過</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">完整規定流程圖</h3>
            {/* 使用者請將圖片命名為 booking-rules.png 並放入 public 資料夾 */}
            <div className="relative w-3/4 mx-auto rounded-lg overflow-hidden border bg-muted">
              <Image
                src="/booking-rules.png"
                alt="完整規定流程圖"
                width={1920}
                height={1080}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

