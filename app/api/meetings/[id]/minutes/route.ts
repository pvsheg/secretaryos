import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
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
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDate()
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
  const month = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' })
  const year = d.getUTCFullYear()
  return `${day}${suffix} day of ${month}, ${year}`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'P.M.' : 'A.M.'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

const MINUTES_SYSTEM_PROMPT = `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate legally precise, complete board meeting minutes under the Companies Act 2013 and Secretarial Standards.

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
- SS-1: Secretarial Standard on Board Meetings throughout`

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { directors_present_ids = [], chairman_director_id, place_of_signing } = body

    if (!chairman_director_id) {
      return NextResponse.json({ error: 'chairman_director_id is required' }, { status: 400 })
    }

    // Fetch meeting with client and directors
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('*, clients(id, company_name, cin, registered_office, directors(id, name, din, designation))')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (meetingErr || !meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    const client = meeting.clients as any
    const allDirectors: any[] = client.directors || []

    // Filter to directors present
    const presentDirectors = directors_present_ids.length > 0
      ? allDirectors.filter((d: any) => directors_present_ids.includes(d.id))
      : allDirectors

    const chairman = allDirectors.find((d: any) => d.id === chairman_director_id) || presentDirectors[0]

    const venue = meeting.venue_type === 'registered_office'
      ? client.registered_office
      : meeting.venue_type === 'video'
        ? 'Video Conference'
        : meeting.venue_address || client.registered_office

    const signingPlace = place_of_signing || (client.registered_office?.split(',').slice(-2, -1)[0]?.trim() || client.registered_office)

    // Fetch agenda items from agenda document
    const { data: agendaDoc } = await supabase
      .from('documents')
      .select('metadata')
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'agenda')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const agendaMeta = agendaDoc?.metadata as any
    const agendaItemsRaw = agendaMeta?.agenda_items || []

    const directorsStr = presentDirectors
      .map((d: any) => `${d.name} (DIN: ${d.din}), ${d.designation}`)
      .join('\n')

    const quorumTotal = allDirectors.length
    const quorumNeeded = Math.max(2, Math.ceil(quorumTotal / 3))
    const quorumNote = `${presentDirectors.length} out of ${quorumTotal} directors present (quorum: ${quorumNeeded} required)`

    const agendaLines = Array.isArray(agendaItemsRaw) && agendaItemsRaw.length > 0
      ? agendaItemsRaw.map((item: any, idx: number) => {
          if (typeof item === 'string') return `${idx + 1}. ${item}`
          if (item.label) return `${idx + 1}. ${item.label}${item.sections ? ` — ${item.sections.join(', ')}` : ''}`
          return `${idx + 1}. ${item}`
        }).join('\n')
      : 'General business of the company'

    const userPrompt = `Generate complete, legally precise board meeting minutes using the following details:

COMPANY DETAILS:
Company Name: ${client.company_name}
CIN: ${client.cin}
Company Class: Private Limited
Registered Office: ${client.registered_office}

MEETING DETAILS:
Date: ${formatDate(meeting.meeting_date)}
Time: ${formatTime(meeting.meeting_time)}
Venue: ${venue}
Place of signing: ${signingPlace}

CHAIRMAN: ${chairman?.name || 'Director'} (DIN: ${chairman?.din || 'N/A'}), ${chairman?.designation || 'Director'}

DIRECTORS PRESENT (use these exact names and DINs — never leave as placeholder):
${directorsStr || 'No directors listed'}

QUORUM: ${quorumNote}

AGENDA ITEMS:
${agendaLines}

RULES:
- Fill ALL sections with actual data — never write "[To be populated]" or similar
- Keep each resolution concise — RESOLVED THAT text 2-3 lines only
- Omit any section that has no data
- Document MUST be complete — do not cut off
- Output clean HTML only using the specified CSS classes`

    const agendaCount = Array.isArray(agendaItemsRaw) ? agendaItemsRaw.length : 1
    const maxTokens = Math.min(1800 + agendaCount * 400, 4000)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: MINUTES_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let content = (message.content[0] as any).text || ''
    content = content.replace(/```html|```/g, '').trim()

    // Delete existing minutes for this meeting
    await supabase
      .from('documents')
      .delete()
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'minutes')
      .eq('user_id', user.id)

    const title = `${client.company_name} — Board Meeting Minutes — ${meeting.meeting_date}`
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        client_id: client.id,
        meeting_id: params.id,
        doc_subtype: 'minutes',
        type: 'board_minutes',
        title,
        content,
        metadata: {
          meeting_date: meeting.meeting_date,
          meeting_time: meeting.meeting_time,
          venue,
          place_of_signing: signingPlace,
          chairman_name: chairman?.name,
          chairman_din: chairman?.din,
          directors_present: presentDirectors.map((d: any) => ({ id: d.id, name: d.name, din: d.din, designation: d.designation })),
          directors_present_count: presentDirectors.length,
        },
      })
      .select()
      .single()

    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })

    // Also log generation usage
    await supabase.from('generation_usage').insert({
      user_id: user.id,
      client_id: client.id,
      company_name: client.company_name,
      doc_type: 'board_minutes',
      model_used: 'claude-sonnet-4-6',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      input_hash: null,
    })

    return NextResponse.json({ document: doc, content }, { status: 201 })
  } catch (err: any) {
    console.error('Minutes generation error:', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'minutes')
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
