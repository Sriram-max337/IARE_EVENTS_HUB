import { NavLink, useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, CalendarDays, ListChecks, LayoutDashboard, PlusCircle, ShieldCheck, Users2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const NAV_BY_ROLE = {
  student: [
    { to: '/events', label: 'Events', icon: CalendarDays },
    { to: '/my-registrations', label: 'My registrations', icon: ListChecks },
  ],
  event_manager: [
    { to: '/manager', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/manager/events/new', label: 'New event', icon: PlusCircle },
  ],
  main_admin: [
    { to: '/admin', label: 'All events', icon: ShieldCheck },
    { to: '/admin/managers', label: 'Managers', icon: Users2 },
  ],
}

const ROLE_LABEL = {
  student: 'Student',
  event_manager: 'Event Manager',
  main_admin: 'Admin',
}

export default function NavShell({ children }) {
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const navItems = NAV_BY_ROLE[currentUser?.role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-base-light dark:bg-base">
      <header className="sticky top-0 z-40 border-b border-border-light dark:border-border bg-base-light/90 dark:bg-base/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/iare-logo.png" alt="IARE" className="h-8 w-auto shrink-0" />
            <div className="h-6 w-px bg-border-light dark:bg-border hidden sm:block" />
            <span className="font-bold tracking-tight2 text-ink-light dark:text-ink hidden sm:block">
              Event<span className="text-accent">Hub</span>
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/manager' || item.to === '/admin'}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-dim text-accent'
                      : 'text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover'
                  }`
                }
              >
                <item.icon size={15} />
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
              <span className="text-xs font-medium text-ink-light dark:text-ink">{currentUser?.name}</span>
              <span className="text-[11px] text-ink-light-dim dark:text-ink-dim">
                {ROLE_LABEL[currentUser?.role]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-ink-light-dim dark:text-ink-dim hover:text-state-red hover:bg-state-red/10 transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
    </div>
  )
}
