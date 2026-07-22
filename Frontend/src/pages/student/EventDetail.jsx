import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { ArrowLeft, Calendar, CheckCircle2, MapPin, QrCode, Users } from 'lucide-react'
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
  const { showToast } = useToast()

  const [event, setEvent] = useState(null)
  const [dept, setDept] = useState(null)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [status, setStatus] = useState('none')
  const [registration, setRegistration] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const ev = await api.getEventById(id)
    if (!ev) {
      setLoading(false)
      return
    }
    const [d, capacity, myRegistration] = await Promise.all([
      api.getDeptById(ev.club_id),
      api.getEventCapacity(ev.id),
      api.getUserRegistrationForEvent(ev.id),
    ])
    setEvent(ev)
    setDept(d)
    setRegisteredCount(capacity.confirmed_count)
    setRegistration(myRegistration)
    setStatus(myRegistration?.status || 'none')
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRegister = async () => {
    const result = await api.registerForEvent(event.id)
    setRegistration(result)
    setStatus(result.status)
    if (result.status === 'confirmed') setRegisteredCount((c) => c + 1)
    showToast(
      result.status === 'waitlisted' ? "You're on the waitlist." : 'Registered successfully.',
      'success'
    )
  }

  const handleCancel = async () => {
    await api.cancelRegistration(event.id)
    const capacity = await api.getEventCapacity(event.id)
    setRegisteredCount(capacity.confirmed_count)
    setRegistration(null)
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
        </div>

        <p className="text-sm leading-relaxed text-ink-light dark:text-ink">{event.description}</p>

        <div className="border-t border-border-light dark:border-border pt-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-ink-light-dim dark:text-ink-dim">
            <Users size={14} /> Capacity
          </div>
          <CapacityBar registered={registeredCount} capacity={event.capacity} />
        </div>

        <div className="flex items-center gap-3">
          {status === 'confirmed' && (
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

        {status === 'confirmed' && registration?.qr_token && (
          <div className="border-t border-border-light dark:border-border pt-5">
            <div className="flex items-start gap-4 flex-col sm:flex-row">
              <div className="rounded-lg border border-border-light dark:border-border bg-white p-3 shrink-0">
                <QRCodeCanvas value={registration.qr_token} size={156} includeMargin />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-light dark:text-ink">
                  {registration.attended ? (
                    <>
                      <CheckCircle2 size={16} className="text-state-green" />
                      You're checked in
                    </>
                  ) : (
                    <>
                      <QrCode size={16} className="text-accent" />
                      Attendance QR
                    </>
                  )}
                </div>
                <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-2">
                  Show this QR at the venue for attendance check-in.
                </p>
                {registration.attended && registration.checked_in_at && (
                  <p className="text-xs text-ink-light-dim dark:text-ink-dim mt-2">
                    Checked in at {new Date(registration.checked_in_at).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
