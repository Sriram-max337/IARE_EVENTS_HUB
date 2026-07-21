import { depts, users, events, registrations } from './mockData'
import { supabase } from './supabaseClient'

// Flip to false once real Supabase tables (events, registrations, users, depts)
// are live — every function below already mirrors the query it will become.
const USE_MOCK = true

const delay = (data, ms = 220) => new Promise((resolve) => setTimeout(() => resolve(data), ms))

const clone = (x) => JSON.parse(JSON.stringify(x))

let _events = clone(events)
let _registrations = clone(registrations)
let _users = clone(users)

export async function getDepts() {
  if (!USE_MOCK) {
    const { data } = await supabase.from('depts').select('*')
    return data
  }
  return delay(clone(depts))
}

export async function getDeptById(id) {
  const all = await getDepts()
  return all.find((d) => d.id === id) || null
}

export async function getUsers() {
  if (!USE_MOCK) {
    const { data } = await supabase.from('users').select('*')
    return data
  }
  return delay(clone(_users))
}

export async function getManagers() {
  const all = await getUsers()
  return all.filter((u) => u.role === 'event_manager')
}

export async function addManager({ name, roll_no, dept_id }) {
  if (!USE_MOCK) {
    const { data } = await supabase
      .from('users')
      .insert({ name, roll_no, dept_id, role: 'event_manager' })
      .select()
      .single()
    return data
  }
  const manager = { id: `m${Date.now()}`, name, roll_no, dept_id, role: 'event_manager' }
  _users.push(manager)
  return delay(clone(manager))
}

export async function removeManager(id) {
  if (!USE_MOCK) {
    await supabase.from('users').delete().eq('id', id)
    return true
  }
  _users = _users.filter((u) => u.id !== id)
  return delay(true)
}

export async function getEvents({ deptId, status } = {}) {
  if (!USE_MOCK) {
    let query = supabase.from('events').select('*')
    if (deptId) query = query.eq('dept_id', deptId)
    if (status) query = query.eq('status', status)
    const { data } = await query
    return data
  }
  let list = clone(_events)
  if (deptId) list = list.filter((e) => e.dept_id === deptId)
  if (status) list = list.filter((e) => e.status === status)
  return delay(list)
}

export async function getEventById(id) {
  if (!USE_MOCK) {
    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    return data
  }
  return delay(clone(_events.find((e) => e.id === id)) || null)
}

export async function createEvent(payload) {
  if (!USE_MOCK) {
    const { data } = await supabase.from('events').insert(payload).select().single()
    return data
  }
  const newEvent = {
    id: `e${Date.now()}`,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    ...payload,
  }
  _events.push(newEvent)
  return delay(clone(newEvent))
}

export async function updateEvent(id, payload) {
  if (!USE_MOCK) {
    const { data } = await supabase.from('events').update(payload).eq('id', id).select().single()
    return data
  }
  _events = _events.map((e) => (e.id === id ? { ...e, ...payload } : e))
  return delay(clone(_events.find((e) => e.id === id)))
}

export async function deleteEvent(id) {
  if (!USE_MOCK) {
    await supabase.from('events').delete().eq('id', id)
    return true
  }
  _events = _events.filter((e) => e.id !== id)
  _registrations = _registrations.filter((r) => r.event_id !== id)
  return delay(true)
}

export async function getRegistrationsForEvent(eventId) {
  if (!USE_MOCK) {
    const { data } = await supabase.from('registrations').select('*').eq('event_id', eventId)
    return data
  }
  return delay(clone(_registrations.filter((r) => r.event_id === eventId)))
}

export async function getRegistrationsForUser(userId) {
  if (!USE_MOCK) {
    const { data } = await supabase.from('registrations').select('*').eq('user_id', userId)
    return data
  }
  return delay(clone(_registrations.filter((r) => r.user_id === userId && r.status !== 'cancelled')))
}

// Returns 'registered' | 'waitlisted' | 'none' for a given user/event pair.
export async function getUserEventStatus(userId, eventId) {
  const regs = await getRegistrationsForUser(userId)
  const match = regs.find((r) => r.event_id === eventId)
  return match ? match.status : 'none'
}

export async function registerForEvent(eventId, userId) {
  const event = await getEventById(eventId)
  const eventRegs = await getRegistrationsForEvent(eventId)
  const registeredCount = eventRegs.filter((r) => r.status === 'registered').length
  const isFull = registeredCount >= event.capacity
  const status = isFull && event.waitlist_enabled ? 'waitlisted' : isFull ? 'rejected' : 'registered'

  if (status === 'rejected') return delay({ status: 'rejected' })

  if (!USE_MOCK) {
    const { data } = await supabase
      .from('registrations')
      .insert({ event_id: eventId, user_id: userId, status })
      .select()
      .single()
    return data
  }
  const reg = {
    id: `r${Date.now()}`,
    event_id: eventId,
    user_id: userId,
    status,
    registered_at: new Date().toISOString(),
  }
  _registrations.push(reg)
  return delay(reg)
}

export async function cancelRegistration(eventId, userId) {
  if (!USE_MOCK) {
    await supabase.from('registrations').delete().eq('event_id', eventId).eq('user_id', userId)
    return promoteNextWaitlisted(eventId)
  }
  const target = _registrations.find(
    (r) => r.event_id === eventId && r.user_id === userId && r.status !== 'cancelled'
  )
  if (target) target.status = 'cancelled'
  await promoteNextWaitlisted(eventId)
  return delay(true)
}

// When a registered seat opens up, bump the earliest waitlisted person into it.
async function promoteNextWaitlisted(eventId) {
  const regs = await getRegistrationsForEvent(eventId)
  const registeredCount = regs.filter((r) => r.status === 'registered').length
  const event = await getEventById(eventId)
  if (registeredCount >= event.capacity) return null

  const waitlisted = regs
    .filter((r) => r.status === 'waitlisted')
    .sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at))
  const next = waitlisted[0]
  if (!next) return null

  if (!USE_MOCK) {
    await supabase.from('registrations').update({ status: 'registered' }).eq('id', next.id)
  } else {
    _registrations = _registrations.map((r) => (r.id === next.id ? { ...r, status: 'registered' } : r))
  }
  return next
}

export async function getEventStats(eventId) {
  const regs = (await getRegistrationsForEvent(eventId)).filter((r) => r.status === 'registered')
  const allUsers = await getUsers()
  const deptCounts = {}
  const yearCounts = {}

  regs.forEach((r) => {
    const user = allUsers.find((u) => u.id === r.user_id)
    const deptId = user?.dept_id || 'unknown'
    deptCounts[deptId] = (deptCounts[deptId] || 0) + 1

    // roll_no format: YY951A0XXX -> admission year prefix used as class year
    const yearPrefix = user?.roll_no?.slice(0, 2)
    const yearLabel = yearPrefix && !isNaN(yearPrefix) ? `20${yearPrefix}` : 'Other'
    yearCounts[yearLabel] = (yearCounts[yearLabel] || 0) + 1
  })

  return {
    total: regs.length,
    byDept: Object.entries(deptCounts).map(([deptId, count]) => ({ deptId, count })),
    byYear: Object.entries(yearCounts).map(([year, count]) => ({ year, count })),
  }
}
