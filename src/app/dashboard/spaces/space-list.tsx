"use client"

import { useState } from "react"
import { Room } from "@/utils/supabase/queries"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

type SpaceListProps = {
  initialRooms: Room[]
}

export function SpaceList({ initialRooms }: SpaceListProps) {
  return (
  <div className="space-y-4">
      {/* Room Grid */}
      <div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {initialRooms.map(room => (
                <Link key={room.id} href={`/dashboard/spaces/${room.id}`} className="block group">
            <div className="relative aspect-16/8 overflow-hidden rounded-xl bg-muted shadow-sm transition-shadow group-hover:shadow-md">
                        <RoomImage 
                            src={room.image_url} 
                            alt={room.name} 
                        />
              <div className="absolute left-3 bottom-3 max-w-[calc(100%-1.5rem)] rounded-md bg-black/55 px-3 py-2">
                <h3 className="truncate text-base font-semibold text-white" title={room.name}>{room.name}</h3>
                {room.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/90" title={room.description}>
                    {room.description}
                  </p>
                )}
              </div>
                    </div>
                </Link>
            ))}
            
              {initialRooms.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                    <p>沒有找到符合條件的空間</p>
                  <Button variant="link">目前沒有可顯示的空間</Button>
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
