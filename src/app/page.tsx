import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const code = params.code

  // 如果 URL 中有 code 參數（來自 Supabase 確認郵件），重定向到 callback 路由
  if (code && typeof code === 'string') {
    const type = params.type || 'signup'
    const next = params.next || '/dashboard/spaces'
    redirect(`/auth/callback?code=${code}&type=${type}&next=${next}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard/spaces')
  } else {
    // 進入頁面強制先看借用規則
    redirect('/dashboard/rules')
  }
}

