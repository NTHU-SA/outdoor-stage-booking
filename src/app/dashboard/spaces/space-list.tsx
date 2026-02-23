"use client"

import { useState, useMemo } from "react"
import { Room } from "@/utils/supabase/queries"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { Search, Users, Layers } from "lucide-react"

type SpaceListProps = {
  initialRooms: Room[]
}

export function SpaceList({ initialRooms }: SpaceListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFloor, setSelectedFloor] = useState<string>("all")
  const [selectedCapacity, setSelectedCapacity] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")

  // Derive unique floors

  // Derive unique floors
  const floors = useMemo(() => {
    const uniqueFloors = Array.from(new Set(initialRooms.map(r => r.floor).filter(Boolean)))
    // Sort floors naturally (B1, 1F, 2F, etc.) - simplified sort for now
    return uniqueFloors.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
  }, [initialRooms])

  // Derive unique room types
  const roomTypes = useMemo(() => {
    const uniqueTypes = Array.from(new Set(initialRooms.map(r => r.room_type).filter(Boolean)))
    return uniqueTypes.sort()
  }, [initialRooms])

  // Filter logic
  const filteredRooms = useMemo(() => {
    return initialRooms.filter(room => {
      // Search term
      const searchContent = `${room.name} ${room.room_code || ''} ${room.room_type || ''}`.toLowerCase()
      if (searchTerm && !searchContent.includes(searchTerm.toLowerCase())) {
        return false
      }

      // Floor
      if (selectedFloor !== "all" && room.floor !== selectedFloor) {
        return false
      }

      // Room Type
      if (selectedType !== "all" && room.room_type !== selectedType) {
        return false
      }

      // Capacity
      if (selectedCapacity !== "all") {
        const cap = room.capacity || 0
        if (selectedCapacity === "small" && cap <= 30) return true
        if (selectedCapacity === "medium" && cap > 30 && cap <= 50) return true
        if (selectedCapacity === "large" && cap > 50) return true
        
        // If we are here, it means it didn't match the selected capacity criteria
        return false
      }

      return true
    })
  }, [initialRooms, searchTerm, selectedFloor, selectedCapacity, selectedType])

  return (
    <div className="space-y-6">
      {/* Top Filters */}
      <div className="bg-background/95 p-4 rounded-lg border shadow-sm">
         <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="搜尋空間名稱、代號..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>

            <div className="flex flex-row gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <div className="min-w-[120px]">
                    <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                        <SelectTrigger>
                            <SelectValue placeholder="樓層" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部樓層</SelectItem>
                            {floors.map(f => (
                                <SelectItem key={f as string} value={f as string}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="min-w-[120px]">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                            <SelectValue placeholder="類型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部類型</SelectItem>
                            {roomTypes.map(t => (
                                <SelectItem key={t as string} value={t as string}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="min-w-[120px]">
                     <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
                        <SelectTrigger>
                            <SelectValue placeholder="容納人數" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">容納人數不限</SelectItem>
                            <SelectItem value="small">30人以下</SelectItem>
                            <SelectItem value="medium">31-50人</SelectItem>
                            <SelectItem value="large">50人以上</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
         </div>
      </div>

      {/* Room Grid */}
      <div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRooms.map(room => (
                <Link key={room.id} href={`/dashboard/spaces/${room.id}`} className="block group">
                <Card className="h-full overflow-hidden flex flex-col group-hover:shadow-md transition-shadow">
                    <div className="relative aspect-video bg-muted">
                        <RoomImage 
                            src={room.image_url} 
                            alt={room.name} 
                        />
                         {room.room_type && (
                            <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm">
                                    {room.room_type}
                                </Badge>
                            </div>
                        )}
                    </div>
                    <CardContent className="px-4 py-1 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            {/* Left: Name and Code */}
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold truncate group-hover:text-primary transition-colors text-base" title={room.name}>{room.name}</h3>
                                <p className="text-xs text-muted-foreground truncate">{room.room_code}</p>
                            </div>

                            {/* Right: Capacity and Floor */}
                            <div className="flex flex-col items-end gap-1 flex-none">
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>{room.capacity || 0} 人</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Layers className="h-3.5 w-3.5" />
                                    <span>{room.floor || '未標示'}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </Link>
            ))}
            
            {filteredRooms.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                    <p>沒有找到符合條件的空間</p>
                    <Button variant="link" onClick={() => {
                        setSearchTerm("")
                        setSelectedFloor("all")
                        setSelectedCapacity("all")
                        setSelectedType("all")
                    }}>清除篩選條件</Button>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}

// Helper component to handle image fallback
function RoomImage({ src, alt }: { src: string | null, alt: string }) {
    const [error, setError] = useState(false)
    const finalSrc = (src && !error) ? src : "/login_cover.jpg"
    
    return (
        <Image
            src={finalSrc}
            alt={alt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized={src?.includes('supabase.co')}
            onError={() => setError(true)}
        />
    )
}
