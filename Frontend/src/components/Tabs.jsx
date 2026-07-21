import { motion } from 'framer-motion'

export default function Tabs({ tabs, active, onChange, layoutId = 'tab-underline' }) {
  return (
    <div className="flex items-center gap-1 border-b border-border-light dark:border-border">
      {tabs.map((tab) => {
        const isActive = tab.value === active
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'text-ink-light dark:text-ink'
                : 'text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-ink-light-dim dark:text-ink-dim">({tab.count})</span>
            )}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
