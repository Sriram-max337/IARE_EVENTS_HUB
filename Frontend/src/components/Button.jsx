import { motion } from 'framer-motion'

const VARIANTS = {
  primary: 'bg-accent text-accent-text font-semibold hover:bg-accent-hover',
  secondary:
    'bg-transparent border border-border-light dark:border-border text-ink-light dark:text-ink hover:border-border-light-bright dark:hover:border-border-bright hover:bg-surface-light-hover dark:hover:bg-surface-hover',
  ghost:
    'bg-transparent text-ink-light-dim dark:text-ink-dim hover:text-ink-light dark:hover:text-ink hover:bg-surface-light-hover dark:hover:bg-surface-hover',
  danger: 'bg-transparent border border-state-red/40 text-state-red hover:bg-state-red/10',
  waitlist: 'bg-state-amber/15 text-state-amber font-semibold border border-state-amber/30',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  icon: Icon,
  ...props
}) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.12 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </motion.button>
  )
}
