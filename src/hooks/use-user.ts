import { createClient } from '@/utils/supabase/client'
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled) {
          setUser(user)
          setLoading(false)
        }
      } catch (error) {
        console.error('useUser: failed to get user', error)
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!cancelled) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, loading }
}

