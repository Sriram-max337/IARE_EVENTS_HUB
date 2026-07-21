import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const HOME_BY_ROLE = {
  student: '/events',
  event_manager: '/manager',
  main_admin: '/admin',
}

export default function RoleGate({ allow, children }) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(currentUser.role)) {
    return <Navigate to={HOME_BY_ROLE[currentUser.role] || '/login'} replace />
  }

  return children
}
