import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { loginWithSamvidha } from '../lib/api'
import Button from '../components/Button'
import { Field, Input } from '../components/FormControls'

const HOME_BY_ROLE = {
  student: '/events',
  event_manager: '/manager',
  main_admin: '/admin',
}

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [rollNo, setRollNo] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const handleSamvidhaLogin = async (e) => {
    e.preventDefault()
    setSigningIn(true)
    try {
      const result = await loginWithSamvidha({ roll_no: rollNo, password })
      login(result.user, result.access_token)
      showToast('Signed in with Samvidha.', 'success')
      navigate(HOME_BY_ROLE[result.user.role])
    } catch (error) {
      showToast(error.message || 'Unable to sign in.', 'error')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-light dark:bg-base flex flex-col items-center justify-center px-4 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-lg text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img src="/samvidha-logo.png" alt="Samvidha Student Management Portal" className="h-11 w-auto mb-1" />
          <p className="text-xs text-ink-light-dim dark:text-ink-dim tracking-wide mt-3">
            Sign in to continue to <span className="text-accent font-semibold">EventHub</span>
          </p>
        </div>

        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSamvidhaLogin}
          >
            <Field label="Roll number">
              <Input
                required
                placeholder="e.g. 20951A0501"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field label="Password">
              <Input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full mt-1" disabled={signingIn}>
              {signingIn ? 'Signing in...' : 'Continue'} <ArrowRight size={15} className="ml-1" />
            </Button>
          </form>

        </div>

        <div className="flex items-center justify-center gap-2 mt-8 opacity-80">
          <img src="/iare-logo.png" alt="Institute of Aeronautical Engineering" className="h-6 w-auto" />
        </div>
      </motion.div>
    </div>
  )
}
