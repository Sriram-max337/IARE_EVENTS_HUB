# EventHub - IARE College Event Management Platform

A React + Tailwind frontend for a three-role college event management platform, built for IARE
(Institute of Aeronautical Engineering) and branded with Samvidha at the login screen.

## Stack

- React 18 + Vite
- Tailwind CSS
- React Router v6
- Framer Motion
- FastAPI backend API

## Getting Started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

```text
VITE_API_URL=http://localhost:8000
```

For production, point `VITE_API_URL` at the deployed FastAPI backend.

```bash
npm run build
npm run preview
```

## Project Structure

```text
src/
  lib/
    api.js               # token-aware FastAPI API client
  context/
    AuthContext.jsx      # real Samvidha login session user/token
    ThemeContext.jsx     # dark/light toggle, persisted to localStorage
    ToastContext.jsx     # register/cancel/waitlist confirmation toasts
  components/            # shared UI pieces
  pages/
    student/             # /events, /events/:id, /my-registrations
    manager/             # /manager, /manager/events/new|:id/edit|:id/stats
    admin/               # /admin, /admin/managers, /admin/events/:id
```

## Auth

Users sign in with Samvidha credentials through the backend:

```http
POST /api/v1/auth/login
```

The frontend stores the returned app JWT in `localStorage` and sends it as:

```http
Authorization: Bearer <access_token>
```

The stored user shape is the backend `UserOut`: `id`, `roll_no`, `name`, `dept`, `year`, `role`,
and `managed_club_id`.
