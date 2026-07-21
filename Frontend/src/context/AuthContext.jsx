import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem('eventhub-user')
    try {
      return storedUser ? JSON.parse(storedUser) : null
    } catch {
      localStorage.removeItem('eventhub-user')
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('eventhub-auth-token'))
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!token) {
      setAuthReady(true)
      return
    }

    let cancelled = false
    getMe()
      .then((user) => {
        if (cancelled) return
        setCurrentUser(user)
        localStorage.setItem('eventhub-user', JSON.stringify(user))
      })
      .catch(() => {
        if (cancelled) return
        logout()
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const login = (user, accessToken) => {
    setCurrentUser(user)
    setToken(accessToken)
    localStorage.setItem('eventhub-user', JSON.stringify(user))
    localStorage.setItem('eventhub-auth-token', accessToken)
  }

  const logout = () => {
    setCurrentUser(null)
    setToken(null)
    localStorage.removeItem('eventhub-user')
    localStorage.removeItem('eventhub-auth-token')
  }

  return (
    <AuthContext.Provider value={{ currentUser, token, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
