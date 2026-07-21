const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('eventhub-auth-token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed')
  }

  return data
}

export async function loginWithSamvidha({ roll_no, password }) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ roll_no, password }),
  })
}

export async function getMe() {
  return request('/api/v1/auth/me')
}

export async function getDepts() {
  return request('/depts')
}

export async function getDeptById(id) {
  const all = await getDepts()
  return all.find((d) => d.id === id) || null
}

export async function getUsers() {
  return request('/admin/users')
}

export async function getManagers() {
  return request('/admin/managers')
}

export async function addManager({ user_id, dept_id }) {
  return request('/admin/managers', {
    method: 'POST',
    body: JSON.stringify({ user_id, dept_id }),
  })
}

export async function removeManager(id) {
  return request(`/admin/managers/${id}`, { method: 'DELETE' })
}

export async function getEvents({ deptId, status } = {}) {
  const params = new URLSearchParams()
  if (deptId) params.set('dept_id', deptId)
  if (status) params.set('status', status)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request(`/events${suffix}`)
}

export async function getAdminEvents() {
  return request('/admin/events')
}

export async function getEventById(id) {
  return request(`/events/${id}`)
}

export async function createEvent(payload) {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEvent(id, payload) {
  return request(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteEvent(id) {
  return request(`/events/${id}`, { method: 'DELETE' })
}

export async function getEventCapacity(eventId) {
  return request(`/events/${eventId}/capacity`)
}

export async function getRegistrationsForEvent(eventId) {
  return request(`/events/${eventId}/registrations`)
}

export async function getRegistrationsForUser() {
  return request('/registrations/me')
}

export async function getUserEventStatus(_userId, eventId) {
  const regs = await getRegistrationsForUser()
  const match = regs.find((r) => r.event_id === eventId)
  return match ? match.status : 'none'
}

export async function registerForEvent(eventId) {
  return request('/registrations', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId }),
  })
}

export async function cancelRegistration(eventId) {
  const regs = await getRegistrationsForUser()
  const match = regs.find((r) => r.event_id === eventId)
  if (!match) throw new Error('registration not found')
  return request(`/registrations/${match.id}`, { method: 'DELETE' })
}

export async function getEventStats(eventId) {
  return request(`/events/${eventId}/stats`)
}
