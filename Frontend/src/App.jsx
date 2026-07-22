import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import RoleGate from './components/RoleGate'
import NavShell from './components/NavShell'

import LoginPage from './pages/LoginPage'
import EventsFeed from './pages/student/EventsFeed'
import EventDetail from './pages/student/EventDetail'
import MyRegistrations from './pages/student/MyRegistrations'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import EventForm from './pages/manager/EventForm'
import EventStats from './pages/manager/EventStats'
import EventScan from './pages/manager/EventScan'
import EventAttendance from './pages/manager/EventAttendance'
import AdminEvents from './pages/admin/AdminEvents'
import AdminManagers from './pages/admin/AdminManagers'
import AdminEventOverride from './pages/admin/AdminEventOverride'

const HOME_BY_ROLE = {
  student: '/events',
  event_manager: '/manager',
  main_admin: '/admin',
}

function Shell({ children }) {
  return <NavShell>{children}</NavShell>
}

export default function App() {
  const { currentUser, authReady } = useAuth()

  if (!authReady) {
    return <div className="min-h-screen bg-base-light dark:bg-base" />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to={HOME_BY_ROLE[currentUser.role]} replace /> : <LoginPage />}
      />

      {/* Student */}
      <Route
        path="/events"
        element={
          <RoleGate allow={['student']}>
            <Shell>
              <EventsFeed />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/events/:id"
        element={
          <RoleGate allow={['student']}>
            <Shell>
              <EventDetail />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/my-registrations"
        element={
          <RoleGate allow={['student']}>
            <Shell>
              <MyRegistrations />
            </Shell>
          </RoleGate>
        }
      />

      {/* Event Manager */}
      <Route
        path="/manager"
        element={
          <RoleGate allow={['event_manager']}>
            <Shell>
              <ManagerDashboard />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/manager/events/new"
        element={
          <RoleGate allow={['event_manager']}>
            <Shell>
              <EventForm />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/manager/events/:id/edit"
        element={
          <RoleGate allow={['event_manager', 'main_admin']}>
            <Shell>
              <EventForm />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/manager/events/:id/stats"
        element={
          <RoleGate allow={['event_manager', 'main_admin']}>
            <Shell>
              <EventStats />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/manager/events/:id/scan"
        element={
          <RoleGate allow={['event_manager', 'main_admin']}>
            <Shell>
              <EventScan />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/manager/events/:id/attendance"
        element={
          <RoleGate allow={['event_manager', 'main_admin']}>
            <Shell>
              <EventAttendance />
            </Shell>
          </RoleGate>
        }
      />

      {/* App Admin */}
      <Route
        path="/admin"
        element={
          <RoleGate allow={['main_admin']}>
            <Shell>
              <AdminEvents />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/admin/managers"
        element={
          <RoleGate allow={['main_admin']}>
            <Shell>
              <AdminManagers />
            </Shell>
          </RoleGate>
        }
      />
      <Route
        path="/admin/events/:id"
        element={
          <RoleGate allow={['main_admin']}>
            <Shell>
              <AdminEventOverride />
            </Shell>
          </RoleGate>
        }
      />

      <Route
        path="*"
        element={<Navigate to={currentUser ? HOME_BY_ROLE[currentUser.role] : '/login'} replace />}
      />
    </Routes>
  )
}
