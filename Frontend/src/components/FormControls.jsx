export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-light dark:text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-light-dim dark:text-ink-dim">{hint}</span>}
    </label>
  )
}

const baseInput =
  'w-full rounded-lg border border-border-light dark:border-border bg-surface-light dark:bg-surface px-3 py-2 text-sm text-ink-light dark:text-ink placeholder:text-ink-light-dim dark:placeholder:text-ink-faint focus:border-accent transition-colors outline-none'

export function Input({ className = '', ...props }) {
  return <input className={`${baseInput} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${baseInput} resize-none ${className}`} rows={4} {...props} />
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${baseInput} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2.5 ${label ? '' : ''}`}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-surface-light-hover dark:bg-surface-hover'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      {label && <span className="text-sm text-ink-light dark:text-ink">{label}</span>}
    </button>
  )
}
