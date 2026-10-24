import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from 'lucide-react'

import { useAuth } from '../../hooks/useAuth'
import { useAvatar } from '../../hooks/useAvatar'
import ChatWidget from '../chat/ChatWidget'
import Spinner from '../ui/Spinner'
import ojtlogo from '../../assets/ojtlogo.png'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/placement', label: 'Placement', icon: Briefcase },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/activity-log', label: 'Activity Log', icon: NotebookPen },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/requirements', label: 'Requirements', icon: FileText },
  { to: '/reports', label: 'Progress / Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function UserMenu({ user, profile, onLogout }) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef(null)
  const { signedUrl } = useAvatar()
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email
  const initials = (name || '?')
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'AC'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-line bg-white/70 px-2 py-1 pr-2.5 text-sm shadow-card transition hover:border-brand"
      >
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-navy text-[12px] font-bold text-white">
          {signedUrl ? <img src={signedUrl} alt="Avatar" className="h-full w-full object-cover" /> : initials}
        </span>
        <div className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[160px] truncate text-[13px] font-semibold text-navy">
            {name}
          </span>
          <span className="max-w-[160px] truncate text-[11px] text-muted">
            {user?.email}
          </span>
        </div>
        <ChevronDown
          className={`hidden h-4 w-4 text-muted transition-transform sm:block ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-[16px] border border-line bg-white shadow-card">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-navy">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {user?.email}
            </p>
          </div>
          <nav className="py-1 text-sm text-ink">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 transition hover:bg-mint-soft ${
                  isActive ? 'font-semibold text-brand-dark' : ''
                }`
              }
              onClick={() => setOpen(false)}
            >
              Profile
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 transition hover:bg-mint-soft ${
                  isActive ? 'font-semibold text-brand-dark' : ''
                }`
              }
              onClick={() => setOpen(false)}
            >
              Settings
            </NavLink>
            <button
              type="button"
              disabled={signingOut}
              aria-busy={signingOut || undefined}
              onClick={() => {
                if (signingOut) return
                setOpen(false)
                setSigningOut(true)
                Promise.resolve(onLogout()).finally(() => setSigningOut(false))
              }}
              className="flex w-full items-center gap-2 px-4 py-2 transition hover:bg-mint-soft disabled:opacity-60"
            >
              {signingOut ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const titleMap = {
    '/dashboard': 'Overview',
    '/attendance': 'Attendance',
    '/activity-log': 'Activity Log',
    '/tasks': 'Tasks',
    '/requirements': 'Requirements',
    '/reports': 'Progress / Reports',
    '/settings': 'Settings',
    '/profile': 'Profile',
    '/placement': 'Placement',
  }

  const pageTitle = titleMap[location.pathname] || 'OJTFlow'

  return (
    <div className="flex min-h-svh bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col border-r border-line bg-[#eef5f1] transition-transform lg:static ${
          sidebarCollapsed ? 'lg:w-[88px]' : 'lg:w-[256px]'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 px-4 py-5 ${
            sidebarCollapsed ? 'lg:gap-1 lg:px-2' : ''
          }`}
        >
          <Link
            to="/dashboard"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src={ojtlogo}
              alt="OJTFlow logo"
              width={44}
              height={44}
              className={`shrink-0 object-contain ${
                sidebarCollapsed ? 'h-9 w-9' : 'h-11 w-11'
              }`}
            />
            {!sidebarCollapsed && (
              <span className="text-[22px] font-bold tracking-[-0.03em] text-navy">
                OJT<span className="text-brand">Flow</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:text-brand lg:flex"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:text-brand lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-1 flex-1 overflow-y-auto px-3">
          <ul className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition hover:bg-white/70 ${
                      isActive
                        ? 'bg-white text-brand-dark shadow-card'
                        : 'text-ink'
                    } ${sidebarCollapsed ? 'justify-center px-2' : ''}`
                  }
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      sidebarCollapsed ? '' : 'ml-0.5'
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate font-medium">{label}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <Link
            to="/settings"
            className={`group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm text-ink transition hover:bg-white/70 ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
            title={sidebarCollapsed ? 'Settings' : undefined}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-5 w-5" />
            {!sidebarCollapsed && <span className="font-medium">Settings</span>}
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex w-full flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between gap-3 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:text-brand lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden flex-col lg:flex">
              <span className="text-[12px] uppercase tracking-[0.12em] text-muted">
                Workspace
              </span>
              <h1 className="text-[16px] font-bold text-navy">{pageTitle}</h1>
            </div>
            <h1 className="text-[16px] font-bold text-navy lg:hidden">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-[12.5px] text-muted sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <UserMenu
              user={user}
              profile={profile}
              onLogout={() => signOut()}
            />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
    </div>
  )
}
