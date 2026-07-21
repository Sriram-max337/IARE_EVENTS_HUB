# IARE Event Hub Backend

FastAPI backend for the college event management MVP. It uses the existing Supabase Postgres schema and does not create or migrate tables.

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Fill the placeholder values in `.env`.

For Supabase database access, either paste `DATABASE_URL` with the `postgresql+asyncpg://` driver prefix, or leave `DATABASE_URL` empty and fill `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, and `SUPABASE_DB_PASSWORD`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are included as placeholders for Supabase API/admin use, but the current backend talks to your existing schema through Postgres. `SUPABASE_JWT_SECRET` is used to verify Supabase-issued JWTs.

## Run

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## Auth Contract

Identity verification is assumed to happen before this backend. `get_current_user()` accepts:

- `Authorization: Bearer <jwt>` with `sub`, `id`, `user_id`, `roll_no`, or `email` claims.
- `X-User-Id` or `X-Roll-No` headers for trusted gateway/dev setups.

If `SUPABASE_JWT_SECRET` is set, JWTs are verified with HS256. If it is not set, JWT claims are decoded without signature verification, which is only appropriate behind a trusted auth layer.

## Main Routes

- `POST /events`
- `GET /events`
- `GET /events/{event_id}`
- `PATCH /events/{event_id}`
- `DELETE /events/{event_id}`
- `GET /events/{event_id}/stats`
- `POST /registrations`
- `DELETE /registrations/{registration_id}`
- `GET /registrations/me`
- `GET /admin/managers`
- `POST /admin/managers`
- `DELETE /admin/managers/{manager_id}`
- `GET /admin/events`

Utility routes included for frontend integration:

- `GET /auth/me`
- `GET /depts`
- `GET /health`
