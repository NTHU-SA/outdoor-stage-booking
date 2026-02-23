"use server"

import { createServiceClient } from "@/utils/supabase/service"

/**
 * 檢查指定 email 的帳號是否存在
 * 使用 service role key 來查詢，不需要登入權限
 */
export async function checkUserExists(email: string): Promise<boolean> {
  try {
    const supabaseAdmin = createServiceClient()
    
    // 使用 admin API 查詢使用者
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    
    if (error) {
      console.error("Error checking user existence:", error)
      return false
    }
    
    // 檢查是否有該 email 的使用者
    const userExists = data.users.some(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    )
    
    return userExists
  } catch (error) {
    console.error("Error in checkUserExists:", error)
    return false
  }
}

