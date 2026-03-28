// lib/agenda-library.ts
// Shared agenda library — used by both the API route and the generate page

export const AGENDA_LIBRARY: Record<string, {
  label: string
  category: 'mandatory_annual' | 'event_based' | 'offline'
  resolution_template: string
  sections: string[]
}> = {
  // MANDATORY ANNUAL
  financial_statements: {
    label: 'Approval of financial statements',
    category: 'mandatory_annual',
    resolution_template: 'approval and adoption of the audited financial statements',
    sections: ['Section 134', 'Section 129'],
  },
  auditor_appointment: {
    label: 'Appointment / reappointment of auditor',
    category: 'mandatory_annual',
    resolution_template: 'appointment of statutory auditor',
    sections: ['Section 139', 'Section 141'],
  },
  dividend_declaration: {
    label: 'Declaration of dividend',
    category: 'mandatory_annual',
    resolution_template: 'declaration of dividend',
    sections: ['Section 123', 'Section 124'],
  },
  agm_notice_agenda: {
    label: 'AGM notice and agenda',
    category: 'mandatory_annual',
    resolution_template: 'convening of Annual General Meeting',
    sections: ['Section 96', 'Section 101', 'SS-2'],
  },
  mgt7_filing: {
    label: 'Annual return filing (MGT-7)',
    category: 'mandatory_annual',
    resolution_template: 'authorisation for filing of Annual Return in Form MGT-7',
    sections: ['Section 92'],
  },
  aoc4_filing: {
    label: 'Financial statements filing (AOC-4)',
    category: 'mandatory_annual',
    resolution_template: 'authorisation for filing of financial statements in Form AOC-4',
    sections: ['Section 137'],
  },
  directors_report: {
    label: "Approval of Directors' Report",
    category: 'mandatory_annual',
    resolution_template: "approval of the Board's Report / Directors' Report",
    sections: ['Section 134'],
  },
  // EVENT BASED
  director_appointment: {
    label: 'Appointment of director',
    category: 'event_based',
    resolution_template: 'appointment of director',
    sections: ['Section 152', 'Section 160', 'SS-1'],
  },
  director_resignation: {
    label: 'Acceptance of director resignation',
    category: 'event_based',
    resolution_template: 'acceptance of resignation of director',
    sections: ['Section 168', 'DIR-12'],
  },
  managing_director_appointment: {
    label: 'Appointment of Managing Director / WTD',
    category: 'event_based',
    resolution_template: 'appointment of Managing Director / Whole-time Director',
    sections: ['Section 196', 'Section 197', 'Schedule V'],
  },
  share_allotment: {
    label: 'Allotment of shares',
    category: 'event_based',
    resolution_template: 'allotment of equity shares',
    sections: ['Section 62', 'Section 42', 'PAS-3'],
  },
  registered_office_change: {
    label: 'Change of registered office',
    category: 'event_based',
    resolution_template: 'change of registered office address',
    sections: ['Section 12', 'INC-22'],
  },
  bank_account_opening: {
    label: 'Opening of bank account',
    category: 'event_based',
    resolution_template: 'opening of bank account and authorisation of signatories',
    sections: ['Section 179'],
  },
  loan_borrowing: {
    label: 'Borrowing of funds / loan',
    category: 'event_based',
    resolution_template: 'borrowing of funds',
    sections: ['Section 179', 'Section 180'],
  },
  rpt_approval: {
    label: 'Related party transaction approval',
    category: 'event_based',
    resolution_template: 'approval of related party transaction',
    sections: ['Section 188', 'Rule 15'],
  },
  property_purchase: {
    label: 'Purchase / sale of property or asset',
    category: 'event_based',
    resolution_template: 'purchase / sale of immovable property or significant asset',
    sections: ['Section 179', 'Section 180'],
  },
  investment_approval: {
    label: 'Investment in securities',
    category: 'event_based',
    resolution_template: 'investment in securities',
    sections: ['Section 179', 'Section 186'],
  },
  director_remuneration: {
    label: 'Approval of director remuneration',
    category: 'event_based',
    resolution_template: 'approval of remuneration payable to director',
    sections: ['Section 197', 'Section 198', 'Schedule V'],
  },
  cs_appointment: {
    label: 'Appointment of Company Secretary',
    category: 'event_based',
    resolution_template: 'appointment of Company Secretary as Key Managerial Personnel',
    sections: ['Section 203', 'Rule 8'],
  },
  cfo_appointment: {
    label: 'Appointment of CFO / KMP',
    category: 'event_based',
    resolution_template: 'appointment of Chief Financial Officer / Key Managerial Personnel',
    sections: ['Section 203'],
  },
  capital_increase: {
    label: 'Increase in authorised capital',
    category: 'event_based',
    resolution_template: 'increase in authorised share capital',
    sections: ['Section 61', 'SH-7'],
  },
  din_allotment: {
    label: 'Application for DIN',
    category: 'event_based',
    resolution_template: 'authorisation to apply for Director Identification Number',
    sections: ['Section 154', 'DIR-3'],
  },
  // OFFLINE / ONGOING
  statutory_registers: {
    label: 'Maintenance of statutory registers',
    category: 'offline',
    resolution_template: 'noting and maintenance of statutory registers',
    sections: ['Section 88', 'MGT-1', 'MGT-2'],
  },
  minutes_confirmation: {
    label: 'Confirmation of previous meeting minutes',
    category: 'offline',
    resolution_template: 'confirmation of minutes of previous Board Meeting',
    sections: ['Section 118', 'SS-1 Clause 7'],
  },
  annual_compliance_review: {
    label: 'Annual compliance review',
    category: 'offline',
    resolution_template: 'review of annual compliance status',
    sections: ['Section 134'],
  },
  secretarial_audit: {
    label: 'Secretarial audit appointment',
    category: 'offline',
    resolution_template: 'appointment of Secretarial Auditor and conduct of Secretarial Audit',
    sections: ['Section 204', 'MR-3'],
  },
}
