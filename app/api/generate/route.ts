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
  board_minutes: `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate legally precise, complete board meeting minutes under the Companies Act 2013 and Secretarial Standards.

CRITICAL RULES — NEVER VIOLATE:
1. NEVER leave placeholder text like "[To be populated...]" or "[Insert here]" — always use the actual data provided
2. If directors are provided, list every single one with their full name, DIN and designation
3. If no directors are provided for a section (e.g. leave of absence), OMIT that section entirely — do not show it with a placeholder
4. Keep resolution text concise — RESOLVED THAT operative text should be 2-4 lines maximum
5. Do NOT pad with excessive statutory recitals — one brief paragraph of background per resolution is enough
6. The document must be COMPLETE — never cut off mid-sentence. If you have many agenda items, keep each resolution brief to fit within the output limit
7. Never show the generation date — only show the meeting date provided

OUTPUT FORMAT — use ONLY these exact HTML classes, no markdown, no inline styles:
- <p class="doc-title-main"> — main title, centered, bold, uppercase
- <p class="doc-center"> — company details (name, CIN, address), centered
- <p class="doc-section"> — section headers e.g. "I. CONSTITUTION OF THE MEETING"
- <p class="doc-line"> — body text paragraphs
- <p class="doc-resolution"> — resolution text, always start with <strong>RESOLVED THAT</strong>
- <p class="doc-further"> — consequential clauses starting with <strong>FURTHER RESOLVED THAT</strong>
- <div class="doc-sig">...</div> — signature block at the end

DOCUMENT STRUCTURE — follow this exact order:
1. Title: MINUTES OF THE MEETING OF THE BOARD OF DIRECTORS
2. Company name, CIN, registered office, meeting date, venue, convened under Section 173 read with SS-1
3. I. CONSTITUTION OF THE MEETING — one paragraph confirming the meeting was held
4. II. NOTICE AND QUORUM — confirm notice was given per Section 173(3), state quorum fraction e.g. "2 out of 3 directors (66.67%)" per Section 174(1)
5. III. DIRECTORS PRESENT — list each director: "Name (DIN: XXXXXXXX), Designation — Present in person"
6. IV. INVITEES — Company Secretary present to record proceedings. Omit if no other invitees.
7. V. COMMENCEMENT — Chairman called meeting to order, CS confirmed quorum
8. VI. CONFIRMATION OF NOTICE — notice acknowledged per Section 173(3) and SS-1 Clause 1.3
9. VII. CONFIRMATION OF PREVIOUS MINUTES — confirmed per Section 118(1) and SS-1 Clause 7.1
10. VIII. TRANSACTIONS OF BUSINESS — all resolutions here, numbered FIRST, SECOND, THIRD etc
11. IX. CLOSURE — meeting concluded, minutes to be signed within 30 days per Section 118(1)
12. Signature block — Chairman on left, Company Secretary on right

RESOLUTION FORMAT — keep it tight:
<p class="doc-section">FIRST RESOLUTION — [SHORT TITLE IN CAPS]</p>
<p class="doc-line">The Chairman introduced the matter of [brief one line description].</p>
<p class="doc-resolution"><strong>RESOLVED THAT</strong> [operative text — 2 to 3 lines maximum, cite the relevant section].</p>
<p class="doc-further"><strong>FURTHER RESOLVED THAT</strong> [name], Company Secretary (Membership No. [if provided]), be and is hereby authorised to do all such acts, deeds and things and to file such forms with the Registrar of Companies as may be necessary to give effect to the foregoing resolution.</p>

LEGAL REFERENCES:
- Section 173: board meeting convening
- Section 174(1): quorum — one-third of total strength or 2 directors, whichever is higher
- Section 118(1): minutes signing within 30 days
- Section 152/160: director appointment with DIN
- Section 168 + DIR-12: director resignation within 30 days
- Section 188: RPT — name abstaining director
- Section 92 + MGT-7: annual return filing
- Section 137 + AOC-4: financial statements filing
- SS-1: Secretarial Standard on Board Meetings throughout`,

  agm_notice: `You are SecretaryOS generating a formal AGM Notice under the Companies Act 2013.

CRITICAL RULES:
1. NEVER leave placeholder text — use actual data provided
2. Keep the notice complete and self-contained
3. Include the full explanatory statement for every special business item
4. Never cut off mid-sentence — keep ordinary business brief to allow space for special business

OUTPUT FORMAT — use ONLY these HTML classes:
- <p class="doc-title-main"> — notice title
- <p class="doc-center"> — company details
- <p class="doc-section"> — section headers
- <p class="doc-line"> — body text
- <p class="doc-resolution"> — special business resolutions with <strong>RESOLVED THAT</strong>

LEGAL RULES:
- Section 96: AGM within 6 months of financial year end
- Section 101: minimum 21 clear days notice — state explicitly
- Section 102: Explanatory Statement mandatory for all special business
- Section 105: proxy notice — member must be eligible, Form MGT-11, 48 hours before meeting
- Section 103: quorum for public company — 5 members personally present
- SS-2: Secretarial Standard on General Meetings throughout
- Ordinary business: adoption of accounts, dividend, director retirement by rotation, auditor reappointment
- Special business: everything else — full explanatory statement required`,

  roc_filing: `You are SecretaryOS generating board resolutions for MCA/ROC filings under the Companies Act 2013.

CRITICAL RULES:
1. NEVER leave placeholder text — use actual data provided
2. Keep each resolution concise — RESOLVED THAT text should be 2-3 lines
3. Always include FURTHER RESOLVED THAT authorising the CS/KMP to file the relevant form
4. Complete the document fully — never cut off

OUTPUT FORMAT — use ONLY these HTML classes:
- <p class="doc-title-main"> — resolution title
- <p class="doc-center"> — company details
- <p class="doc-section"> — section headers
- <p class="doc-line"> — body text
- <p class="doc-resolution"> — <strong>RESOLVED THAT</strong> operative text
- <p class="doc-further"> — <strong>FURTHER RESOLVED THAT</strong> authorisation clauses

LEGAL RULES — cite exact form and section for each resolution:
- MGT-7: Section 92 annual return — file within 60 days of AGM
- AOC-4: Section 137 financial statements — file within 30 days of AGM
- DIR-12: Section 170 director changes — file within 30 days of change
- INC-22: Section 12 registered office change
- PAS-3: Section 42/62 share allotment — file within 15 days
- SH-7: Section 61 capital increase`,
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
          return `${idx + 1}. ${item.label} — under ${item.sections.join(', ')}`
        })
        .join('\n')
      agendaContext = agendaDetails || agenda_items
    } else {
      agendaContext = agenda_items
    }

    const userPrompt = `Generate a complete, legally precise ${doc_type.replace(/_/g, ' ')} document using the following details. Use every piece of information provided — do not leave any placeholders.

COMPANY DETAILS:
Company Name: ${company_name}
CIN: ${cin}
Company Class: ${company_class || 'Private Limited'}
Registered Office: ${registered_office}
Financial Year End: ${financial_year_end}
${authorised_capital ? `Authorised Capital: ${authorised_capital}` : ''}
${paid_up_capital ? `Paid-up Capital: ${paid_up_capital}` : ''}

MEETING DETAILS:
Date: ${formattedDate}
Venue: ${meeting_venue}
${compliance_category ? `Compliance Category: ${compliance_category}` : ''}

DIRECTORS PRESENT (use these exact names and DINs — do not leave this section as a placeholder):
${directors_present || 'No director details provided — note this in the document'}

AGENDA ITEMS TO RESOLVE:
${agendaContext || agenda_items}

GENERATION RULES:
- Fill in ALL sections with actual data — never write "[To be populated]" or similar placeholders
- Keep each resolution concise — RESOLVED THAT text should be 2-3 lines only
- If a section has no data (e.g. no directors on leave of absence), omit that section entirely
- The document MUST be complete — do not cut off. Keep resolutions brief to ensure completeness
- Output clean HTML only using the specified CSS classes`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,  // Increased from 2500 to prevent cutoff
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
