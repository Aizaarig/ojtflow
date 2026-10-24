import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FullPageLoader from '../components/ui/FullPageLoader'

export default function PublicOnlyRoute() {
  const { session, loading } = useAuth()

  if (loading) return <FullPageLoader />

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
