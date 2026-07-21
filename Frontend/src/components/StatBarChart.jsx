import { motion } from 'framer-motion'

/**
 * data: [{ label, value, colorClass? }]
 */
export default function StatBarChart({ data, emptyLabel = 'No data yet' }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  if (data.length === 0) {
    return <p className="text-sm text-ink-light-dim dark:text-ink-dim">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-medium text-ink-light-dim dark:text-ink-dim uppercase tracking-wide">
            {d.label}
          </span>
          <div className="flex-1 h-6 rounded-md bg-surface-light-hover dark:bg-surface-hover overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-md ${d.colorClass || 'bg-accent'} flex items-center justify-end px-2`}
            >
              {d.value > 0 && (
                <span className="text-[11px] font-semibold text-accent-text">{d.value}</span>
              )}
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  )
}
