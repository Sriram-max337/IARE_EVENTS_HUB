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

## Deploy On Render

This repository includes a root-level `render.yaml` Blueprint for the backend service. In Render, create a new Blueprint from the GitHub repository and fill the prompted secret environment variables.

The service pins `PYTHON_VERSION=3.13.5` to avoid Python 3.14 dependency wheel issues during deploy.

Required values:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `APP_JWT_SECRET`
- `CORS_ORIGINS`

Use exact frontend origins in `CORS_ORIGINS`, separated by commas. Do not include trailing slashes:

```text
https://iare-events-hub.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

The service starts with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Samvidha Login

Students sign in through:

```http
POST /api/v1/auth/login
```

Request body:

```json
{
  "roll_no": "20951A0501",
  "password": "samvidha-password"
}
```

The backend verifies credentials against Samvidha, scrapes the profile page, upserts the local `users` row, and returns an app JWT. The Samvidha password is never stored.

Use the returned token on protected routes:

```http
Authorization: Bearer <access_token>
```

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
- `GET /clubs`
- `GET /health`
