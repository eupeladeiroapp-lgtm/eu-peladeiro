import { useAuth } from './useAuth'

export function useProfile() {
  const { profile, profileLoading, refetchProfile } = useAuth()
  return { profile, loading: profileLoading, refetch: refetchProfile }
}
