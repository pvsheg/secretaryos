import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ADMIN_EMAILS = ['pvsheg@gmail.com']

const DEMO_LIMITS: Record<string, number> = {
  board_minutes: 1,
  agm_notice: 1,
  roc_filing: 1,
}

const DOC_TYPE_LABELS: Record<string, string> = {
  board_minutes: 'board minutes document',
  agm_notice: 'AGM notice',
  roc_filing: 'ROC filing resolution',
}

// ── AGENDA LIBRARY — based on Bikash's feedback ─────────────────────
// 100+ agenda types across three compliance categories
export const AGENDA_LIBRARY: Record<string, {
  label: string
  category: 'mandatory_annual' | 'event_based' | 'offline'
  resolution_template: string
  sections: string[]
}> = {
  // MANDATORY ANNUAL COMPLIANCES
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
  // EVENT BASED COMPLIANCES
  director_appointment: {
    label: 'Appointment of director',
    category: 'event_based',
    resolution_template: 'appointment of director',
    sections: ['Section 152', 'Section 160', 'SS-1 Clause 4'],
  },
  director_resignation: {
    label: 'Acceptance of director resignation',
    category: 'event_based',
    resolution_template: 'acceptance of resignation of director',
    sections: ['Section 168', 'DIR-11', 'DIR-12'],
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
  // OFFLINE / ONGOING COMPLIANCES
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
    label: 'Secretarial audit',
    category: 'offline',
    resolution_template: 'appointment of Secretarial Auditor and conduct of Secretarial Audit',
    sections: ['Section 204', 'MR-3'],
  },
}

