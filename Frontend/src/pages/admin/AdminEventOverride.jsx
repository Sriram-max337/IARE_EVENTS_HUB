import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import * as api from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Field, Input, Textarea, Switch, Select } from '../../components/FormControls'
import Button from '../../components/Button'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function AdminEventOverride() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState(null)
  const [depts, setDepts] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [ev, deptList, managerList] = await Promise.all([
        api.getEventById(id),
        api.getDepts(),
        api.getManagers(),
      ])
      setForm(ev)
      setDepts(deptList)
      setManagers(managerList)
      setLoading(false)
    })()
  }, [id])

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await api.updateEvent(id, { ...form, capacity: Number(form.capacity) })
    showToast('Event overridden and saved.', 'success')
    setSaving(false)
    navigate('/admin')
  }

  const handleDelete = async () => {
    await api.deleteEvent(id)
    showToast(`"${form.title}" was force-deleted.`, 'info')
    navigate('/admin')
  }

  if (loading || !form) {
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">Admin override</h1>
          <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
            Full edit access, including reassigning department and manager.
          </p>
        </div>
        <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
          Force delete
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-6"
      >
        <Field label="Title">
          <Input required value={form.title} onChange={(e) => update('title', e.target.value)} />
        </Field>

        <Field label="Description">
          <Textarea required value={form.description} onChange={(e) => update('description', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <Select value={form.dept_id} onChange={(e) => update('dept_id', e.target.value)}>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Manager">
            <Select value={form.manager_id} onChange={(e) => update('manager_id', e.target.value)}>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" required value={form.date} onChange={(e) => update('date', e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" required value={form.time} onChange={(e) => update('time', e.target.value)} />
          </Field>
        </div>

        <Field label="Venue">
          <Input required value={form.venue} onChange={(e) => update('venue', e.target.value)} />
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
          <Field label="Status">
            <Select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>

        <Switch
          checked={form.waitlist_enabled}
          onChange={(v) => update('waitlist_enabled', v)}
          label="Enable waitlist"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-border-light dark:border-border mt-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save override'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Force-delete this event?"
        description={`"${form.title}" and all its registrations will be permanently removed. This cannot be undone.`}
        confirmLabel="Force delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
