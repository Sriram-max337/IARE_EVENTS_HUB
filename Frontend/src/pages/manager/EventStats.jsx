import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Clock3 } from 'lucide-react'
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
  const [event, setEvent] = useState(null)
  const [dept, setDept] = useState(null)
  const [stats, setStats] = useState(null)
  const [waitlistCount, setWaitlistCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [ev, statData, allDepts, regs] = await Promise.all([
        api.getEventById(id),
        api.getEventStats(id),
        api.getDepts(),
        api.getRegistrationsForEvent(id),
      ])
      setEvent(ev)
      setDept(allDepts.find((d) => d.id === ev.dept_id))
      setStats(statData)
      setWaitlistCount(regs.filter((r) => r.status === 'waitlisted').length)
      setLoading(false)
    })()
  }, [id])

  if (loading || !event) {
    return <div className="h-72 max-w-2xl mx-auto rounded-card bg-surface-light dark:bg-surface animate-pulse" />
  }

  const deptData = stats.byDept.map((d) => ({
    label: d.deptId.toUpperCase(),
    value: d.count,
    colorClass: DEPT_BAR_CLASS[d.deptId] || 'bg-accent',
  }))

  const yearData = stats.byYear
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((y) => ({ label: y.year, value: y.count }))

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
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
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">Registration breakdown</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
          <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-xs mb-1">
            <Users size={13} /> Total registered
          </div>
          <p className="text-3xl font-bold text-ink-light dark:text-ink tracking-tight2">
            {stats.total}
            <span className="text-base font-medium text-ink-light-dim dark:text-ink-dim"> / {event.capacity}</span>
          </p>
        </div>
        <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5">
          <div className="flex items-center gap-2 text-ink-light-dim dark:text-ink-dim text-xs mb-1">
            <Clock3 size={13} /> Waitlisted
          </div>
          <p className="text-3xl font-bold text-ink-light dark:text-ink tracking-tight2">{waitlistCount}</p>
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
