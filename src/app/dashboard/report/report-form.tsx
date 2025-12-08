"use client"

import { useState, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Loader2, Upload, X, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createMaintenanceRequest, uploadMaintenanceFile } from "@/app/actions/maintenance"
import Image from "next/image"

const reportFormSchema = z.object({
  applicant_name: z.string().min(1, { message: "請輸入姓名" }),
  affiliation: z.enum(["student", "teacher", "staff"], { 
    message: "請選擇身份別" 
  }),
  unit: z.string().min(1, { message: "請輸入所屬單位/系所" }),
  phone: z.string().min(1, { message: "請輸入聯絡電話" }),
  email: z.string().email({ message: "請輸入有效的 E-mail" }),
  location: z.string().min(1, { message: "請輸入發生地點" }),
  occurrence_time: z.date().optional(),
  description: z.string().min(10, { message: "問題描述至少需要 10 個字" }),
})

type ReportFormProps = {
  defaultValues?: {
    applicant_name: string
    email: string
    unit: string
  }
}

type UploadedFile = {
  url: string
  name: string
  type: string
}

export function ReportForm({ defaultValues }: ReportFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const form = useForm<z.infer<typeof reportFormSchema>>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      applicant_name: defaultValues?.applicant_name || "",
      email: defaultValues?.email || "",
      unit: defaultValues?.unit || "",
      phone: "",
      location: "",
      description: "",
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    
    try {
      for (const file of Array.from(files)) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`檔案 ${file.name} 超過 10MB 限制`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)

        const url = await uploadMaintenanceFile(formData)
        setUploadedFiles(prev => [...prev, {
          url,
          name: file.name,
          type: file.type,
        }])
      }
      toast.success("檔案上傳成功")
    } catch (error) {
      console.error(error)
      toast.error("檔案上傳失敗")
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(values: z.infer<typeof reportFormSchema>) {
    setIsSubmitting(true)
    
    try {
      await createMaintenanceRequest({
        ...values,
        occurrence_time: values.occurrence_time?.toISOString(),
        attachments: uploadedFiles.map(f => f.url),
      })
      
      toast.success("回報表單已送出，我們會盡快處理")
      form.reset()
      setUploadedFiles([])
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "提交失敗"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isImageFile = (type: string) => type.startsWith('image/')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Applicant Info Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="applicant_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>填寫人姓名 (Applicant Name) *</FormLabel>
                <FormControl>
                  <Input placeholder="請輸入姓名" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="affiliation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>身份別 (Affiliation) *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇身份" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="student">學生 (Student)</SelectItem>
                    <SelectItem value="teacher">教師 (Teacher)</SelectItem>
                    <SelectItem value="staff">行政人員 (Staff)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>所屬單位 / 系所 (Unit) *</FormLabel>
              <FormControl>
                <Input placeholder="例：教育與學習科技學系" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>聯絡分機/手機 (Phone Number) *</FormLabel>
                <FormControl>
                  <Input placeholder="例：0912345678 或分機 1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="example@nthu.edu.tw" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Issue Details Section */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium mb-4">問題詳情 (Issue Details)</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>發生地點 (Location/Room Number) *</FormLabel>
                  <FormControl>
                    <Input placeholder="例：教育學院 N201" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occurrence_time"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>發生時間</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: zhTW })
                          ) : (
                            <span>選擇日期（可選）</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    若有明確發生時間請填寫
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>問題描述說明 (Problem Description) *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="請詳細描述問題狀況、位置、影響程度等..."
                    className="min-h-[150px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  請盡量詳細描述問題，以利相關單位處理
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* File Upload Section */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium mb-4">附件上傳 (Attachments)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            可附加照片或檔案（支援 JPG, PNG, GIF, WebP, PDF，單檔最大 10MB）
          </p>
          
          <div className="space-y-4">
            {/* Upload Button */}
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">上傳中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">點擊或拖曳檔案至此處上傳</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group rounded-lg border overflow-hidden bg-muted/50">
                    {isImageFile(file.type) ? (
                      <div className="aspect-square relative">
                        <Image
                          src={file.url}
                          alt={file.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square flex flex-col items-center justify-center p-4">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mt-2 truncate w-full text-center">
                          {file.name}
                        </p>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isSubmitting || isUploading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            送出回報 (Submit)
          </Button>
        </div>
      </form>
    </Form>
  )
}

