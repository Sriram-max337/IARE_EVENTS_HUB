import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import EventCard from '../../components/EventCard'
import Tabs from '../../components/Tabs'

export default function EventsFeed() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [depts, setDepts] = useState([])
  const [events, setEvents] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [myStatuses, setMyStatuses] = useState({})
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const [deptList, eventList, myRegs] = await Promise.all([
      api.getDepts(),
      api.getEvents({ status: 'live' }),
      api.getRegistrationsForUser(),
    ])
    setDepts(deptList)
    setEvents(eventList)

    const counts = {}
    const statuses = Object.fromEntries(myRegs.map((r) => [r.event_id, r.status]))
    await Promise.all(
      eventList.map(async (ev) => {
        const capacity = await api.getEventCapacity(ev.id)
        counts[ev.id] = capacity.confirmed_count
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

  const filtered = useMemo(() => {
    if (tab === 'registered')
      return events.filter((e) => ['confirmed', 'waitlisted'].includes(myStatuses[e.id]))
    return events
  }, [tab, events, myStatuses])

  const handleRegister = async (event) => {
    const result = await api.registerForEvent(event.id)
    setMyStatuses((prev) => ({ ...prev, [event.id]: result.status }))
    setRegCounts((prev) => ({
      ...prev,
      [event.id]: result.status === 'confirmed' ? (prev[event.id] || 0) + 1 : prev[event.id] || 0,
    }))
    showToast(
      result.status === 'waitlisted'
        ? `You're on the waitlist for ${event.title}.`
        : `Registered for ${event.title}.`,
      'success'
    )
  }

  const handleCancel = async (event) => {
    await api.cancelRegistration(event.id)
    setMyStatuses((prev) => ({ ...prev, [event.id]: 'none' }))
    const capacity = await api.getEventCapacity(event.id)
    setRegCounts((prev) => ({ ...prev, [event.id]: capacity.confirmed_count }))
    showToast(`Cancelled your spot for ${event.title}.`, 'info')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">Events</h1>
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
          Browse what's happening across departments and register for a seat.
        </p>
      </div>

      <Tabs
        tabs={[
          { value: 'all', label: 'All events', count: events.length },
          {
            value: 'registered',
            label: 'Registered',
            count: events.filter((e) => ['confirmed', 'waitlisted'].includes(myStatuses[e.id])).length,
          },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-card border border-border-light dark:border-border animate-pulse bg-surface-light dark:bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-light-dim dark:text-ink-dim text-sm">
          Nothing here yet — check back soon.
        </div>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              dept={deptById[event.club_id]}
              registeredCount={regCounts[event.id] || 0}
              role="student"
              userStatus={myStatuses[event.id] || 'none'}
              onRegister={handleRegister}
              onCancel={handleCancel}
              detailHref={`/events/${event.id}`}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
