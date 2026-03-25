export const DOC_TYPES = [
  { id: 'board_minutes' as const, label: 'Board meeting minutes', icon: '📋', desc: 'Section 118 compliant' },
  { id: 'agm_notice' as const, label: 'AGM notice', icon: '📢', desc: 'SS-2 compliant' },
  { id: 'roc_filing' as const, label: 'ROC filing resolution', icon: '🗂️', desc: 'MCA compliant' },
]

export type DocType = 'board_minutes' | 'agm_notice' | 'roc_filing'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  board_minutes: 'Board meeting minutes',
  agm_notice: 'AGM notice',
  roc_filing: 'ROC filing resolution',
}

export const DEMO_LIMITS: Record<DocType, number> = {
  board_minutes: 1,
  agm_notice: 1,
  roc_filing: 1,
}

export const LOADING_STEPS = [
  'Reading client profile',
  'Applying Companies Act 2013 rules',
  'Drafting statutory resolutions',
  'Formatting for SS-1 compliance',
]

export const ADMIN_EMAILS = ['pvsheg@gmail.com']
