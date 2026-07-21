import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as api from '../../lib/api'
import EventCard from '../../components/EventCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Select } from '../../components/FormControls'
import { useToast } from '../../context/ToastContext'

export default function AdminEvents() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [depts, setDepts] = useState([])
  const [events, setEvents] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState(null)

  async function load() {
    setLoading(true)
    const [deptList, eventList] = await Promise.all([api.getDepts(), api.getAdminEvents()])
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
  }, [])

  const deptById = useMemo(() => Object.fromEntries(depts.map((d) => [d.id, d])), [depts])

  const filtered = events.filter(
    (e) =>
      (deptFilter === 'all' || String(e.club_id) === String(deptFilter)) &&
      (statusFilter === 'all' || e.status === statusFilter)
  )

  const handleDelete = async () => {
    await api.deleteEvent(pendingDelete.id)
    showToast(`"${pendingDelete.title}" was cancelled.`, 'info')
    setPendingDelete(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">All events</h1>
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
          Every event across every department. Override or cancel as needed.
        </p>
      </div>

      <div className="flex gap-3">
        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-44">
          <option value="all">All departments</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-card border border-border-light dark:border-border animate-pulse bg-surface-light dark:bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-light-dim dark:text-ink-dim text-sm">
          No events match these filters.
        </div>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              dept={deptById[event.club_id]}
              registeredCount={regCounts[event.id] || 0}
              role="admin"
              isPastOrCancelled={event.status !== 'live'}
              onEdit={(ev) => navigate(`/admin/events/${ev.id}`)}
              onDelete={(ev) => setPendingDelete(ev)}
              detailHref={`/admin/events/${event.id}`}
            />
          ))}
        </motion.div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Cancel this event?"
        description={`"${pendingDelete?.title}" will be marked as cancelled. Registrations are preserved for history.`}
        confirmLabel="Cancel event"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
