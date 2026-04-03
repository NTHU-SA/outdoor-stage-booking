"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { useTheme } from "next-themes"
import { AlertTriangle, Clock, Users, MapPin, Zap, Ban, Mail, Bold } from "lucide-react"

export default function RulesPage() {
  const SA_EMAIL = "nthusa@gapp.nthu.edu.tw"
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDarkMode = mounted && resolvedTheme === "dark"
  const flowImage = isDarkMode
    ? { src: "/booking-flow-2.png", alt: "借用流程圖", label: "流程圖" }
    : { src: "/booking-flow-1.png", alt: "借用流程圖", label: "流程圖" }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">野台借用須知</h2>
      </div>

      {/* 重要提醒 */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            為維持野台使用秩序與公平性，並確保活動安全與場地整潔，請借用單位於申請前詳閱以下規範。
          </p>
        </div>
      </div>

      {/* 一、借用時段 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            一、借用時段
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
              <p className="text-sm leading-relaxed">
                野台可透過本系統借用之時段為{" "}
                <span className="font-semibold text-red-600">每日 8:00 A.M. 至 10:00 P.M.</span>
                ，每日原則上最多借用{" "}
                <span className="font-semibold text-red-600">4 小時</span>
                ，每個月最多借用{" "}
                <span className="font-semibold text-red-600">12 天</span>。
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
              <p className="text-sm leading-relaxed">
                野台預約須於借用日前{" "}
                <span className="font-semibold text-red-600">「一個月至前一日」</span>{" "}
                完成申請。
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
              <p className="text-sm leading-relaxed">
                若需取消或異動，請於{" "}
                <span className="font-semibold text-red-600">借用日前 2 日</span>{" "}
                聯繫學生會。
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">4</Badge>
              <div className="text-sm leading-relaxed">
                <p>有下列情形，請依第六點「聯繫方式與例外申請」之規定辦理：</p>
                <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                  <li>需借用非開放時段</li>
                  <li>系統無法使用或發生異常</li>
                  <li>其他特殊情形</li>
                </ul>
                <p className="mt-1">學生會得依申請內容及實際情況審核後決定是否同意借用。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 二、借用單位優先順序與相關規定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            二、借用單位優先順序與相關規定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
              <p className="text-sm leading-relaxed">
                野台借用以{" "}
                <span className="font-semibold">學生社團及校內行政單位</span>{" "}
                為優先。校外單位及未經報備之團體須禮讓優先對象。學生社團資格以{" "}
                <span className="font-semibold">課外活動組公告之社團名單</span>{" "}
                為準。
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
              <div className="text-sm leading-relaxed">
                <p>
                  <span className="font-semibold">校外單位不得透過本系統申請借用野台。</span>
                  <br />
                  如有借用需求，應依第六點「聯繫方式與例外申請」之規定提出申請，經學生會審核後辦理借用事宜。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 三、場地分區說明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            三、場地分區說明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">
            野台分區以面對小吃部方向為準，分為{" "}
            <span className="font-semibold" style={{ color: "#dca43c" }}>「右區」</span>、
            <span className="font-semibold" style={{ color: "#467e39" }}>「中間區」</span>、
            <span className="font-semibold" style={{ color: "#b642c0" }}>「左區」</span>、
            <span className="font-semibold" style={{ color: "#332c9b" }}>「座位區」</span>{" "}
            共四區。<br />
            每次借用 <span className="font-semibold text-red-600">以一區為原則且不得跨區使用</span>。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            如有同時借用多區或其他特殊需求者，請依第六點「聯繫方式與例外申請」之規定辦理。
          </p>

          {/* 野台位置示意圖 placeholder */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">野台位置示意圖</h4>
            <button
              type="button"
              onClick={() => setPreviewImage({ src: "/outstage-location-map.png", alt: "野台位置示意圖" })}
              className="relative block w-full md:max-w-lg mx-auto rounded-lg overflow-hidden border bg-transparent cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="點擊查看野台位置示意圖大圖"
            >
              <Image
                src="/outstage-location-map.png"
                alt="野台位置示意圖"
                width={1920}
                height={1080}
                className="w-full h-auto object-contain"
                onError={(e) => {
                  // Hide broken image - will show placeholder
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-48 text-muted-foreground text-sm">野台位置示意圖（待上傳 /public/outstage-location-map.png）</div>'
                }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 四、使用規範 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            四、使用規範
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
              <div className="text-sm leading-relaxed">
                <p>
                  野台提供 {" "}
                  <span className="font-semibold">3 個 110V 插座</span>位於無障礙坡道牆面，插座位置如分區示意圖所標示。
                  若有大型用電需求，請務必事前與學生會商議並取得同意方可使用。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
              <div className="text-sm leading-relaxed">
                <p>
                  學生會僅提供「場地」，不提供桌椅等器材。如有需求請參考「課外組器材管理要點」，於 國立清華大學社團管理系統 申請租借器材。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
              <div className="text-sm leading-relaxed">
                <p>
                  借用單位須負場地安全與整潔責任。使用結束時，須將物品淨空並恢復借用前狀況。若造成場地或設施損壞，須負修復或賠償責任。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">4</Badge>
              <p className="text-sm leading-relaxed">
                使用音響或擴音設備時，音量不得影響周邊教學與行政單位，且不得長時間高音量播放。若因噪音造成投訴或影響校園秩序，學生會得要求立即改善或停止活動。
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">5</Badge>
              <p className="text-sm leading-relaxed">
                借用單位之攤位、設備及排隊動線不得影響其他借用單位或公共通行空間。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 五、禁止行為與違規處理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            五、禁止行為與違規處理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-semibold">野台禁止以下行為：</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "炊膳或用火（如瓦斯、木炭、煙火等）",
              "留宿或過夜",
              "吸菸或嚼食檳榔",
              "赤膊裸體",
              "攜帶危險或違禁物品",
              "放置私人或社團器材過夜",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="text-red-500 mt-0.5">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            若物品遺失，請自行負責。
          </p>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              若違反上述規範、使用大型用電未報備、或填寫申請資料不實（如冒用名義），學生會將給予警告或撤銷申請，累犯者將不予通過該學年度之借用申請。
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            六、例外申請及聯繫方式
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm bg-secondary/50 p-2 rounded w-fit">【校內單位特殊申請】（限學生社團及校內單位）</h4>
            <p className="text-sm text-muted-foreground">如有下列情形，請依本點規定透過<a href="mailto:nthusa@gapp.nthu.edu.tw?subject=【校內單位野台借用申請】(活動名稱)&body=【特殊申請類型】（可複選）（借用非開放時段／同時段借用多區／系統異常／其他特殊情形（請說明））%0A%0A【活動基本資訊】%0A活動名稱：%0A活動內容（簡述）：%0A借用單位類型：（學生團體／校內官方單位）%0A借用單位名稱：%0A%0A【場地借用資訊】%0A借用日期：%0A借用時段：%0A借用區域：（中間區／左區／右區／座位區）%0A需求說明：%0A%0A【活動／單位負責人資料】%0A單位職稱／系級：%0A姓名：%0A信箱：%0A聯絡電話：%0A%0A【備註】：" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">本連結</a>提出申請：</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>超出前述時段限制及需要借用非開放時段</li>
              <li>同時段借用多區</li>
              <li>系統無法使用或發生異常</li>
              <li>其他特殊情形</li>
            </ul>
            <p className="text-sm">學生會得依申請內容及實際情況審核後決定是否同意借用。</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm bg-secondary/50 p-2 rounded w-fit">【校外單位申請】（限企業及校外單位）</h4>
            <p className="text-sm">校外單位不得透過本系統申請借用野台，如有需求，須透過<a href="mailto:nthusa@gapp.nthu.edu.tw?subject=【校外單位野台借用申請】(活動名稱)&body=Ⅰ.%20申請單位基本資訊%0A單位名稱：%0A單位性質：企業／校外單位%0A負責人姓名及職稱／部門：%0A聯絡電話 / 信箱：%0A申請日期：%0A%0AⅡ.%20活動概況%0A活動名稱：%0A活動日期與時段：%0A借用區域：右間／中間區／左區／座位區%0A活動目標與宗旨：%0A活動流程與內容簡述：%0A預計參與人數：%0A%0AⅢ.%20企劃說明%0A活動主題與核心理念：%0A預期效益／成果：%0A對象群體及影響範圍：%0A活動特色或創新點：%0A與學生會或校內單位的合作說明：%0A如有合作協議，請附說明或附件：%0A%0AⅣ.%20資源與場地需求%0A場地設備需求（桌椅、擴音設備、插座、電力等）：%0A其他資源或支援需求：%0A特殊安全或管理需求（如保險、醫療、安保）：%0A%0AⅤ.%20宣傳與媒體計畫%0A活動宣傳方式：%0A預期曝光或受眾：%0A如需校園媒體或外部媒體協助，請說明：%0A%0AⅥ.%20風險管理與應變措施%0A安全措施：%0A防災或突發事件應變計畫：%0A活動結束後場地恢復計畫：%0A%0AⅦ.%20附錄／備註%0A附企劃書 PDF 或參考資料（如有）：%0A其他說明或補充：" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">本連結</a>提出申請，經審核同意後辦理。</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm bg-secondary/50 p-2 rounded w-fit">【一般聯繫方式】</h4>
            <p className="text-sm leading-relaxed">
              如有其他問題，請寄信至學生會信箱：
              <a href={`mailto:${SA_EMAIL}`} className="ml-1 font-semibold text-blue-600 hover:underline dark:text-blue-400">
                {SA_EMAIL}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 借用流程 */}
      <Card>
        <CardHeader>
          <CardTitle>借用流程</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 簡易文字流程 */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {[
              "提出借用申請",
              "學生會審核",
              "審核通過並完成預約",
              "依申請時段使用場地",
              "使用完畢恢復場地",
            ].map((step, index, arr) => (
              <div key={step} className="flex items-center gap-2 mb-2">
                <span className="font-medium text-foreground px-2 py-1 bg-secondary rounded-md">
                  {step}
                </span>
                {index < arr.length - 1 && <span className="text-muted-foreground/50">→</span>}
              </div>
            ))}
          </div>

          {/* 借用流程圖 placeholders */}
          <div className="border-t pt-6 space-y-6">
            <h3 className="text-lg font-semibold">完整借用流程圖</h3>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground text-center">{flowImage.label}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage({ src: flowImage.src, alt: flowImage.alt })}
                className="relative block w-full max-w-xl mx-auto rounded-lg overflow-hidden border bg-muted cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`點擊查看${flowImage.label}大圖`}
              >
                <Image
                  src={flowImage.src}
                  alt={flowImage.alt}
                  width={1920}
                  height={1080}
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-48 text-muted-foreground text-sm">借用流程圖（待上傳 /public/booking-flow-1.png 或 /public/booking-flow-2.png）</div>'
                  }}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl p-2">
          <DialogTitle className="sr-only">圖片預覽</DialogTitle>
          {previewImage && (
            <div className="w-full max-h-[85vh] overflow-auto">
              <Image
                src={previewImage.src}
                alt={previewImage.alt}
                width={2400}
                height={1400}
                className="w-full h-auto object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
