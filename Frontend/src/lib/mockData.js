// Mock data shaped exactly like the Supabase tables it will replace.
// Swapping this module out for real supabase queries (see api.js) is a drop-in.

export const depts = [
  { id: 'cse', name: 'Computer Science', code: 'CSE', color: 'dept-cse' },
  { id: 'ece', name: 'Electronics & Comm.', code: 'ECE', color: 'dept-ece' },
  { id: 'eee', name: 'Electrical & Electronics', code: 'EEE', color: 'dept-eee' },
  { id: 'mech', name: 'Mechanical', code: 'MECH', color: 'dept-mech' },
  { id: 'civil', name: 'Civil', code: 'CIVIL', color: 'dept-civil' },
  { id: 'aero', name: 'Aeronautical', code: 'AERO', color: 'dept-aero' },
]

export const users = [
  { id: 'u1', name: 'Sriram K', roll_no: '20951A0501', dept_id: 'cse', role: 'student' },
  { id: 'u2', name: 'Ananya Rao', roll_no: '20951A0512', dept_id: 'cse', role: 'student' },
  { id: 'u3', name: 'Kiran Reddy', roll_no: '20951A0433', dept_id: 'ece', role: 'student' },
  { id: 'u4', name: 'Priya Sharma', roll_no: '20951A0721', dept_id: 'aero', role: 'student' },
  { id: 'm1', name: 'Dr. Vikram Rao', roll_no: 'STAFF-CSE-04', dept_id: 'cse', role: 'event_manager' },
  { id: 'm2', name: 'Prof. Lakshmi Iyer', roll_no: 'STAFF-AERO-02', dept_id: 'aero', role: 'event_manager' },
  { id: 'm3', name: 'Dr. Suresh Nair', roll_no: 'STAFF-MECH-07', dept_id: 'mech', role: 'event_manager' },
  { id: 'a1', name: 'Admin Office', roll_no: 'ADMIN-001', dept_id: null, role: 'main_admin' },
]

export const events = [
  {
    id: 'e1',
    title: 'HackAero 2026 — 24hr Build Sprint',
    description:
      'A 24-hour hackathon focused on aerospace-adjacent software: flight telemetry dashboards, drone routing, and predictive maintenance tooling. Teams of up to 4. Mentors from the AERO and CSE departments will be on-site through the night.',
    dept_id: 'cse',
    manager_id: 'm1',
    date: '2026-08-14',
    time: '09:00',
    venue: 'Innovation Block, Lab 3',
    capacity: 120,
    waitlist_enabled: true,
    status: 'upcoming',
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'e2',
    title: 'Signal Processing Bootcamp',
    description:
      'Hands-on sessions covering DSP fundamentals, filter design, and a capstone project analyzing real antenna array data. Laptops with MATLAB or Python + scipy required.',
    dept_id: 'ece',
    manager_id: 'm1',
    date: '2026-08-02',
    time: '14:00',
    venue: 'ECE Seminar Hall',
    capacity: 60,
    waitlist_enabled: true,
    status: 'upcoming',
    created_at: '2026-07-03T09:30:00Z',
  },
  {
    id: 'e3',
    title: 'Wind Tunnel Open Lab Day',
    description:
      'Live demonstrations at the subsonic wind tunnel facility, including flow visualization and a Q&A with the senior AERO faculty on current UAV research.',
    dept_id: 'aero',
    manager_id: 'm2',
    date: '2026-07-28',
    time: '11:00',
    venue: 'Aero Research Hangar',
    capacity: 40,
    waitlist_enabled: false,
    status: 'upcoming',
    created_at: '2026-06-28T08:00:00Z',
  },
  {
    id: 'e4',
    title: 'CAD to CNC: Rapid Prototyping Workshop',
    description:
      'From SolidWorks model to a machined part in one afternoon. Covers toolpath basics, material selection, and safety protocols on the department CNC mill.',
    dept_id: 'mech',
    manager_id: 'm3',
    date: '2026-08-05',
    time: '10:00',
    venue: 'Mech Workshop 2',
    capacity: 30,
    waitlist_enabled: true,
    status: 'upcoming',
    created_at: '2026-07-05T12:00:00Z',
  },
  {
    id: 'e5',
    title: 'Structural Analysis Case Study Meet',
    description:
      'A walkthrough of a real retaining-wall failure case study, with breakout groups reworking the load calculations using IS code standards.',
    dept_id: 'civil',
    manager_id: 'm3',
    date: '2026-08-20',
    time: '15:30',
    venue: 'Civil Block Auditorium',
    capacity: 80,
    waitlist_enabled: false,
    status: 'upcoming',
    created_at: '2026-07-08T11:00:00Z',
  },
  {
    id: 'e6',
    title: 'Power Electronics Design Sprint',
    description:
      'Design and simulate a buck converter from spec sheet to schematic. Bring your own laptop with LTspice installed.',
    dept_id: 'eee',
    manager_id: 'm1',
    date: '2026-08-10',
    time: '13:00',
    venue: 'EEE Lab 1',
    capacity: 45,
    waitlist_enabled: true,
    status: 'upcoming',
    created_at: '2026-07-09T09:00:00Z',
  },
  {
    id: 'e7',
    title: 'AI in Avionics — Guest Lecture',
    description:
      'An industry guest lecture on machine learning applications in flight control systems and predictive diagnostics, followed by an open panel discussion.',
    dept_id: 'cse',
    manager_id: 'm1',
    date: '2026-07-25',
    time: '16:00',
    venue: 'Main Auditorium',
    capacity: 200,
    waitlist_enabled: false,
    status: 'upcoming',
    created_at: '2026-07-02T10:00:00Z',
  },
  {
    id: 'e8',
    title: 'Drone Racing Qualifiers',
    description:
      'Qualifying rounds for the annual inter-department drone racing championship. Spectators welcome; pilots must pre-register their build for safety inspection.',
    dept_id: 'aero',
    manager_id: 'm2',
    date: '2026-08-16',
    time: '10:30',
    venue: 'Sports Ground East',
    capacity: 50,
    waitlist_enabled: true,
    status: 'upcoming',
    created_at: '2026-07-11T10:00:00Z',
  },
]

export const registrations = [
  { id: 'r1', event_id: 'e1', user_id: 'u1', status: 'registered', registered_at: '2026-07-10T10:00:00Z' },
  { id: 'r2', event_id: 'e1', user_id: 'u2', status: 'registered', registered_at: '2026-07-10T11:00:00Z' },
  { id: 'r3', event_id: 'e2', user_id: 'u1', status: 'registered', registered_at: '2026-07-11T09:00:00Z' },
  { id: 'r4', event_id: 'e3', user_id: 'u4', status: 'registered', registered_at: '2026-07-05T09:00:00Z' },
  { id: 'r5', event_id: 'e7', user_id: 'u1', status: 'waitlisted', registered_at: '2026-07-15T09:00:00Z' },
  { id: 'r6', event_id: 'e8', user_id: 'u4', status: 'registered', registered_at: '2026-07-12T09:00:00Z' },
]

// Pre-seed several events near/at capacity so the capacity bar states are all visible in the feed.
const bulkSeed = [
  ['e4', 27], ['e6', 41], ['e2', 58], ['e5', 30], ['e8', 46],
]
let seedCounter = 100
bulkSeed.forEach(([eventId, count]) => {
  for (let i = 0; i < count; i++) {
    registrations.push({
      id: `rseed${seedCounter++}`,
      event_id: eventId,
      user_id: `seed-${seedCounter}`,
      status: 'registered',
      registered_at: '2026-07-01T00:00:00Z',
    })
  }
})
