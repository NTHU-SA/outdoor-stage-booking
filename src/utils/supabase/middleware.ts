import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Define paths that are publicly accessible (no login required)
  const publicPaths = [
    '/login', 
    '/auth', 
    '/reset-password',
    '/signup-success',
    '/approval-pending',
    '/dashboard/spaces', // Allow viewing spaces
    '/dashboard/rules',   // Allow viewing rules
    '/dashboard/report', // Allow access to report form and records
    '/dashboard/report/records' // Allow viewing maintenance records
  ]
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // If user is not logged in and trying to access a protected route
  if (!user && !isPublicPath && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // If user lands on the old approval-pending page, redirect to dashboard
    if (request.nextUrl.pathname === '/approval-pending') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
