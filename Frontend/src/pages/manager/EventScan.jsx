import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, QrCode } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import Button from '../../components/Button'

function AttendanceScanner({ eventId }) {
  const { showToast } = useToast()
  const scannerRef = useRef(null)
  const inFlightRef = useRef(false)
  const recentScansRef = useRef(new Map())
  const elementId = `attendance-scanner-${eventId}`

  const handleScan = useCallback(
    async (decodedText) => {
      const qrToken = decodedText.trim()
      if (!qrToken || inFlightRef.current) return

      const lastScanAt = recentScansRef.current.get(qrToken) || 0
      if (Date.now() - lastScanAt < 2500) return
      recentScansRef.current.set(qrToken, Date.now())

      inFlightRef.current = true
      try {
        const result = await api.checkInRegistration(eventId, qrToken)
        showToast(`Checked in ${result.student_name}`, 'success')
      } catch (err) {
        showToast(err.message, 'error')
      } finally {
        inFlightRef.current = false
      }
    },
    [eventId, showToast]
  )

  useEffect(() => {
    let mounted = true
    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner

    async function startScanner() {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          handleScan
        )
      } catch (err) {
        if (mounted) showToast(err.message || 'Could not open camera', 'error')
      }
    }

    startScanner()

    return () => {
      mounted = false
      const activeScanner = scannerRef.current
      if (!activeScanner) return
      activeScanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            activeScanner.clear()
          } catch {
            // Scanner may already be cleared when the route unmounts.
          }
        })
    }
  }, [elementId, handleScan, showToast])

  return (
    <div className="flex flex-col gap-3">
      <div id={elementId} className="overflow-hidden rounded-card border border-border-light dark:border-border bg-black min-h-[320px]" />
      <p className="text-sm text-ink-light-dim dark:text-ink-dim">
        Scanner stays active for continuous check-ins. Keep each student's QR centered in the camera view.
      </p>
    </div>
  )
}

export default function EventScan() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const ev = await api.getEventById(id)
        if (
          currentUser.role === 'event_manager' &&
          Number(ev.club_id) !== Number(currentUser.managed_club_id)
        ) {
          showToast('You cannot scan attendance for this event.', 'error')
          navigate('/manager', { replace: true })
          return
        }
        if (!cancelled) setEvent(ev)
      } catch (err) {
        showToast(err.message, 'error')
        navigate(currentUser.role === 'main_admin' ? '/admin' : '/manager', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser.managed_club_id, currentUser.role, id, navigate, showToast])

  if (loading || !event) {
    return <div className="h-96 max-w-2xl mx-auto rounded-card bg-surface-light dark:bg-surface animate-pulse" />
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-sm mb-2">
          <QrCode size={16} /> Scan attendance
        </div>
        <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">{event.title}</h1>
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">{event.venue}</p>
      </div>

      <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-4">
        <AttendanceScanner eventId={event.id} />
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => navigate(`/manager/events/${event.id}/attendance`)}>
          Attendance list
        </Button>
      </div>
    </div>
  )
}
