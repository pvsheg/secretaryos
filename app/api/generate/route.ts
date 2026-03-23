import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Emails with unlimited access — add your own email here
const ADMIN_EMAILS = ['pvsheg@gmail.com']

// Demo limits per document type per user
const DEMO_LIMITS: Record<string, number> = {
  board_minutes: 1,
  agm_notice: 1,
  roc_filing: 1,
}

const DOC_TYPE_LABELS: Record<string, string> = {
  board_minutes: 'board minutes document',
  agm_notice: 'AGM notice',
  roc_filing: 'ROC filing',
}

const SYSTEM_PROMPTS: Record<string, string> = {
  board_minutes: `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate legally precise board meeting minutes under the Companies Act 2013.

Output using these exact HTML classes only — no markdown, no code blocks:
- <p class="doc-title-main"> for the main title (centered, uppercase)
- <p class="doc-center"> for company details block
- <p class="doc-section"> for section headers
- <p class="doc-line"> for indented content lines
- <p class="doc-resolution"> for resolutions — always use <strong>RESOLVED THAT</strong>
- <div class="doc-sig"><div><p class="doc-sig-line"></p>NAME<br/>Designation<br/><br/>Date: ___</div><div style="text-align:right"><p class="doc-sig-line"></p>Company Secretary<br/>Membership No: ___<br/><br/>Date: ___</div></div>

Legal rules — follow exactly:
- Section 173: board meetings convened under this section
- Section 174: quorum — minimum 2 directors or 1/3 of total strength whichever is higher — state the fraction explicitly
- Section 118(1): minutes to be signed within 30 days — always reference this in closure
- Section 152 + 160: director appointment resolutions
- Section 168: director resignation resolutions
- Section 188: related party transactions — note abstaining director by name
- SS-1 (Secretarial Standard on Board Meetings): always reference in meeting details
- Use RESOLVED THAT in capitals for all operative resolution parts
- Never alter or invent DIN numbers
- Use formal Indian legal English throughout
- Number resolutions: FIRST, SECOND, THIRD etc.`,

  agm_notice: `You are SecretaryOS, generating a formal AGM Notice under the Companies Act 2013.

Output using these exact HTML classes — no markdown:
- <p class="doc-title-main"> for notice title
- <p class="doc-center"> for company details
- <p class="doc-section"> for section headers
- <p class="doc-line"> for content
- <p class="doc-resolution"> for special business resolutions

Legal rules:
- Section 96: AGM must be held within 6 months of financial year end
- Section 101: 21 clear days notice required — state this explicitly
- Section 102: Explanatory statement for special business items
- SS-2 (Secretarial Standard on General Meetings): reference throughout
- Include: proxy form notice (Section 105), quorum (Section 103), e-voting details if applicable
- Ordinary business: adoption of accounts, declaration of dividend, director retirement, auditor appointment
- Special business: everything else — requires explanatory statement`,

  roc_filing: `You are SecretaryOS, generating board resolutions for ROC filings under the Companies Act 2013.

Output using these exact HTML classes — no markdown:
- <p class="doc-title-main"> for resolution title
- <p class="doc-center"> for company details
- <p class="doc-section"> for section headers
- <p class="doc-line"> for content
- <p class="doc-resolution"> for resolutions with <strong>RESOLVED THAT</strong>

Legal rules:
- Always cite the relevant MCA form being authorised (MGT-7, AOC-4, DIR-12, etc.)
- Include authorisation of signatory with name and designation
- Reference applicable Companies Act sections for each resolution type
- MGT-7: Section 92 annual return
- AOC-4: Section 137 financial statements
- DIR-12: Section 170 director changes
- INC-22: Section 12 registered office
- Use FURTHER RESOLVED THAT for consequential resolutions`
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()

    // Get authenticated user from Supabase
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
    } = body

    // ── RATE LIMITING (skip for admins) ──────────────────────────────
    if (!isAdmin) {
      const limit = DEMO_LIMITS[doc_type] ?? 1

      const { count, error: countError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', doc_type)

      if (countError) {
        console.error('Rate limit check error:', countError)
      } else if ((count ?? 0) >= limit) {
        return NextResponse.json(
          {
            error: `Demo limit reached. You have used your free ${DOC_TYPE_LABELS[doc_type]}. This is a demo version — contact us to unlock full access.`,
            limit_reached: true,
            doc_type,
          },
          { status: 429 }
        )
      }
    }
    // ─────────────────────────────────────────────────────────────────

    const formattedDate = meeting_date
      ? new Date(meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : meeting_date

    const userPrompt = `Generate a complete ${doc_type.replace('_', ' ')} document for:

Company: ${company_name}
CIN: ${cin}
Registered Office: ${registered_office}
Financial Year End: ${financial_year_end}
Meeting Date: ${formattedDate}
Meeting Venue: ${meeting_venue}

Directors Present:
${directors_present}

Agenda Items and Decisions:
${agenda_items}

Generate the complete, legally precise document now. Output clean HTML only using the specified classes.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
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
