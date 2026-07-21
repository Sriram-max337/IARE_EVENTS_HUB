import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import * as api from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import DeptBadge from '../../components/DeptBadge'
import Button from '../../components/Button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Field, Select } from '../../components/FormControls'

export default function AdminManagers() {
  const { showToast } = useToast()
  const [depts, setDepts] = useState([])
  const [users, setUsers] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(null)
  const [newManager, setNewManager] = useState({ user_id: '', dept_id: '' })

  async function load() {
    setLoading(true)
    const [deptList, userList, managerList] = await Promise.all([
      api.getDepts(),
      api.getUsers(),
      api.getManagers(),
    ])
    setDepts(deptList)
    setUsers(userList)
    setManagers(managerList)
    setNewManager((m) => ({
      user_id: m.user_id || userList.find((u) => u.role === 'student')?.id || '',
      dept_id: m.dept_id || deptList[0]?.id || '',
    }))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const deptById = useMemo(() => Object.fromEntries(depts.map((d) => [d.id, d])), [depts])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newManager.user_id || !newManager.dept_id) return
    const selectedUser = users.find((u) => u.id === newManager.user_id)
    await api.addManager(newManager)
    showToast(`${selectedUser?.name || 'User'} added as an event manager.`, 'success')
    setNewManager({ user_id: '', dept_id: depts[0]?.id || '' })
    setShowAdd(false)
    load()
  }

  const handleRemove = async () => {
    await api.removeManager(pendingRemove.id)
    showToast(`${pendingRemove.name} removed.`, 'info')
    setPendingRemove(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight2 text-ink-light dark:text-ink">Event managers</h1>
          <p className="text-sm text-ink-light-dim dark:text-ink-dim mt-1">
            Manage which staff accounts can create and run events per department.
          </p>
        </div>
        <Button icon={UserPlus} onClick={() => setShowAdd((v) => !v)}>
          Add manager
        </Button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="grid sm:grid-cols-3 gap-4 items-end rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface p-5"
        >
          <Field label="User">
            <Select
              required
              value={newManager.user_id}
              onChange={(e) => setNewManager((m) => ({ ...m, user_id: e.target.value }))}
            >
              <option value="" disabled>
                Select user
              </option>
              {users
                .filter((u) => u.role === 'student')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} - {u.roll_no}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Department">
            <Select
              value={newManager.dept_id}
              onChange={(e) => setNewManager((m) => ({ ...m, dept_id: e.target.value }))}
            >
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save manager
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-card border border-border-light dark:border-border bg-surface-light dark:bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border text-left text-xs uppercase tracking-wide text-ink-light-dim dark:text-ink-dim">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Staff ID</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-light-dim dark:text-ink-dim">
                  Loading…
                </td>
              </tr>
            ) : managers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-light-dim dark:text-ink-dim">
                  No event managers yet.
                </td>
              </tr>
            ) : (
              managers.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border-light dark:border-border last:border-0 hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-ink-light dark:text-ink">{m.name}</td>
                  <td className="px-5 py-3 text-ink-light-dim dark:text-ink-dim">{m.roll_no}</td>
                  <td className="px-5 py-3">
                    <DeptBadge dept={deptById[m.managed_dept_id]} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setPendingRemove(m)}
                      className="p-1.5 rounded-md text-ink-light-dim dark:text-ink-dim hover:text-state-red hover:bg-state-red/10 transition-colors"
                      aria-label={`Remove ${m.name}`}
                      title="Remove manager"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remove this manager?"
        description={`${pendingRemove?.name} will lose access to manage events for their department.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  )
}
