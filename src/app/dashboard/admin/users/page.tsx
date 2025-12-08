"use client"

import { useEffect, useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  getUsers, 
  approveUser, 
  deleteUser, 
  toggleAdminRole, 
  type AdminUser 
} from "@/app/actions/admin-users"
import { Loader2, Trash2, Shield, ShieldOff, CheckCircle, Search } from "lucide-react"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"

const USER_TYPE_LABELS: Record<string, string> = {
  teacher: "教師",
  staff: "職員",
  assistant: "助教",
  student: "學生",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      toast.error("載入使用者失敗")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = users.filter((user) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    const email = user.email?.toLowerCase() ?? ""
    const fullName = user.full_name?.toLowerCase() ?? ""
    const phone = user.phone?.toLowerCase() ?? ""
    const department = user.department_name?.toLowerCase() ?? ""

    return (
      email.includes(keyword) ||
      fullName.includes(keyword) ||
      phone.includes(keyword) ||
      department.includes(keyword)
    )
  })

  const handleApprove = async (userId: string, email: string) => {
    setActionLoading(userId)
    try {
      await approveUser(userId, email)
      toast.success(`已核准使用者 ${email}`)
      await loadUsers()
    } catch {
      toast.error("核准失敗")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string) => {
    setActionLoading(userId)
    try {
      await deleteUser(userId)
      toast.success("使用者已刪除")
      await loadUsers()
    } catch {
      toast.error("刪除失敗")
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    setActionLoading(userId)
    try {
      await toggleAdminRole(userId, currentRole)
      toast.success("權限已更新")
      await loadUsers()
    } catch {
      toast.error("更新失敗")
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">人員管理</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            共 {users.length} 位使用者
            {searchTerm.trim() &&
              `，符合搜尋條件的有 ${filteredUsers.length} 位`}
          </div>
        </div>
        <div className="w-full max-w-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜尋姓名、Email、電話或所屬單位..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>所屬單位</TableHead>
              <TableHead>職稱</TableHead>
              <TableHead>聯絡電話</TableHead>
              <TableHead>註冊時間</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>權限</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || (
                    <span className="text-muted-foreground">未填寫</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.department_name || (
                    <span className="text-muted-foreground">未設定</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.user_type ? (
                    <Badge variant="outline">
                      {USER_TYPE_LABELS[user.user_type] ?? user.user_type}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">未設定</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.phone || (
                    <span className="text-muted-foreground">未填寫</span>
                  )}
                </TableCell>
                <TableCell>{format(new Date(user.created_at), 'yyyy/MM/dd HH:mm')}</TableCell>
                <TableCell>
                  {user.is_approved ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      已核准
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      待審核
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.role === 'admin' ? (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      管理員
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      一般用戶
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!user.is_approved && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(user.id, user.email)}
                        disabled={actionLoading === user.id}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            核准
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAdmin(user.id, user.role)}
                      disabled={actionLoading === user.id}
                      title={user.role === 'admin' ? "移除管理員權限" : "設為管理員"}
                    >
                      {user.role === 'admin' ? (
                        <ShieldOff className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          disabled={actionLoading === user.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>確定要刪除此使用者？</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作無法復原，將會刪除該使用者的所有資料（包含預約紀錄）。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            刪除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

