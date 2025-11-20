"use client"

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // Auth View State
  const [authView, setAuthView] = useState<'sign_in' | 'sign_up'>('sign_in')

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  // Timer effect for cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [cooldown])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (cooldown > 0) return
    if (!resetEmail) {
        toast.error("請輸入電子郵件")
        return
    }

    setIsResetting(true)
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: `${origin}/auth/callback?next=/reset-password`,
        })

        if (error) throw error

        toast.success("重設密碼信件已發送，請檢查您的信箱")
        setCooldown(60)
        setIsDialogOpen(false)
    } catch (error: any) {
        toast.error(error.message || "發送失敗，請稍後再試")
    } finally {
        setIsResetting(false)
    }
  }

  // 動態計算重定向 URL（用於註冊確認和重設密碼）
  // 根據當前環境自動判斷：localhost 或正式站
  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return ''
    // 使用當前頁面的 origin，這樣可以自動適應 localhost 或正式站
    return `${origin}/auth/callback?next=/dashboard`
  }

  if (!isMounted) return null

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      {/* Left/Top Side - Image */}
      <div className="relative w-full h-[30vh] lg:h-full bg-muted">
        <Image
          src="/login_cover.png"
          alt="Login Visual"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/10" /> {/* Subtle overlay */}
        <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10 z-20 text-white p-4">
            <h2 className="text-2xl lg:text-3xl font-bold mb-1 lg:mb-2">竹師教育學院</h2>
            <p className="text-base lg:text-lg opacity-90">空間借用系統</p>
        </div>
      </div>

      {/* Right/Bottom Side - Form */}
      <div className="flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-background lg:py-12">
        <div className="mx-auto grid w-full max-w-[400px] gap-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative w-16 h-16 mb-2">
                 <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    fill
                    className="object-contain"
                 />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
                {authView === 'sign_in' ? '歡迎回來' : '建立帳號'}
            </h1>
            <p className="text-sm text-muted-foreground">
                {authView === 'sign_in' 
                    ? '請輸入您的帳號密碼以登入系統' 
                    : '填寫以下資訊以註冊新帳號'
                }
            </p>
          </div>

          <div className="grid gap-6">
          <Auth
            supabaseClient={supabase}
                view={authView}
            redirectTo={getRedirectUrl()}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'oklch(0.205 0 0)',
                    brandAccent: 'oklch(0.145 0 0)',
                                inputBorder: 'oklch(0.87 0 0)',
                                inputBackground: 'transparent',
                            },
                            radii: {
                                borderRadiusButton: '0.5rem',
                                inputBorderRadius: '0.5rem',
                  }
                }
              },
                    className: {
                        container: 'w-full',
                        button: 'w-full px-4 py-2',
                        input: 'w-full px-3 py-2',
                        label: 'mb-1.5 block text-sm font-medium text-foreground',
                    }
            }}
            providers={[]}
                showLinks={false}
            localization={{
              variables: {
                sign_up: {
                    email_label: '電子郵件',
                    password_label: '密碼',
                    button_label: '註冊',
                    loading_button_label: '註冊中 ...',
                    confirmation_text: '請查看您的信箱以進行驗證',
                },
                sign_in: {
                    email_label: '電子郵件',
                    password_label: '密碼',
                    button_label: '登入',
                    loading_button_label: '登入中 ...',
                },
              },
            }}
            theme="light"
          />
        
            <div className="flex flex-col gap-4 text-center text-sm">
            {/* Custom Forgot Password Link - Only show in sign_in view */}
            {authView === 'sign_in' && (
                    <div className="flex justify-end px-1">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                                <button className="text-sm font-medium text-muted-foreground hover:text-primary underline underline-offset-4">
                            忘記密碼？
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>重設密碼</DialogTitle>
                            <DialogDescription>
                                請輸入您的電子郵件，我們將發送重設密碼連結給您。
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
                                    <div className="space-y-2 text-left">
                                <Label htmlFor="reset-email">電子郵件</Label>
                                <Input 
                                    id="reset-email" 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isResetting || cooldown > 0}>
                                {isResetting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        發送中...
                                    </>
                                ) : cooldown > 0 ? (
                                    `請稍候 ${cooldown} 秒`
                                ) : (
                                    "發送重設信件"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
                    </div>
            )}

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            或
                        </span>
                    </div>
                </div>

            {/* Custom Sign In / Sign Up Toggle */}
            <button 
                onClick={() => setAuthView(authView === 'sign_in' ? 'sign_up' : 'sign_in')}
                className="text-sm hover:underline underline-offset-4"
            >
                {authView === 'sign_in' 
                        ? "還沒有帳號？註冊新帳號" 
                        : "已經有帳號？登入"
                }
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
