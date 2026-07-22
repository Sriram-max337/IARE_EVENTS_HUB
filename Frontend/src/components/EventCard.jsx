import { motion } from 'framer-motion'
import { Calendar, MapPin, Users, Pencil, BarChart3, Trash2, ShieldAlert, QrCode, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import DeptBadge, { deptBorderClass } from './DeptBadge'
import CapacityBar from './CapacityBar'
import Button from './Button'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Shared event card. `role` controls which action area renders:
 *  - "student": Register / Waitlisted / Cancel button, driven by `userStatus`
 *  - "manager": quick registered-count stat + edit / stats icon buttons
 *  - "admin":   dept + status context + override edit / force-delete icon buttons
 */
export default function EventCard({
  event,
  dept,
  registeredCount = 0,
  role = 'student',
  detailHref,
  userStatus = 'none', // 'none' | 'confirmed' | 'waitlisted'
  onRegister,
  onCancel,
  onEdit,
  onViewStats,
  onScanAttendance,
  onViewAttendance,
  onDelete,
  isPastOrCancelled = false,
}) {
  const isFull = registeredCount >= event.capacity
  const cardInner = (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className={`group relative flex flex-col gap-3 rounded-card border border-border-light dark:border-border border-l-4 ${deptBorderClass(
        dept
      )} bg-surface-light dark:bg-surface p-4 hover:border-border-light-bright dark:hover:border-border-bright transition-colors duration-150`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <DeptBadge dept={dept} size="sm" />
            {isPastOrCancelled && (
              <span className="text-[10px] uppercase tracking-wide text-ink-light-dim dark:text-ink-dim">
                {event.status}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-ink-light dark:text-ink tracking-tight2 leading-snug truncate">
            {event.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-light-dim dark:text-ink-dim">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={13} /> {formatDate(event.date)} · {event.time}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} /> {event.venue}
        </span>
      </div>

      <CapacityBar registered={registeredCount} capacity={event.capacity} size="sm" />

      <div className="pt-1">
        {role === 'student' && (
          <div onClick={(e) => e.stopPropagation()}>
            {userStatus === 'confirmed' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-state-green">Registered</span>
                <Button variant="secondary" size="sm" onClick={() => onCancel?.(event)}>
                  Cancel
                </Button>
              </div>
            )}
            {userStatus === 'waitlisted' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-state-amber">Waitlisted</span>
                <Button variant="secondary" size="sm" onClick={() => onCancel?.(event)}>
                  Cancel
                </Button>
              </div>
            )}
            {userStatus === 'none' && (
              <Button
                variant={isFull && event.waitlist_enabled ? 'waitlist' : 'primary'}
                size="sm"
                disabled={isFull && !event.waitlist_enabled}
                onClick={() => onRegister?.(event)}
              >
                {isFull && event.waitlist_enabled
                  ? 'Join waitlist'
                  : isFull
                  ? 'Full'
                  : 'Register'}
              </Button>
            )}
          </div>
        )}

        {role === 'manager' && (
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-light-dim dark:text-ink-dim">
              <Users size={13} /> {registeredCount} registered
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onScanAttendance?.(event)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-light dark:border-border px-2.5 py-2 text-xs font-medium text-ink-light dark:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
                aria-label="Scan attendance"
                title="Scan attendance"
              >
                <QrCode size={15} />
                Scan attendance
              </button>
              <button
                onClick={() => onViewAttendance?.(event)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-light dark:border-border px-2.5 py-2 text-xs font-medium text-ink-light dark:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
                aria-label="Attendance list"
                title="Attendance list"
              >
                <ClipboardList size={15} />
                Attendance list
              </button>
              <button
                onClick={() => onViewStats?.(event)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-light dark:border-border px-2.5 py-2 text-xs font-medium text-ink-light dark:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
                aria-label="Event stats"
                title="Event stats"
              >
                <BarChart3 size={15} />
                Event stats
              </button>
              <button
                onClick={() => onEdit?.(event)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-light dark:border-border px-2.5 py-2 text-xs font-medium text-ink-light dark:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
                aria-label="Edit event"
                title="Edit event"
              >
                <Pencil size={15} />
                Edit event
              </button>
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-light-dim dark:text-ink-dim">
              <ShieldAlert size={13} /> {dept?.name}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onEdit?.(event)}
                className="p-1.5 rounded-md text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover transition-colors"
                aria-label="Override event"
                title="Override / edit"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => onDelete?.(event)}
                className="p-1.5 rounded-md text-ink-light-dim dark:text-ink-dim hover:text-state-red hover:bg-state-red/10 transition-colors"
                aria-label="Force delete event"
                title="Force delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )

  if (detailHref && role !== 'manager') {
    return (
      <Link to={detailHref} className="block">
        {cardInner}
      </Link>
    )
  }
  return cardInner
}
