import { getRoomById } from "@/utils/supabase/queries"
import { RoomTimetable } from "@/app/dashboard/book/room-timetable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Users, Layers, Calendar, ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { RoomDetailImage } from "./room-detail-image"

export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const room = await getRoomById(id)

  if (!room) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="pl-0">
        <Link href="/dashboard/spaces">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回空間一覽
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
            {/* Image & Basic Info */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <RoomDetailImage src={room.image_url} alt={room.name} />
            </div>
            
            <div>
                <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
                <div className="flex gap-2 mb-4">
                     {room.room_type && <Badge variant="secondary">{room.room_type}</Badge>}
                     <Badge variant="outline">{room.room_code}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">容納人數: {room.capacity} 人</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">位於 {room.floor}</span>
                    </div>
                </div>

                <Separator className="my-4" />
                
                <h3 className="font-semibold mb-2">空間設備</h3>
                <div className="text-sm text-muted-foreground">
                     {Array.isArray(room.equipment) && room.equipment.length > 0 ? (
                        <ul className="list-disc list-inside">
                            {room.equipment.map((item: unknown, i: number) => (
                                <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                            ))}
                        </ul>
                     ) : (
                         <p>無特別標註設備</p>
                     )}
                     {!Array.isArray(room.equipment) && room.equipment && (
                         <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{JSON.stringify(room.equipment, null, 2)}</pre>
                     )}
                </div>

                 <Separator className="my-4" />

                 <div className="flex gap-4">
                    <Button size="lg" asChild className="w-full sm:w-auto">
                        <Link href={`/dashboard/book?roomId=${room.id}`}>
                            前往預約
                        </Link>
                    </Button>
                 </div>
            </div>
        </div>

        {/* Timetable */}
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        本週預約狀況
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <RoomTimetable roomId={room.id} />
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  )
}
