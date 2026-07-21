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

export default function EventForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      const ev = await api.getEventById(id)
      if (ev) {
        setForm({
          title: ev.title,
          description: ev.description,
          date: ev.date,
          time: ev.time,
          venue: ev.venue,
          capacity: ev.capacity,
          waitlist_enabled: ev.waitlist_enabled,
        })
      }
      setLoading(false)
    })()
  }, [id, isEdit])

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      dept_id: currentUser.dept_id,
      manager_id: currentUser.id,
    }
    if (isEdit) {
      await api.updateEvent(id, payload)
      showToast('Event updated.', 'success')
    } else {
      await api.createEvent(payload)
      showToast('Event created.', 'success')
    }
    setSaving(false)
    navigate('/manager')
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
            <Input type="date" required value={form.date} onChange={(e) => update('date', e.target.value)} />
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
              min={1}
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
