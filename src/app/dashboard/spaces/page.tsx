import { Suspense } from "react"
import { getRooms } from "@/utils/supabase/queries"
import { SpaceList } from "./space-list"
import { Skeleton } from "@/components/ui/skeleton"

function SpaceGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="aspect-16/8 w-full rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

async function SpaceListServer() {
  const rooms = await getRooms()
  return <SpaceList initialRooms={rooms} />
}

export default function SpacesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">空間一覽</h2>
      </div>

      <Suspense fallback={<SpaceGridSkeleton />}>
        <SpaceListServer />
      </Suspense>
    </div>
  )
}

