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
          cookiesToSet.forEach(({ name, value, options }) =>
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

  // Define paths that don't require approval
  const publicPaths = ['/login', '/auth', '/reset-password']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (user && !isPublicPath) {
    // Fetch profile to check approval status and role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_approved, role')
      .eq('id', user.id)
      .single()

    if (error) {
        console.error("Middleware profile fetch error:", error)
    }

    // Admins bypass approval check
    // Check explicitly if role is 'admin'
    const isAdmin = profile?.role === 'admin'
    const isApproved = isAdmin || (profile?.is_approved ?? false)
    
    const isPendingPage = request.nextUrl.pathname === '/approval-pending'

    // Debug logging (remove in production if needed)
    // console.log(`Middleware Check: User ${user.email}, Role: ${profile?.role}, Approved: ${profile?.is_approved}, isAdmin: ${isAdmin}`)

    // If not approved and trying to access protected pages, redirect to pending page
    if (!isApproved && !isPendingPage) {
      return NextResponse.redirect(new URL('/approval-pending', request.url))
    }

    // If approved but trying to access pending page, redirect to dashboard
    if (isApproved && isPendingPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
