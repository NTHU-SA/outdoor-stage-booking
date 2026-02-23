import { createServiceClient } from "./service"

export async function getAllAuthUsers() {
  const supabaseAdmin = createServiceClient()
  let allUsers: any[] = []
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
