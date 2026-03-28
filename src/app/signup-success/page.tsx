"use client"

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle2, ArrowRight } from "lucide-react"
import Link from 'next/link'

function SignupSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/login_cover.jpg"
            alt="Background"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-br from-white/80 via-white/60 to-white/80 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-900/80" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          {/* Header Section with Image */}
          <div className="relative h-64 sm:h-80 overflow-hidden">
            <Image
              src="/login_cover.jpg"
              alt="Success Background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 sm:left-10 z-10 text-white">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                註冊成功！
              </h1>
              <p className="text-lg sm:text-xl opacity-90">
                國立清華大學學生會野台借用系統
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 sm:p-12 space-y-8">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
                <div className="relative bg-green-500 rounded-full p-4">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>

            {/* Main Message */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                請驗證您的電子信箱
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                我們已發送驗證信件至您的信箱
                {email && (
                  <span className="block mt-2 font-semibold text-slate-900 dark:text-slate-100">
                    {email}
                  </span>
                )}
              </p>
            </div>

            {/* Steps */}
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Step 1 */}
              <div className="flex gap-4 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    步驟 1：檢查信箱
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    開啟您的電子信箱，找到驗證信件
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    步驟 2：點擊驗證連結
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    點擊信件中的驗證按鈕或連結
                  </p>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="flex items-start gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl max-w-2xl mx-auto">
              <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  驗證後即可使用
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  完成信箱驗證後，即可登入系統開始使用野台借用功能，無需等待審核。
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full sm:w-auto"
              >
                返回登入頁面
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p>
                沒有收到信件？請檢查垃圾郵件資料夾，或
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                  重新註冊
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">載入中...</p>
        </div>
      </div>
    }>
      <SignupSuccessContent />
    </Suspense>
  )
}