// ── SYSTEM PROMPTS — enhanced per Bikash & Sandeep feedback ──────────
const SYSTEM_PROMPTS: Record<string, string> = {
  board_minutes: `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries.

Generate legally precise board meeting minutes under the Companies Act 2013 and Secretarial Standards.

OUTPUT FORMAT — use these exact HTML classes only, no markdown:
- <p class="doc-title-main"> — main title, centered, uppercase
- <p class="doc-center"> — company details block
- <p class="doc-section"> — section headers (uppercase, gold color)
- <p class="doc-line"> — indented content lines
- <p class="doc-resolution"> — resolutions (use <strong>RESOLVED THAT</strong> in caps)
- <p class="doc-further"> — for FURTHER RESOLVED THAT clauses
- <div class="doc-sig"><div>..Chairman..</div><div style="text-align:right">..CS..</div></div>

LEGAL RULES — follow exactly:
- Section 173: board meetings convened under this section, read with SS-1
- Section 174: quorum — state exact fraction (e.g. 2 out of 3 directors = 66.67%)
- Section 118(1): minutes to be signed within 30 days — always state this in closure
- Section 152 + 160: director appointment — include DIN, effective date, consent
- Section 168 + DIR-12: director resignation — include effective date, DIR-12 filing obligation
- Section 188: RPT — name the abstaining director explicitly in resolution text
- Section 179: general board powers
- Section 180: borrowing limits
- Section 196 + Schedule V: MD/WTD appointment
- SS-1 (Secretarial Standard on Board Meetings): reference throughout
- Use RESOLVED THAT in capitals for all operative parts
- Use FURTHER RESOLVED THAT for consequential authorisations
- Number resolutions: FIRST, SECOND, THIRD etc.
- Never alter or invent DIN numbers provided
- Include authorisation of KMP/CS to file any required forms with MCA
- Use formal Indian legal English — not American style`,

  agm_notice: `You are SecretaryOS generating a formal AGM Notice under the Companies Act 2013.

OUTPUT FORMAT — use these exact HTML classes, no markdown:
- <p class="doc-title-main"> — notice title
- <p class="doc-center"> — company details
- <p class="doc-section"> — section headers
- <p class="doc-line"> — content lines
- <p class="doc-resolution"> — special business resolutions

LEGAL RULES:
- Section 96: AGM within 6 months of financial year end
- Section 101: minimum 21 clear days notice — state this explicitly
- Section 102: Explanatory Statement mandatory for all special business
- SS-2 (Secretarial Standard on General Meetings): reference throughout
- Section 105: proxy notice (proxy must be member, form MGT-11)
- Section 103: quorum requirements
- Ordinary business: adoption of accounts, dividend, director retirement by rotation, auditor
- Special business: everything else — requires full explanatory statement with material facts
- Include e-voting details if applicable
- Include attendance slip and proxy form instructions`,

  roc_filing: `You are SecretaryOS generating board resolutions for MCA/ROC filings under the Companies Act 2013.

OUTPUT FORMAT — use these exact HTML classes, no markdown:
- <p class="doc-title-main"> — resolution title
- <p class="doc-center"> — company details
- <p class="doc-section"> — section headers
- <p class="doc-line"> — content
- <p class="doc-resolution"> — RESOLVED THAT resolutions
- <p class="doc-further"> — FURTHER RESOLVED THAT authorisations

LEGAL RULES:
- Always cite the exact MCA form being authorised
- Include authorisation of specific named KMP/CS to sign and file
- Include certification authority clause
- MGT-7: Section 92 annual return
- AOC-4: Section 137 financial statements filing
- DIR-12: Section 170 director changes, within 30 days of change
- INC-22: Section 12 registered office
- PAS-3: Section 42/62 share allotment
- SH-7: Section 61 capital alteration
- Use FURTHER RESOLVED THAT for each authorisation clause
- Include digital signature authorisation where required`,
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised. Please sign in.' }, { status: 401 })
    }

    const userEmail = user.email || ''
    const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase())

    const body = await req.json()
    const {
      doc_type = 'board_minutes',
      company_name, cin, registered_office,
      financial_year_end, meeting_date,
      meeting_venue, directors_present, agenda_items,
      // New fields from Bikash feedback
      agenda_types = [], // Array of agenda type keys from AGENDA_LIBRARY
      compliance_category, // mandatory_annual | event_based | offline
      company_class, // Private / Public / OPC
      authorised_capital, paid_up_capital,
    } = body

    // ── RATE LIMITING ────────────────────────────────────────────────
    if (!isAdmin) {
      const limit = DEMO_LIMITS[doc_type] ?? 1
      const { count } = await supabase
        .from('generation_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('doc_type', doc_type)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          {
            error: `Demo limit reached. You have used your free ${DOC_TYPE_LABELS[doc_type]}. Contact us to unlock full access.`,
            limit_reached: true,
            doc_type,
          },
          { status: 429 }
        )
      }

      await supabase.from('generation_usage').insert({ user_id: user.id, doc_type })
    }

    const formattedDate = meeting_date
      ? new Date(meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : meeting_date

    // ── BUILD AGENDA CONTEXT from library ────────────────────────────
    let agendaContext = ''
    if (agenda_types && agenda_types.length > 0) {
      const agendaDetails = agenda_types
        .filter((key: string) => AGENDA_LIBRARY[key])
        .map((key: string, idx: number) => {
          const item = AGENDA_LIBRARY[key]
          return `${idx + 1}. ${item.label} — Resolution regarding ${item.resolution_template} under ${item.sections.join(', ')}`
        })
        .join('\n')
      agendaContext = agendaDetails || agenda_items
    } else {
      agendaContext = agenda_items
    }

    const userPrompt = `Generate a complete ${doc_type.replace(/_/g, ' ')} document for:

Company: ${company_name}
CIN: ${cin}
Company Class: ${company_class || 'Private Limited'}
Registered Office: ${registered_office}
Financial Year End: ${financial_year_end}
${authorised_capital ? `Authorised Capital: ${authorised_capital}` : ''}
${paid_up_capital ? `Paid-up Capital: ${paid_up_capital}` : ''}
Meeting Date: ${formattedDate}
Meeting Venue: ${meeting_venue}
Compliance Category: ${compliance_category || 'Not specified'}

Directors Present:
${directors_present}

Agenda Items and Resolutions Required:
${agendaContext}

Generate the complete, legally precise document now.
- Include all required statutory references
- Include FURTHER RESOLVED THAT clauses for MCA filing authorisations where applicable
- Include the Company Secretary's authorisation to certify and file relevant forms
- Output clean HTML only using the specified classes`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: SYSTEM_PROMPTS[doc_type] || SYSTEM_PROMPTS.board_minutes,
      messages: [{ role: 'user', content: userPrompt }]
    })

    let content = (message.content[0] as any).text || ''
    content = content.replace(/```html|```/g, '').trim()

    return NextResponse.json({ content, tokens: message.usage })

  } catch (error: any) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
