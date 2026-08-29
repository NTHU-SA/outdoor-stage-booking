import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = [
  '/login',
  '/auth',
  '/reset-password',
  '/signup-success',
  '/approval-pending',
  '/dashboard/rules',
]

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath || pathname === '/') {
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // If user is not logged in and trying to access a protected route
  if (!user) {
    return NextResponse.redirect(new URL('/dashboard/rules', request.url))
  }

  return supabaseResponse
}
