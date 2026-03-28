"use client"

import { useState } from "react"
import Image from "next/image"

export function RoomDetailImage({ src, alt }: { src: string | null, alt: string }) {
    const [error, setError] = useState(false)
    const finalSrc = (src && !error) ? src : "/login_cover.jpg"

    return (
        <Image
            src={finalSrc}
            alt={alt}
            fill
            className="object-contain"
            priority
            unoptimized={src?.includes('supabase.co')}
            onError={() => setError(true)}
        />
    )
}

