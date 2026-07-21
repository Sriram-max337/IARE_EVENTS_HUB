const DEPT_STYLES = {
  cse: 'bg-dept-cse/15 text-dept-cse',
  ece: 'bg-dept-ece/15 text-dept-ece',
  eee: 'bg-dept-eee/15 text-dept-eee',
  mech: 'bg-dept-mech/15 text-dept-mech',
  civil: 'bg-dept-civil/15 text-dept-civil',
  aero: 'bg-dept-aero/15 text-dept-aero',
}

export default function DeptBadge({ dept, size = 'md' }) {
  if (!dept) return null
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold tracking-wide uppercase ${sizeClass} ${DEPT_STYLES[dept.id] || DEPT_STYLES.cse}`}
    >
      {dept.code}
    </span>
  )
}

export function deptBorderClass(dept) {
  const map = {
    cse: 'border-l-dept-cse',
    ece: 'border-l-dept-ece',
    eee: 'border-l-dept-eee',
    mech: 'border-l-dept-mech',
    civil: 'border-l-dept-civil',
    aero: 'border-l-dept-aero',
  }
  return dept ? map[dept.id] || 'border-l-dept-cse' : 'border-l-border'
}
