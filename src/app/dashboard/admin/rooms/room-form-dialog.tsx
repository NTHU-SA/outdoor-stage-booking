"use client"

import { useState, useRef, useEffect } from "react"
import { Room } from "@/utils/supabase/queries"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createRoom, updateRoom, uploadRoomImage } from "@/app/actions/admin-rooms"
import { RoomAvailabilityTable, UnavailablePeriod } from "./room-availability-table"
import { toast } from "sonner"
import { Loader2, Upload, X, HelpCircle } from "lucide-react"
import Image from "next/image"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RoomApproverEditor, ApproverEntry, UserOption } from "./room-approver-editor"
import { getRoomApprovers, setRoomApprovers, getUsersForApproverSelection } from "@/app/actions/admin-approvers"
import { Separator } from "@/components/ui/separator"

type RoomFormDialogProps = {
  mode: "create" | "edit"
  room?: Room
  children: React.ReactNode
}

export function RoomFormDialog({ mode, room, children }: RoomFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form State
  const [name, setName] = useState(room?.name || "")
  const [description, setDescription] = useState(room?.description || "")
  const [imageUrl, setImageUrl] = useState(room?.image_url || "")
  const [unavailablePeriods, setUnavailablePeriods] = useState<UnavailablePeriod[]>(
    (room?.unavailable_periods && Array.isArray(room.unavailable_periods)) 
      ? room.unavailable_periods 
      : []
  )

  // Approver State
  const [approvers, setApprovers] = useState<ApproverEntry[]>([])
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false)
  
  // Unsaved changes confirmation
  const [initialState, setInitialState] = useState<string>("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Meeting rooms don't need unavailable periods (no semester schedule dependency) - Logic removed as roomType is removed
  // We will assume unavailable periods are always applicable or handle as per requirement.
  // Ideally, if roomType is gone, we might want to default to showing unavailable periods.
  const isMeetingRoom = false 

  // Load approver data when dialog opens
  useEffect(() => {
    if (open) {
      const loadApproverData = async () => {
        setIsLoadingApprovers(true)
        try {
          const users = await getUsersForApproverSelection()
          setUserOptions(users)
          if (room) {
            const existingApprovers = await getRoomApprovers(room.id)
            setApprovers(existingApprovers.map(a => ({
              user_id: a.user_id,
              step_order: a.step_order,
              label: a.label || '',
            })))
          } else {
            setApprovers([])
          }
        } catch (error) {
          console.error('Error loading approver data:', error)
        } finally {
          setIsLoadingApprovers(false)
        }
      }
      loadApproverData()
    }
  }, [open, room])

  // Reset form when dialog opens or room changes
  useEffect(() => {
    if (open && room) {
      setName(room.name || "")
      setDescription(room.description || "")
      setImageUrl(room.image_url || "")
      setUnavailablePeriods(
        (room.unavailable_periods && Array.isArray(room.unavailable_periods))
          ? room.unavailable_periods
          : []
      )
    } else if (open && mode === "create") {
      // Reset to defaults for create mode
      setName("")
      setDescription("")
      setImageUrl("")
      setUnavailablePeriods([])
    }
  }, [open, room, mode])

  // Capture initial state for unsaved changes detection
  useEffect(() => {
    if (open && !isLoadingApprovers) {
      setInitialState(JSON.stringify({
        name,
        description,
        imageUrl,
        unavailablePeriods,
        approvers
      }))
    }
  }, [open, isLoadingApprovers]) // Only run when dialog opens or approvers finish loading

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      const currentState = JSON.stringify({
        name,
        description,
        imageUrl,
        unavailablePeriods,
        approvers
      })
      
      if (currentState !== initialState) {
        setShowConfirmDialog(true)
        return
      }
    }
    setOpen(newOpen)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
        const url = await uploadRoomImage(formData)
        setImageUrl(url)
        toast.success("圖片上傳成功")
    } catch (error) {
        console.error(error)
        toast.error("圖片上傳失敗")
    } finally {
        setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data = {
        name,
        description: description || null,
        unavailable_periods: unavailablePeriods,
        image_url: imageUrl || null, // Ensure empty string becomes null
      }

      if (mode === "create") {
        await createRoom(data)
        // Note: For create mode, approvers need to be set after the room is created
        // We'll handle this via a page reload for simplicity
        toast.success("已新增空間")
      } else if (room) {
        await updateRoom(room.id, data)
        // Save approvers
        const validApprovers = approvers.filter(a => a.user_id)
        await setRoomApprovers(room.id, validApprovers)
        toast.success("已更新空間資訊")
      }
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      setOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("儲存失敗")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      <DialogContent className={isMeetingRoom ? "sm:max-w-[500px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[1000px] max-h-[90vh] overflow-y-auto"}>
        <form onSubmit={handleSubmit}>
          <div className="absolute right-12 top-4 z-10 flex items-center gap-2">
            <Button type="submit" disabled={isLoading || isUploading} size="sm" className="h-8">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存變更
            </Button>
          </div>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "新增空間" : "編輯空間"}</DialogTitle>
            <DialogDescription>
              {isMeetingRoom 
                ? "請輸入空間詳細資訊。Meeting 類型空間不需設定課表時段限制。"
                : "請輸入空間詳細資訊。右側課表勾選的時段將不開放借用。"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className={isMeetingRoom ? "py-4" : "grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 py-4"}>
            <div className="space-y-4">
            {/* Image Upload Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 flex items-center justify-center group">
                    {imageUrl ? (
                        <>
                            <Image 
                                src={imageUrl} 
                                alt="Preview" 
                                fill 
                                className="object-cover" 
                                onError={() => setImageUrl("")} // Fallback on error
                            />
                            <div className="absolute top-2 right-2 z-10">
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setImageUrl("")
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Button type="button" variant="secondary" size="sm" className="pointer-events-auto" onClick={() => fileInputRef.current?.click()}>
                                    更換圖片
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-4">
                            <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                上傳封面圖片
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">支援 JPG, PNG 格式</p>
                        </div>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    )}
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                <Label htmlFor="name">名稱</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">空間描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="請輸入空間描述（例如：可容納人數、用途、注意事項）"
                rows={4}
              />
            </div>

            {mode === "edit" && (
              <>
                <Separator />
                <RoomApproverEditor
                  approvers={approvers}
                  onChange={setApprovers}
                  userOptions={userOptions}
                  isLoading={isLoadingApprovers}
                />
              </>
            )}
            </div>

            {/* Unavailable periods section - hidden for Meeting rooms */}
            {!isMeetingRoom && (
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">不開放借用時段</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    勾選的時段將不開放給使用者借用
                  </p>
                </div>
                <RoomAvailabilityTable value={unavailablePeriods} onChange={setUnavailablePeriods} />
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要離開嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            您有尚未儲存的變更，離開後這些變更將會遺失。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowConfirmDialog(false)
              setOpen(false)
            }}
          >
            確定離開
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
