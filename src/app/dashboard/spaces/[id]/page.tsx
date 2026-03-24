import { Suspense } from "react"
import { getRoomById } from "@/utils/supabase/queries"
import { notFound } from "next/navigation"
import { SpaceBookingClient } from "./space-booking-client"
import { createClient } from "@/utils/supabase/server"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

function SpaceDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <div className="space-y-6">
          <Button variant="ghost" asChild className="pl-0 disabled cursor-not-allowed text-muted-foreground pointer-events-none">
            <Link href="/dashboard/spaces">
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回空間一覽
            </Link>
          </Button>

          <div className="flex justify-between items-start mb-4">
            <div>
              <Skeleton className="h-9 w-[250px] mb-2" />
            </div>
          </div>

          <Skeleton className="relative aspect-video rounded-lg overflow-hidden w-full" />

          <div className="pt-2">
            <Skeleton className="h-[250px] w-full rounded-xl" />
          </div>

          <div className="my-4 border-t" />

          <Skeleton className="h-5 w-[80px] mb-2" />
          <div className="space-y-2 mb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

async function SpaceDetailServer({ id }: { id: string }) {
  const room = await getRoomById(id)

  if (!room) {
    notFound()
  }

  const supabase = await createClient()

  let isAdmin = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') {
      isAdmin = true
    }
  }

  if (room.is_active === false && !isAdmin) {
    notFound()
  }

  return (
    <SpaceBookingClient
      room={room}
      isAdmin={isAdmin}
    />
  )
}

export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<SpaceDetailSkeleton />}>
      <SpaceDetailServer id={id} />
    </Suspense>
  )
}
