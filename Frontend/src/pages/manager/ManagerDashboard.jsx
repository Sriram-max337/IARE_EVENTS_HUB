import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, PlusCircle, QrCode, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import EventCard from '../../components/EventCard'
import Button from '../../components/Button'

function AttendanceScanner({ event, onCheckedIn }) {
  const { showToast } = useToast()
  const scannerRef = useRef(null)
  const inFlightRef = useRef(false)
  const recentScansRef = useRef(new Map())
  const elementId = `attendance-scanner-${event.id}`

  useEffect(() => {
    let mounted = true
    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner

    async function startScanner() {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            const qrToken = decodedText.trim()
            if (!qrToken || inFlightRef.current) return

            const lastScanAt = recentScansRef.current.get(qrToken) || 0
            if (Date.now() - lastScanAt < 2500) return
            recentScansRef.current.set(qrToken, Date.now())

            inFlightRef.current = true
            try {
              const result = await api.checkInRegistration(event.id, qrToken)
              showToast(`Checked in ${result.student_name}`, 'success')
              onCheckedIn?.()
            } catch (err) {
              showToast(err.message, 'error')
            } finally {
              inFlightRef.current = false
            }
          }
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
        .finally(() => activeScanner.clear().catch(() => {}))
    }
  }, [elementId, event.id, onCheckedIn, showToast])

  return (
    <div className="flex flex-col gap-3">
      <div id={elementId} className="overflow-hidden rounded-card border border-border-light dark:border-border bg-black min-h-[280px]" />
      <p className="text-xs text-ink-light-dim dark:text-ink-dim">
        Scanner stays active for continuous check-ins. Keep the student's QR centered in the camera view.
      </p>
    </div>
  )
}

function AttendancePanel({ event, mode, onModeChange, onClose }) {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadAttendance() {
      setLoading(true)
      try {
        const data = await api.getEventAttendance(event.id)
        if (!cancelled) setRows(data)
      } catch (err) {
        if (!cancelled) showToast(err.message, 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAttendance()
    return () => {
      cancelled = true
    }
  }, [event.id, refreshKey, showToast])

  const checkedInCount = rows.filter((row) => row.attended).length
  const handleCheckedIn = useCallback(() => {
    setRefreshKey((key) => key + 1)
  }, [])

  const handleExport = async () => {
    try {
      await api.downloadEventAttendanceCsv(event.id)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-light-dim dark:text-ink-dim">Attendance</p>
          <h2 className="text-lg font-semibold tracking-tight2 text-ink-light dark:text-ink truncate">
            {event.title}
          </h2>
          <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
            {checkedInCount} checked in - {rows.length} confirmed
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
          aria-label="Close attendance panel"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'scan' ? 'primary' : 'secondary'}
          icon={QrCode}
          onClick={() => onModeChange('scan')}
        >
          Scan attendance
        </Button>
        <Button
          size="sm"
          variant={mode === 'list' ? 'primary' : 'secondary'}
          onClick={() => onModeChange('list')}
        >
          Attendance list
        </Button>
        <Button size="sm" variant="secondary" icon={Download} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {mode === 'scan' ? (
        <AttendanceScanner event={event} onCheckedIn={handleCheckedIn} />
      ) : loading ? (
        <div className="h-40 rounded-card bg-surface-light-hover dark:bg-surface-hover animate-pulse" />
      ) : (
        <div className="overflow-x-auto border border-border-light dark:border-border rounded-card">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-light-hover dark:bg-surface-hover text-ink-light-dim dark:text-ink-dim">
              <tr>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">Roll no</th>
                <th className="text-left font-medium px-3 py-2">Dept</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border">
              {rows.map((row) => (
                <tr key={row.roll_no}>
                  <td className="px-3 py-2 text-ink-light dark:text-ink">{row.student_name}</td>
                  <td className="px-3 py-2 text-ink-light-dim dark:text-ink-dim">{row.roll_no}</td>
                  <td className="px-3 py-2 text-ink-light-dim dark:text-ink-dim">{row.dept || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={row.attended ? 'text-state-green font-semibold' : 'text-ink-light-dim dark:text-ink-dim'}>
                      {row.attended ? 'Checked in' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="text-center py-10 text-sm text-ink-light-dim dark:text-ink-dim">
              No confirmed registrations yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManagerDashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [depts, setDepts] = useState([])
  const [events, setEvents] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [attendanceEvent, setAttendanceEvent] = useState(null)
  const [attendanceMode, setAttendanceMode] = useState('scan')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [deptList, eventList] = await Promise.all([
      api.getDepts(),
      api.getEvents({ deptId: currentUser.managed_club_id }),
    ])
    setDepts(deptList)
    setEvents(eventList)

    const counts = {}
    await Promise.all(
      eventList.map(async (ev) => {
        const capacity = await api.getEventCapacity(ev.id)
        counts[ev.id] = capacity.confirmed_count
      })
    )
    setRegCounts(counts)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deptById = useMemo(() => Object.fromEntries(depts.map((d) => [d.id, d])), [depts])
  const totalRegistered = Object.values(regCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">
            {deptById[currentUser.managed_club_id]?.name} dashboard
          </h1>
          <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
            {events.length} events · {totalRegistered} total registrations
          </p>
        </div>
        <Button icon={PlusCircle} onClick={() => navigate('/manager/events/new')}>
          New event
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-card border border-border-light dark:border-border animate-pulse bg-surface-light dark:bg-surface" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-ink-light-dim dark:text-ink-dim text-sm">
          No events yet — create your department's first one.
        </div>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              dept={deptById[event.club_id]}
              registeredCount={regCounts[event.id] || 0}
              role="manager"
              onEdit={(ev) => navigate(`/manager/events/${ev.id}/edit`)}
              onViewStats={(ev) => navigate(`/manager/events/${ev.id}/stats`)}
              onScanAttendance={(ev) => {
                setAttendanceEvent(ev)
                setAttendanceMode('scan')
              }}
              onViewAttendance={(ev) => {
                setAttendanceEvent(ev)
                setAttendanceMode('list')
              }}
              detailHref={`/manager/events/${event.id}/stats`}
            />
          ))}
        </motion.div>
      )}

      {attendanceEvent && (
        <AttendancePanel
          event={attendanceEvent}
          mode={attendanceMode}
          onModeChange={setAttendanceMode}
          onClose={() => setAttendanceEvent(null)}
        />
      )}
    </div>
  )
}
