import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, User, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import DeptBadge, { deptBorderClass } from '../../components/DeptBadge'
import CapacityBar from '../../components/CapacityBar'
import Button from '../../components/Button'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [event, setEvent] = useState(null)
  const [dept, setDept] = useState(null)
  const [manager, setManager] = useState(null)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [status, setStatus] = useState('none')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const ev = await api.getEventById(id)
    if (!ev) {
      setLoading(false)
      return
    }
    const [d, users, regs, myStatus] = await Promise.all([
      api.getDeptById(ev.dept_id),
      api.getUsers(),
      api.getRegistrationsForEvent(ev.id),
      api.getUserEventStatus(currentUser.id, ev.id),
    ])
    setEvent(ev)
    setDept(d)
    setManager(users.find((u) => u.id === ev.manager_id))
    setRegisteredCount(regs.filter((r) => r.status === 'registered').length)
    setStatus(myStatus)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRegister = async () => {
    const result = await api.registerForEvent(event.id, currentUser.id)
    if (result.status === 'rejected') {
      showToast('This event is full and not accepting a waitlist.', 'error')
      return
    }
    setStatus(result.status)
    if (result.status === 'registered') setRegisteredCount((c) => c + 1)
    showToast(
      result.status === 'waitlisted' ? "You're on the waitlist." : 'Registered successfully.',
      'success'
    )
  }

  const handleCancel = async () => {
    await api.cancelRegistration(event.id, currentUser.id)
    const regs = await api.getRegistrationsForEvent(event.id)
    setRegisteredCount(regs.filter((r) => r.status === 'registered').length)
    setStatus('none')
    showToast('Cancelled your spot for this event.', 'info')
  }

  if (loading) {
    return <div className="h-64 rounded-card bg-surface-light dark:bg-surface animate-pulse" />
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-light-dim dark:text-ink-dim mb-4">Event not found.</p>
        <Link to="/events" className="text-accent text-sm font-medium">
          Back to events
        </Link>
      </div>
    )
  }

  const isFull = registeredCount >= event.capacity

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div
        className={`rounded-card border border-border-light dark:border-border border-l-4 ${deptBorderClass(
          dept
        )} bg-surface-light dark:bg-surface p-6 flex flex-col gap-5`}
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DeptBadge dept={dept} />
          </div>
          <h1 className="text-xl font-bold tracking-tight2 text-ink-light dark:text-ink">{event.title}</h1>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-light-dim dark:text-ink-dim">
          <span className="inline-flex items-center gap-2">
            <Calendar size={15} /> {formatDate(event.date)} · {event.time}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={15} /> {event.venue}
          </span>
          {manager && (
            <span className="inline-flex items-center gap-2">
              <User size={15} /> {manager.name}
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-ink-light dark:text-ink">{event.description}</p>

        <div className="border-t border-border-light dark:border-border pt-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-ink-light-dim dark:text-ink-dim">
            <Users size={14} /> Capacity
          </div>
          <CapacityBar registered={registeredCount} capacity={event.capacity} />
        </div>

        <div className="flex items-center gap-3">
          {status === 'registered' && (
            <>
              <span className="text-sm font-semibold text-state-green">You're registered</span>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel registration
              </Button>
            </>
          )}
          {status === 'waitlisted' && (
            <>
              <span className="text-sm font-semibold text-state-amber">You're on the waitlist</span>
              <Button variant="secondary" onClick={handleCancel}>
                Leave waitlist
              </Button>
            </>
          )}
          {status === 'none' && (
            <Button
              variant={isFull && event.waitlist_enabled ? 'waitlist' : 'primary'}
              disabled={isFull && !event.waitlist_enabled}
              onClick={handleRegister}
            >
              {isFull && event.waitlist_enabled ? 'Join waitlist' : isFull ? 'Event full' : 'Register'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
