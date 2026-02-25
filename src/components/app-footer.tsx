"use client"

import Link from "next/link"
import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import { usePathname } from "next/navigation"

export function AppFooter() {
  const pathname = usePathname()

  // Hide footer on dashboard pages — sidebar provides navigation there
  if (pathname?.startsWith("/dashboard")) {
    return null
  }

  return (
    <footer className="border-t bg-muted/50 mt-auto">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* 左側：預留給 Sidebar 的空間，桌機版顯示 Logo，手機版隱藏 */}
          <div className="hidden md:flex w-64 items-start justify-center">
            <div className="relative h-20 w-40">
              <Image
                src="/logo.png"
                alt="國立清華大學學生會 Logo"
                fill
                sizes="160px"
                className="object-contain"
              />
            </div>
          </div>

          {/* 右側：主要內容區 */}
          <div className="flex-1">
            {/* 主要內容區：三大區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {/* 第一區：聯絡資訊 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">聯絡資訊</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    國立清華大學 國立清華大學學生會
                  </p>
                  <p className="text-xs text-muted-foreground">
                    NTHU SA
                  </p>
                  <div className="space-y-1 pt-2">
                    <p>
                      <span className="font-medium">地址：</span>
                      <br />
                      300 新竹市光復路二段 101 號 ，國立清華大學，水木生活中心 2F R202 學生會辦公室（水木展演廳旁）
                    </p>
                    <p>
                      <span className="font-medium">公務信箱：</span>
                      <br />
                      <a
                        href="mailto:nthusa@gapp.nthu.edu.tw"
                        className="text-primary hover:underline"
                      >
                        nthusa@gapp.nthu.edu.tw
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* 第二區：快速連結 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">快速連結</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="https://nthusa.site.nthu.edu.tw/p/412-1438-21464.php?Lang=zh-tw"
                      className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                    >
                      借用管理辦法/規範
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://nthusa.site.nthu.edu.tw/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                    >
                      學生會官方網站
                    </a>
                  </li>
                </ul>
              </div>

              {/* 第三區：系統支援 + 關於系統 */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">系統支援</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a
                        href="mailto:sa-it@nthusa.tw?subject=野台借用系統問題回報"
                        className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                      >
                        系統問題回報
                      </a>
                      <span className="text-xs text-muted-foreground block mt-1">
                        (網頁操作問題請點此)
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <h3 className="text-lg font-semibold">關於系統</h3>
                  <p>
                    本系統為國立清華大學學生會資訊處設計，讓您輕鬆管理野台預約申請。
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* 底部版權區 */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <div className="text-center md:text-left">
                <p>
                  © 2026 國立清華大學學生會 (NTHU SA).
                  All Rights Reserved.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground cursor-not-allowed">
                    隱私權政策
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (頁面待建立)
                  </span>
                </div>
                <span className="text-xs font-mono">Ver 1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

