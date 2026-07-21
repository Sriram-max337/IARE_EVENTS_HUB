import { createContext, useContext, useState } from 'react'
import { users } from '../lib/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem('eventhub-user')
    if (storedUser) return JSON.parse(storedUser)
    const stored = localStorage.getItem('eventhub-user-id')
    return (stored && users.find((u) => u.id === stored)) || null
  })
  const [token, setToken] = useState(() => localStorage.getItem('eventhub-auth-token'))

  const login = (userOrId, accessToken) => {
    if (typeof userOrId === 'object' && userOrId) {
      setCurrentUser(userOrId)
      setToken(accessToken)
      localStorage.setItem('eventhub-user', JSON.stringify(userOrId))
      if (accessToken) localStorage.setItem('eventhub-auth-token', accessToken)
      localStorage.removeItem('eventhub-user-id')
      return
    }

    const userId = userOrId
    const user = users.find((u) => u.id === userId)
    if (user) {
      setCurrentUser(user)
      setToken(null)
      localStorage.setItem('eventhub-user-id', userId)
      localStorage.setItem('eventhub-user', JSON.stringify(user))
      localStorage.removeItem('eventhub-auth-token')
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setToken(null)
    localStorage.removeItem('eventhub-user-id')
    localStorage.removeItem('eventhub-user')
    localStorage.removeItem('eventhub-auth-token')
  }

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
