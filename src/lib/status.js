// Centralised status definitions — single source of truth
// Used everywhere: panel, arc tooltip, stage mode, window, mobile sheet

export const STATUS = {
  concept:  { label: 'Concept',     color: '#424040', dotColor: '#3A3830', icon: '○' },
  progress: { label: 'In progress', color: 'var(--accent)',  dotColor: 'var(--accent)',  icon: '●' },
  review:   { label: 'In review',   color: '#C07010', dotColor: '#C07010', icon: '◎' },
  approved: { label: 'Approved',    color: '#4ADE80', dotColor: '#4ADE80', icon: '◉' },
  locked:   { label: 'Locked',      color: '#4ADE80', dotColor: '#4ADE80', icon: '⊠' },
}

export const STATUS_ORDER = ['concept', 'progress', 'review', 'approved', 'locked']

export function getStatus(key) {
  return STATUS[key] ?? STATUS.concept
}

export function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current)
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
}
