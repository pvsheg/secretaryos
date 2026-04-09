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

export const PRICING_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    annualPrice: 0,
    currency: 'INR',
    docsPerMonth: 5,
    maxWithRollover: 5,
    companies: 'unlimited' as const,
    users: 1,
    features: ['Board meetings (Notice, Agenda, Minutes)', 'MCA auto-fetch via CIN', 'PDF download'],
  },
  professional: {
    name: 'Professional',
    price: 499,
    annualPrice: 4999,
    currency: 'INR',
    docsPerMonth: 100,
    maxWithRollover: 200,
    companies: 'unlimited' as const,
    users: 1,
    features: [
      'Board meetings (Notice, Agenda, Minutes)',
      'AGM system (Notice, Agenda, Minutes)',
      'Unlimited document templates',
      'Email support',
      'MCA auto-fetch via CIN',
      'PDF download',
      '30-day document rollover',
    ],
  },
  firm: {
    name: 'Firm',
    price: 1500,
    annualPrice: 14999,
    currency: 'INR',
    docsPerMonth: 200,
    maxWithRollover: 400,
    companies: 'unlimited' as const,
    users: 5,
    features: [
      'Everything in Professional',
      'Priority support (24-hour response)',
      'Custom PDF templates',
      'Multi-user access (5 seats)',
      'Admin dashboard',
      '30-day document rollover',
    ],
  },
}

export const REFERRAL_COMMISSION = {
  rate: 0.20,
  individual: {
    monthlyCommission: 99.80,
    annualValue: 1197,
  },
  firm: {
    monthlyCommission: 300,
    annualValue: 3600,
  },
}
