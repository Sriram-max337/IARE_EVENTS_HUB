import { createContext, useContext, useState } from 'react'
import { users } from '../lib/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('eventhub-user-id')
    return (stored && users.find((u) => u.id === stored)) || null
  })

  const login = (userId) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      setCurrentUser(user)
      localStorage.setItem('eventhub-user-id', userId)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem('eventhub-user-id')
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
