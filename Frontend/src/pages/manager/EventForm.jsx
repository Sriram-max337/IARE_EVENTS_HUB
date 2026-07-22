import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as api from '../../lib/api'
import { Field, Input, Textarea, Switch } from '../../components/FormControls'
import Button from '../../components/Button'

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  venue: '',
  capacity: 50,
  waitlist_enabled: true,
}

function todayInputValue() {
  const now = new Date()
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 10)
}

function changedPayload(initial, current) {
  const payload = {}
  const simpleKeys = ['title', 'description', 'venue', 'capacity', 'waitlist_enabled']
  simpleKeys.forEach((key) => {
    const value = key === 'capacity' ? Number(current[key]) : current[key]
    const initialValue = key === 'capacity' ? Number(initial[key]) : initial[key]
    if (value !== initialValue) payload[key] = value
  })

  if (current.date !== initial.date || current.time !== initial.time) {
    payload.date = current.date
    payload.time = current.time
  }

  return payload
}

export default function EventForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState(null)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const [ev, capacity] = await Promise.all([
          api.getEventById(id),
          api.getEventCapacity(id),
        ])

        if (
          currentUser.role === 'event_manager' &&
          Number(ev.club_id) !== Number(currentUser.managed_club_id)
        ) {
          showToast('You cannot edit this event.', 'error')
          navigate('/manager', { replace: true })
          return
        }

        const nextForm = {
          title: ev.title,
          description: ev.description || '',
          date: ev.date,
          time: ev.time,
          venue: ev.venue,
          capacity: ev.capacity,
          waitlist_enabled: ev.waitlist_enabled,
        }
        if (cancelled) return
        setForm(nextForm)
        setInitialForm(nextForm)
        setConfirmedCount(capacity.confirmed_count)
      } catch (err) {
        showToast(err.message, 'error')
        navigate(currentUser.role === 'main_admin' ? '/admin' : '/manager', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser.managed_club_id, currentUser.role, id, isEdit, navigate, showToast])

  const update = (key, value) => {
    setFormError('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const capacity = Number(form.capacity)
    if (capacity < 1) {
      setFormError('Capacity must be greater than zero.')
      return
    }
    if (isEdit && capacity < confirmedCount) {
      setFormError(`Capacity cannot be lower than ${confirmedCount} confirmed registrations.`)
      return
    }

    const dateWasChanged = !isEdit || form.date !== initialForm?.date || form.time !== initialForm?.time
    const selectedDateTime = new Date(`${form.date}T${form.time || '00:00'}`)
    if (dateWasChanged && (Number.isNaN(selectedDateTime.getTime()) || selectedDateTime <= new Date())) {
      setFormError('Event date and time cannot be in the past.')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        const payload = changedPayload(initialForm, form)
        if (Object.keys(payload).length > 0) {
          await api.updateEvent(id, payload)
        }
        showToast('Event updated.', 'success')
      } else {
        await api.createEvent({ ...form, capacity })
        showToast('Event created.', 'success')
      }
      navigate(currentUser.role === 'main_admin' ? '/admin' : '/manager')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-96 max-w-xl mx-auto rounded-card bg-surface-light dark:bg-surface animate-pulse" />
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">
          {isEdit ? 'Edit event' : 'Create event'}
        </h1>
        <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
          {isEdit ? 'Update the details below.' : "This will be published to your department's students."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-6"
      >
        <Field label="Title">
          <Input
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. Signal Processing Bootcamp"
          />
        </Field>

        <Field label="Description">
          <Textarea
            required
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="What should students expect?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input
              type="date"
              min={todayInputValue()}
              required
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </Field>
          <Field label="Time">
            <Input type="time" required value={form.time} onChange={(e) => update('time', e.target.value)} />
          </Field>
        </div>

        <Field label="Venue">
          <Input
            required
            value={form.venue}
            onChange={(e) => update('venue', e.target.value)}
            placeholder="e.g. ECE Seminar Hall"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4 items-end">
          <Field label="Capacity">
            <Input
              type="number"
              min={isEdit ? Math.max(1, confirmedCount) : 1}
              required
              value={form.capacity}
              onChange={(e) => update('capacity', e.target.value)}
            />
          </Field>
          <div className="pb-2.5">
            <Switch
              checked={form.waitlist_enabled}
              onChange={(v) => update('waitlist_enabled', v)}
              label="Enable waitlist"
            />
          </div>
        </div>

        {isEdit && (
          <p className="text-xs text-ink-light-dim dark:text-ink-dim">
            Club assignment is fixed after creation. Current confirmed registrations: {confirmedCount}.
          </p>
        )}

        {formError && (
          <div className="rounded-lg border border-state-red/30 bg-state-red/10 px-3 py-2 text-sm text-state-red">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border-light dark:border-border mt-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </Button>
        </div>
      </form>
    </div>
  )
}
