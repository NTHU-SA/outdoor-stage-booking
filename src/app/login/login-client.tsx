"use client"

import { createClient } from '@/utils/supabase/client'
import { useEffect, useRef, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { checkUserExists } from "@/app/actions/auth"

type Department = {
  id: number
  name: string
}

export default function LoginClient({ }: { }) {
  const supabase = createClient()
  const router = useRouter()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // Auth View State
  const [authView, setAuthView] = useState<'sign_in' | 'sign_up'>('sign_in')

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Sign In State
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showSignInPassword, setShowSignInPassword] = useState(false)

  // Custom Sign Up State
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [signUpFullName, setSignUpFullName] = useState("")
  const [signUpPhone, setSignUpPhone] = useState("")
  const [signUpUserType, setSignUpUserType] = useState<"teacher" | "staff" | "external" | "student" | "">("")
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Ref to prevent onAuthStateChange from redirecting during signup
  const isSigningUpRef = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && !isSigningUpRef.current) {
        const params = new URLSearchParams(window.location.search)
        const next = params.get('next') || '/dashboard'
        router.push(next)
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "發送失敗，請稍後再試"
        toast.error(message)
    } finally {
        setIsResetting(false)
    }
  }

  // 動態計算重定向 URL
  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') || '/dashboard'
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)

    // Parse next param from current URL if it exists
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') || '/dashboard'

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      })

      if (error) {
        // ... error handling ...
        const errorMessage = error.message.toLowerCase()
        // ... (keep existing error handling logic) ...
        if (errorMessage.includes("invalid login credentials") || 
            errorMessage.includes("invalid_credentials")) {
          // 嘗試檢查帳號是否存在
          const userExists = await checkUserExists(signInEmail)
          
          if (!userExists) {
            toast.error("此帳號不存在，請確認電子郵件地址是否正確")
          } else {
            toast.error("密碼錯誤，請重新輸入")
          }
        } else if (errorMessage.includes("email not confirmed") || 
                   errorMessage.includes("email_not_confirmed")) {
          toast.error("您的電子郵件尚未驗證，請檢查您的信箱並點擊驗證連結")
        } else if (errorMessage.includes("too many requests") || 
                   errorMessage.includes("rate limit")) {
          toast.error("登入嘗試次數過多，請稍後再試")
        } else if (errorMessage.includes("user not found")) {
          toast.error("此帳號不存在，請確認電子郵件地址是否正確")
        } else {
          // 其他錯誤，顯示原始錯誤訊息或預設訊息
          toast.error(error.message || "登入失敗，請稍後再試")
        }
        return
      }
      
      toast.success("登入成功")
      // Explicitly redirect using router to handle the next param properly
      // Although onAuthStateChange handles it, explicit redirect is safer for preventing race conditions
      // But we need to match the behavior of onAuthStateChange in useEffect
      // Let's rely on onAuthStateChange which we will update
    } catch (error: unknown) {
      toast.error("發生未預期的錯誤，請稍後再試")
      console.error(error)
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // 驗證必填欄位
      if (!signUpFullName.trim()) {
          toast.error("請輸入姓名")
          return
      }
      
      if (!signUpPhone.trim()) {
          toast.error("請輸入聯絡電話")
          return
      }

      if (signUpPassword !== confirmPassword) {
          toast.error("兩次輸入的密碼不一致")
          return
      }

      setIsSigningUp(true)
      isSigningUpRef.current = true

      try {
          // 檢查信箱域名：若非 nthu.edu.tw 或 *.nthu.edu.tw 信箱，自動將身份別設為校外人士
          let finalUserType = signUpUserType
          const emailDomain = signUpEmail.split('@')[1]?.toLowerCase()
          if (finalUserType !== 'external' && emailDomain !== 'nthu.edu.tw' && !emailDomain.endsWith('.nthu.edu.tw')) {
              finalUserType = 'external'
              toast.info('您的信箱非 nthu.edu.tw，身份別已自動設為校外人士')
          }

          const { data, error } = await supabase.auth.signUp({
              email: signUpEmail,
              password: signUpPassword,
              options: {
                  emailRedirectTo: getRedirectUrl(),
                  data: {
                      full_name: signUpFullName,
                      phone: signUpPhone,
                      user_type: finalUserType,
                  }
              }
          })

          if (error) {
            toast.error(error.message || "註冊失敗，請稍後再試")
            return
          }
          if (data?.user && data.user.identities && data.user.identities.length === 0) {
            toast.error("此 Email 已經註冊過，請直接登入")
            return
          }

          // 跳轉到註冊成功頁面
          router.push(`/signup-success?email=${encodeURIComponent(signUpEmail)}`)
          
      } catch (error: unknown) {
          toast.error("發生未預期的錯誤")
          console.error(error)
      } finally {
          setIsSigningUp(false)
          isSigningUpRef.current = false
      }
  }

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      {/* Left/Top Side - Image */}
      <div className="relative w-full h-[30vh] lg:h-full bg-muted">
        <Image
          src="/login_cover.jpg"
          alt="Login Visual"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/10" /> {/* Subtle overlay */}
        <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10 z-20 text-white p-4">
            <h2 className="text-2xl lg:text-3xl font-bold mb-1 lg:mb-2">國立清華大學學生會</h2>
            <p className="text-base lg:text-lg opacity-90">野台借用系統</p>
        </div>
      </div>

      {/* Right/Bottom Side - Form */}
      <div className="flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-background lg:py-12 relative">
        <Button 
            variant="ghost" 
            className="absolute top-4 right-4 lg:top-8 lg:right-8"
            onClick={() => router.push('/')}
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            回到首頁
        </Button>
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
            {authView === 'sign_in' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="signin-email">電子郵件</Label>
                        <Input 
                            id="signin-email"
                            type="email"
                            placeholder="您的信箱"
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signin-password">密碼</Label>
                        <div className="relative">
                            <Input 
                                id="signin-password"
                                type={showSignInPassword ? "text" : "password"}
                                placeholder="您的密碼"
                                value={signInPassword}
                                onChange={(e) => setSignInPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowSignInPassword(!showSignInPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSigningIn}>
                        {isSigningIn ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                登入中...
                            </>
                        ) : (
                            "登入"
                        )}
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="signup-email">電子郵件 <span className="text-red-500">*</span></Label>
                        <Input 
                            id="signup-email"
                            type="email"
                            placeholder="您的信箱"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            校內人士請使用 @gapp.nthu.edu.tw 或其他 @nthu.edu.tw 結尾之信箱註冊
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-full-name">姓名 <span className="text-red-500">*</span></Label>
                        <Input 
                            id="signup-full-name"
                            type="text"
                            placeholder="請輸入您的姓名"
                            value={signUpFullName}
                            onChange={(e) => setSignUpFullName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-phone">聯絡電話 <span className="text-red-500">*</span></Label>
                        <Input 
                            id="signup-phone"
                            type="tel"
                            placeholder="您的電話"
                            value={signUpPhone}
                            onChange={(e) => setSignUpPhone(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-user-type">身份別 <span className="text-red-500">*</span></Label>
                        <Select value={signUpUserType} onValueChange={(value: "teacher" | "staff" | "external" | "student") => setSignUpUserType(value)}>
                            <SelectTrigger id="signup-user-type">
                                <SelectValue placeholder="請選擇身份別" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="teacher">教師</SelectItem>
                                <SelectItem value="staff">職員</SelectItem>
                                <SelectItem value="external">校外人士</SelectItem>
                                <SelectItem value="student">學生</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="signup-password">密碼 <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input 
                                id="signup-password"
                                type={showSignUpPassword ? "text" : "password"}
                                placeholder="您的密碼"
                                value={signUpPassword}
                                onChange={(e) => setSignUpPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">確認密碼 <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input 
                                id="confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="請再次輸入密碼"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSigningUp}>
                        {isSigningUp ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                註冊中...
                            </>
                        ) : (
                            "註冊"
                        )}
                    </Button>
                </form>
            )}
        
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
                                    placeholder="您的信箱" 
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
