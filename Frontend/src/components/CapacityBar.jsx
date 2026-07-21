import { motion } from 'framer-motion'

export default function CapacityBar({ registered, capacity, showLabel = true, size = 'md' }) {
  const pct = capacity > 0 ? Math.min(100, (registered / capacity) * 100) : 0
  const isFull = registered >= capacity

  let colorClass = 'bg-state-green'
  if (pct >= 90) colorClass = 'bg-state-red'
  else if (pct >= 70) colorClass = 'bg-state-amber'

  const height = size === 'sm' ? 'h-1' : 'h-1.5'

  return (
    <div className="w-full">
      <div className={`w-full ${height} rounded-full bg-surface-light-hover dark:bg-surface-hover overflow-hidden`}>
        <motion.div
          className={`${height} rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-ink-light-dim dark:text-ink-dim">
            {registered}/{capacity} registered
          </span>
          {isFull && (
            <span className="text-xs font-semibold text-state-red">Full</span>
          )}
        </div>
      )}
    </div>
  )
}
