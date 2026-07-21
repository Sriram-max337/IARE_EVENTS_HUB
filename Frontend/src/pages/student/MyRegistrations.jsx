import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import EventCard from '../../components/EventCard'

export default function MyRegistrations() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [depts, setDepts] = useState([])
  const [events, setEvents] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [myStatuses, setMyStatuses] = useState({})
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const [deptList, myRegs] = await Promise.all([api.getDepts(), api.getRegistrationsForUser(currentUser.id)])
    setDepts(deptList)

    const eventIds = myRegs.map((r) => r.event_id)
    const eventList = await Promise.all(eventIds.map((id) => api.getEventById(id)))
    setEvents(eventList.filter(Boolean))

    const counts = {}
    const statuses = {}
    myRegs.forEach((r) => {
      statuses[r.event_id] = r.status
    })
    await Promise.all(
      eventList.filter(Boolean).map(async (ev) => {
        const regs = await api.getRegistrationsForEvent(ev.id)
        counts[ev.id] = regs.filter((r) => r.status === 'registered').length
      })
    )
    setRegCounts(counts)
    setMyStatuses(statuses)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deptById = useMemo(() => Object.fromEntries(depts.map((d) => [d.id, d])), [depts])

  const handleCancel = async (event) => {
    await api.cancelRegistration(event.id, currentUser.id)
    showToast(`Cancelled your spot for ${event.title}.`, 'info')
    loadAll()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">My registrations</h1>
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
          Events you've registered for or are waitlisted on.
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-card border border-border-light dark:border-border animate-pulse bg-surface-light dark:bg-surface" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-ink-light-dim dark:text-ink-dim text-sm">
          You haven't registered for anything yet.
        </div>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              dept={deptById[event.dept_id]}
              registeredCount={regCounts[event.id] || 0}
              role="student"
              userStatus={myStatuses[event.id] || 'none'}
              onCancel={handleCancel}
              detailHref={`/events/${event.id}`}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
