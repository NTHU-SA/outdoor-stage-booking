import { createServiceClient } from "./service"
import { type User } from "@supabase/supabase-js"

export async function getAllAuthUsers() {
  const supabaseAdmin = createServiceClient()
  const allUsers: User[] = []
  let page = 1
  const perPage = 1000
  
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    
    allUsers = [...allUsers, ...data.users]
    
    if (data.users.length < perPage) {
      break
    }
    page++
  }
  
  return allUsers
}
