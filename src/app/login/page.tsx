import { createClient } from "@/utils/supabase/server"
import LoginClient from "./login-client"

export default async function LoginPage() {
  const supabase = await createClient()

  return <LoginClient />
}
