import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import EventCard from '../../components/EventCard'
import Button from '../../components/Button'

export default function ManagerDashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [depts, setDepts] = useState([])
  const [events, setEvents] = useState([])
  const [regCounts, setRegCounts] = useState({})
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
              detailHref={`/manager/events/${event.id}/stats`}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
