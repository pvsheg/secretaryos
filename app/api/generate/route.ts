import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import { AGENDA_LIBRARY } from '@/lib/agenda-library'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ADMIN_EMAILS = ['pvsheg@gmail.com']

// Monthly document limits per plan
const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  founding: 100,
  starter: 50,
  growth: 200,
  firm: 500,
}

// Model routing — use Haiku for simple docs, Sonnet for complex
const MODEL_BY_TYPE: Record<string, string> = {
  board_minutes: 'claude-sonnet-4-6',           // Complex — needs Sonnet
  agm_notice: 'claude-haiku-4-5-20251001',      // Standard — Haiku sufficient
  roc_filing: 'claude-haiku-4-5-20251001',      // Templated — Haiku sufficient
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
6. The document must be COMPLETE — never cut off mid-sentence
7. Never show the generation date — only show the meeting date provided

OUTPUT FORMAT — use ONLY these exact HTML classes, no markdown:
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
3. I. CONSTITUTION OF THE MEETING — one paragraph
4. II. NOTICE AND QUORUM — confirm notice per Section 173(3), state quorum fraction per Section 174(1)
5. III. DIRECTORS PRESENT — list each director: "Name (DIN: XXXXXXXX), Designation — Present in person"
6. IV. INVITEES — Company Secretary present. Omit if no other invitees.
7. V. COMMENCEMENT — Chairman called meeting to order
8. VI. CONFIRMATION OF NOTICE — per Section 173(3) and SS-1 Clause 1.3
9. VII. CONFIRMATION OF PREVIOUS MINUTES — per Section 118(1) and SS-1 Clause 7.1
10. VIII. TRANSACTIONS OF BUSINESS — all resolutions, numbered FIRST, SECOND, THIRD
11. IX. CLOSURE — meeting concluded, minutes to be signed within 30 days per Section 118(1)
12. Signature block — Chairman left, Company Secretary right

RESOLUTION FORMAT:
<p class="doc-section">FIRST RESOLUTION — [TITLE IN CAPS]</p>
<p class="doc-line">The Chairman introduced the matter of [brief one line].</p>
<p class="doc-resolution"><strong>RESOLVED THAT</strong> [operative text — 2-3 lines, cite relevant section].</p>
<p class="doc-further"><strong>FURTHER RESOLVED THAT</strong> the Company Secretary be authorised to file all required forms with the Registrar of Companies.</p>

LEGAL REFERENCES:
- Section 173: board meeting convening
- Section 174(1): quorum — one-third or 2 directors, whichever higher
- Section 118(1): minutes signing within 30 days
- Section 152/160: director appointment with DIN
- Section 168 + DIR-12: director resignation within 30 days
- Section 188: RPT — name abstaining director
- Section 92 + MGT-7: annual return
- Section 137 + AOC-4: financial statements
- SS-1: Secretarial Standard on Board Meetings throughout`,

  agm_notice: `You are SecretaryOS generating a formal AGM Notice under the Companies Act 2013.

CRITICAL RULES:
1. NEVER leave placeholder text — use actual data provided
2. Complete document — never cut off
3. Include explanatory statement for every special business item

OUTPUT FORMAT — use ONLY these HTML classes:
- <p class="doc-title-main"> — notice title
- <p class="doc-center"> — company details
- <p class="doc-section"> — section headers
- <p class="doc-line"> — body text
- <p class="doc-resolution"> — special business with <strong>RESOLVED THAT</strong>

LEGAL RULES:
- Section 96: AGM within 6 months of FY end
- Section 101: minimum 21 clear days notice
- Section 102: Explanatory Statement for all special business
- Section 105: proxy notice, Form MGT-11, 48 hours before
- Section 103: quorum
- SS-2: Secretarial Standard on General Meetings`,

  roc_filing: `You are SecretaryOS generating board resolutions for MCA/ROC filings under the Companies Act 2013.

CRITICAL RULES:
1. NEVER leave placeholder text — use actual data provided
2. Keep each resolution concise — RESOLVED THAT text 2-3 lines only
3. Always include FURTHER RESOLVED THAT authorising CS to file the relevant form
4. Complete document — never cut off

OUTPUT FORMAT — use ONLY these HTML classes:
- <p class="doc-title-main"> — resolution title
- <p class="doc-center"> — company details
- <p class="doc-section"> — section headers
- <p class="doc-line"> — body text
- <p class="doc-resolution"> — <strong>RESOLVED THAT</strong> operative text
- <p class="doc-further"> — <strong>FURTHER RESOLVED THAT</strong> authorisation

LEGAL RULES:
- MGT-7: Section 92 annual return — 60 days from AGM
- AOC-4: Section 137 financial statements — 30 days from AGM
- DIR-12: Section 170 director changes — 30 days from change
- INC-22: Section 12 registered office
- PAS-3: Section 42/62 share allotment — 15 days
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
      user_plan = 'free',
      special_instructions = '',
      client_id,
      pdf_template,
    } = body

    // ── RATE LIMITING — monthly limit per plan ────────────────────────
    if (!isAdmin) {
      const monthLimit = PLAN_LIMITS[user_plan] ?? PLAN_LIMITS.free

      // Count documents generated this calendar month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('generation_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      if ((count ?? 0) >= monthLimit) {
        return NextResponse.json(
          {
            error: `Monthly limit reached. Your ${user_plan} plan includes ${monthLimit} documents per month. Upgrade to generate more.`,
            limit_reached: true,
            monthly_count: count,
            monthly_limit: monthLimit,
          },
          { status: 429 }
        )
      }
    }

    const formattedDate = meeting_date
      ? new Date(meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : meeting_date

    // Build agenda context — combine library items AND free text
    const _parts: string[] = []
    if (agenda_types && agenda_types.length > 0) {
      const _lib = agenda_types
        .filter((key: string) => AGENDA_LIBRARY[key])
        .map((key: string, idx: number) => {
          const item = AGENDA_LIBRARY[key]
          return `${idx + 1}. ${item.label} — under ${item.sections.join(', ')}`
        })
        .join('\n')
      if (_lib) _parts.push(_lib)
    }
    if (agenda_items && agenda_items.trim()) {
      _parts.push('Additional agenda/decisions from CS:\n' + agenda_items.trim())
    }
    const agendaContext = _parts.join('\n\n') || 'No specific agenda provided'

    // ── CACHE CHECK — return cached doc if same inputs ────────────────
    const inputHash = createHash('sha256')
      .update(`${user.id}-${cin}-${meeting_date}-${doc_type}-${agenda_types.sort().join('-')}-${agenda_items || ''}`)
      .digest('hex')

    const { data: cached } = await supabase
      .from('documents')
      .select('content')
      .eq('user_id', user.id)
      .eq('input_hash', inputHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached?.content) {
      console.log('Cache hit — returning cached document')
      return NextResponse.json({ content: cached.content, cached: true })
    }

    // ── SMART TOKEN LIMIT — scale with complexity ─────────────────────
    const agendaCount = agenda_types.length || 1
    const maxTokens = Math.min(
      1800 + (agendaCount * 400),  // base + 400 per agenda item
      4000                          // hard cap
    )

    // ── MODEL SELECTION — Haiku for simple, Sonnet for complex ────────
    const model = MODEL_BY_TYPE[doc_type] || 'claude-sonnet-4-6'

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

DIRECTORS PRESENT (use these exact names and DINs — never leave this as a placeholder):
${directors_present || 'No director details provided'}

AGENDA ITEMS:
${agendaContext}

RULES:
- Fill ALL sections with actual data — never write "[To be populated]" or similar
- Keep each resolution concise — RESOLVED THAT text 2-3 lines only
- Omit any section that has no data (e.g. no directors on leave — omit that section)
- Document MUST be complete — do not cut off
- Output clean HTML only using the specified CSS classes
${special_instructions ? '\nSPECIAL INSTRUCTIONS (incorporate these exactly as specified by the CS):\n' + special_instructions : ''}`

    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: pdf_template?.custom_instructions
        ? (SYSTEM_PROMPTS[doc_type] || SYSTEM_PROMPTS.board_minutes) + '\n\nCUSTOM FORMAT INSTRUCTIONS FROM CLIENT TEMPLATE:\n' + pdf_template.custom_instructions
        : (SYSTEM_PROMPTS[doc_type] || SYSTEM_PROMPTS.board_minutes),
      messages: [{ role: 'user', content: userPrompt }]
    })

    let content = (message.content[0] as any).text || ''
    content = content.replace(/```html|```/g, '').trim()

    // Log usage for rate limiting
    await supabase.from('generation_usage').insert({
      user_id: user.id,
      doc_type,
      model_used: model,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
    })

    return NextResponse.json({
      content,
      cached: false,
      model_used: model,
      tokens: message.usage,
    })

  } catch (error: any) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
