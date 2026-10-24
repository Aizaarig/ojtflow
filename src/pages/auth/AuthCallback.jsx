import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FullPageLoader from '../../components/ui/FullPageLoader'
import { useAuth } from '../../hooks/useAuth'

export default function AuthCallback() {
  const { session, loading, recovery } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (recovery) {
      navigate('/reset-password', { replace: true })
      return
    }

    if (session) {
      navigate('/dashboard', { replace: true })
      return
    }

    const timer = setTimeout(
      () => navigate('/login', { replace: true }),
      1500
    )
    return () => clearTimeout(timer)
  }, [loading, session, recovery, navigate])

  return <FullPageLoader label="Confirming your link…" />
}
