import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, Percent, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import StatBarChart from '../../components/StatBarChart'
import DeptBadge from '../../components/DeptBadge'

const DEPT_BAR_CLASS = {
  cse: 'bg-dept-cse',
  ece: 'bg-dept-ece',
  eee: 'bg-dept-eee',
  mech: 'bg-dept-mech',
  civil: 'bg-dept-civil',
  aero: 'bg-dept-aero',
}

export default function EventStats() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [event, setEvent] = useState(null)
  const [dept, setDept] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [ev, allDepts] = await Promise.all([api.getEventById(id), api.getDepts()])
        if (
          currentUser.role === 'event_manager' &&
          Number(ev.club_id) !== Number(currentUser.managed_club_id)
        ) {
          showToast('You cannot view stats for this event.', 'error')
          navigate('/manager', { replace: true })
          return
        }

        const statData = await api.getEventStats(id)
        if (cancelled) return
        setEvent(ev)
        setDept(allDepts.find((d) => d.id === ev.club_id))
        setStats(statData)
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

  if (loading || !event || !stats) {
    return <div className="h-72 max-w-2xl mx-auto rounded-card bg-surface-light dark:bg-surface animate-pulse" />
  }

  const deptBreakdown = stats.dept_breakdown || stats.by_dept || []
  const yearBreakdown = stats.year_breakdown || stats.by_year || []

  const deptData = deptBreakdown.map((d) => ({
    label: d.dept || 'Unknown',
    value: d.count,
    colorClass: 'bg-accent',
  }))

  const yearData = yearBreakdown
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ label: `Year ${y.year}`, value: y.count }))

  const attendancePercent = Math.round((stats.attendance_rate || 0) * 100)

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <DeptBadge dept={dept} size="sm" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">{event.title}</h1>
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">Registration and attendance breakdown</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
          <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-xs mb-1">
            <Users size={13} /> Confirmed
          </div>
          <p className="text-3xl font-bold text-ink-light dark:text-ink tracking-tight2">
            {stats.total_confirmed}
            <span className="text-base font-medium text-ink-light-dim dark:text-ink-dim"> / {event.capacity}</span>
          </p>
        </div>
        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
          <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-xs mb-1">
            <Clock3 size={13} /> Waitlisted
          </div>
          <p className="text-3xl font-bold text-ink-light dark:text-ink tracking-tight2">{stats.total_waitlisted}</p>
        </div>
        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
          <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-xs mb-1">
            <CheckCircle2 size={13} /> Attended
          </div>
          <p className="text-3xl font-bold text-ink-light dark:text-ink tracking-tight2">{stats.total_attended}</p>
        </div>
        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
          <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-xs mb-1">
            <Percent size={13} /> Attendance
          </div>
          <p className="text-3xl font-bold text-ink-light dark:text-ink tracking-tight2">{attendancePercent}%</p>
        </div>
      </div>

      <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink-light dark:text-ink mb-4">Department-wise split</h2>
        <StatBarChart data={deptData} />
      </div>

      <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink-light dark:text-ink mb-4">Year-wise split</h2>
        <StatBarChart data={yearData} />
      </div>
    </div>
  )
}
