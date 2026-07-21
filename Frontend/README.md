# EventHub — IARE College Event Management Platform

A React + Tailwind frontend for a three-role college event management platform, built for IARE
(Institute of Aeronautical Engineering) and branded with Samvidha at the login screen.

## Stack

- React 18 + Vite
- Tailwind CSS (dark mode default, class-based toggle)
- React Router v6
- Framer Motion (card hover, tab underline, button press, toasts, modals)
- Supabase JS client — scaffolded but not wired in; the app currently runs on an in-memory
  mock data layer shaped exactly like the Supabase tables it will replace

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. The login screen has a "Quick demo access" section — click any of
the three demo accounts to preview that role's dashboard (Student, Event Manager, Admin) without
needing real auth.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  lib/
    mockData.js        # depts, users, events, registrations — same shape as the Supabase tables
    api.js              # data access layer; USE_MOCK flag controls mock vs. real Supabase calls
    supabaseClient.js   # Supabase client scaffold, reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  context/
    AuthContext.jsx      # mock currentUser, set by the login screen's demo picker
    ThemeContext.jsx      # dark/light toggle, persisted to localStorage
    ToastContext.jsx      # register/cancel/waitlist confirmation toasts
  components/            # shared design-system pieces (EventCard, CapacityBar, NavShell, RoleGate, ...)
  pages/
    student/              # /events, /events/:id, /my-registrations
    manager/               # /manager, /manager/events/new|:id/edit|:id/stats
    admin/                  # /admin, /admin/managers, /admin/events/:id
```

## Swapping in real Supabase data

Every function in `src/lib/api.js` already mirrors the Supabase query it will become (e.g.
`getEvents` maps straight to `supabase.from('events').select('*')`). To go live:

1. Create `events`, `registrations`, `users`, and `depts` tables in Supabase matching the shapes
   in `src/lib/mockData.js`.
2. Copy `.env.example` to `.env` and fill in your project URL + anon key.
3. Flip `USE_MOCK` to `false` at the top of `src/lib/api.js`.

No page or component needs to change — they all call the `api.js` functions, not the mock data
directly.

## Auth

A real login (roll number + verification) is assumed to live outside this build. The login screen
here is a lightweight stand-in: it's branded with Samvidha and offers instant access to a demo
student, event manager, and admin account so every role tree can be reviewed.

## Design tokens

Defined in `tailwind.config.js`: near-black base (`#0D0F12`), elevated card surface (`#16191D`),
one electric-teal accent (`#16E0B3`) for primary actions, and six distinct department colors
(CSE, ECE, EEE, MECH, CIVIL, AERO) used as a left-border strip and badge fill on event cards.
