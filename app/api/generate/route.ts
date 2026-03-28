import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AGENDA_LIBRARY } from '@/lib/agenda-library'

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
      agenda_types = [],
      compliance_category,
      company_class,
      authorised_capital, paid_up_capital,
    } = body

    // Rate limiting
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

    // Build agenda context from library
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
