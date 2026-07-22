import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, QrCode } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import Button from '../../components/Button'

export default function EventAttendance() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [event, setEvent] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const ev = await api.getEventById(id)
        if (
          currentUser.role === 'event_manager' &&
          Number(ev.club_id) !== Number(currentUser.managed_club_id)
        ) {
          showToast('You cannot view attendance for this event.', 'error')
          navigate('/manager', { replace: true })
          return
        }

        const attendance = await api.getEventAttendance(id)
        if (cancelled) return
        setEvent(ev)
        setRows(attendance)
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

  const checkedInCount = rows.filter((row) => row.attended).length

  const handleExport = async () => {
    try {
      await api.downloadEventAttendanceCsv(id)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (loading || !event) {
    return <div className="h-96 max-w-3xl mx-auto rounded-card bg-surface-light dark:bg-surface animate-pulse" />
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">{event.title}</h1>
          <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
            {checkedInCount} checked in - {rows.length} confirmed
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" icon={QrCode} onClick={() => navigate(`/manager/events/${event.id}/scan`)}>
            Scan
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border border-border-light dark:border-border rounded-card bg-surface-light dark:bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-light-hover dark:bg-surface-hover text-ink-light-dim dark:text-ink-dim">
            <tr>
              <th className="text-left font-medium px-3 py-2">Name</th>
              <th className="text-left font-medium px-3 py-2">Roll no</th>
              <th className="text-left font-medium px-3 py-2">Dept</th>
              <th className="text-left font-medium px-3 py-2">Attended</th>
              <th className="text-left font-medium px-3 py-2">Checked in at</th>
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
                    {row.attended ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-light-dim dark:text-ink-dim">
                  {row.checked_in_at ? new Date(row.checked_in_at).toLocaleString('en-IN') : '-'}
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
    </div>
  )
}
