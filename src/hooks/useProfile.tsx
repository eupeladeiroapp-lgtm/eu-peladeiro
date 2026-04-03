import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import { useAuth } from './useAuth'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  refetch: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Erro ao buscar perfil:', error)
        }
        setProfile(null)
      } else {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, refetch: fetchProfile }
}
