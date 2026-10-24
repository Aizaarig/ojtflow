import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/landing/Landing'
import AuthCallback from './pages/auth/AuthCallback'
import ForgotPassword from './pages/auth/ForgotPassword'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ResetPassword from './pages/auth/ResetPassword'
import AppShell from './components/layout/AppShell'
import Overview from './pages/app/Overview'
import Placement from './pages/app/Placement'
import Attendance from './pages/app/Attendance'
import ActivityLog from './pages/app/ActivityLog'
import Tasks from './pages/app/Tasks'
import Requirements from './pages/app/Requirements'
import Reports from './pages/app/Reports'
import Settings from './pages/app/Settings'
import Profile from './pages/app/Profile'
import ProtectedRoute from './routes/ProtectedRoute'
import PublicOnlyRoute from './routes/PublicOnlyRoute'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/placement" element={<Placement />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
