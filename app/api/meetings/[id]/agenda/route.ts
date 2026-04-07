import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AGENDA_LIBRARY } from '@/lib/agenda-library'

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

const AGENDA_SYSTEM_PROMPT = `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate a formal Board Meeting Agenda exactly matching the format below.

CRITICAL RULES:
1. NEVER leave placeholder text — use only the actual data provided
2. Complete document — never cut off
3. Number agenda items with zero-padded 2-digit numbers: 01. 02. 03. etc.
4. Each agenda item has TWO parts: a bold numbered title line, then a plain description paragraph
5. If an item has DRAFTING INSTRUCTIONS, incorporate those details into the description paragraph

OUTPUT FORMAT — use ONLY these exact HTML classes, no markdown:
- <p class="doc-title-main"> — company name, ALL CAPS
- <p class="doc-center"> — (CIN: ...) on first line, then Registered Office, then Email (use <br> between)
- <p class="doc-line"> — all body text including the meeting title line and each agenda item title/description
- <p class="doc-section"> — section header: AGENDA ITEMS
- <div class="doc-notice-sig"> — signature block at end

DOCUMENT STRUCTURE (follow exactly):
1. <p class="doc-title-main">COMPANY NAME</p>
2. <p class="doc-center">(CIN: ...)<br>Registered Office: ...<br>Email: ...</p>
3. <p class="doc-line"><strong>AGENDA FOR THE [Nth] BOARD MEETING OF [COMPANY NAME] TO BE HELD ON [DAY, DATE], AT [TIME] AT [VENUE]-</strong></p>
4. <p class="doc-section">AGENDA ITEMS</p>
5. For each item:
   <p class="doc-line"><strong>01. [Item Title]</strong></p>
   <p class="doc-line">[One paragraph description of what this item covers, incorporating any DRAFTING INSTRUCTIONS]</p>
6. <p class="doc-line" style="margin-top:20px;">With best regards,</p>
   <p class="doc-line">For <strong>[Company Name]</strong></p>
   <div class="doc-notice-sig" style="margin-top:40px;"><div><div class="doc-sig-line"></div><p><strong>[Director Name]</strong></p><p>[Designation]</p><p>DIN: [DIN]</p></div></div>

SIGNATORY: If no signatory is provided, use "Authorised Signatory" as the name with blank DIN.`

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { agenda_items = [], special_instructions = '' } = body

    // Fetch meeting with client
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('*, clients(id, company_name, cin, registered_office)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (meetingErr || !meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    // Try to get signatory from notice document
    const { data: noticeDoc } = await supabase
      .from('documents')
      .select('signatory_director_id, metadata')
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'notice')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const client = meeting.clients as any
    const venue = meeting.venue_type === 'registered_office'
      ? client.registered_office
      : meeting.venue_type === 'video'
        ? 'Video Conference'
        : meeting.venue_address || client.registered_office

    // Build agenda context from library items
    const agendaLines: string[] = []
    if (Array.isArray(agenda_items)) {
      agenda_items.forEach((item: any, idx: number) => {
        if (typeof item === 'string') {
          const lib = AGENDA_LIBRARY[item]
          if (lib) {
            agendaLines.push(`${idx + 1}. ${lib.label} — under ${lib.sections.join(', ')}`)
          } else {
            agendaLines.push(`${idx + 1}. ${item}`)
          }
        } else if (item && item.key) {
          const lib = AGENDA_LIBRARY[item.key]
          if (lib) {
            const noteLine = item.notes ? `\n   DRAFTING INSTRUCTIONS: ${item.notes}` : ''
            agendaLines.push(`${idx + 1}. ${lib.label} — under ${lib.sections.join(', ')}${noteLine}`)
          }
        } else if (item && item.label) {
          const sections = Array.isArray(item.sections) ? item.sections : []
          const noteLine = item.notes ? `\n   DRAFTING INSTRUCTIONS: ${item.notes}` : ''
          agendaLines.push(`${idx + 1}. ${item.label}${sections.length ? ` — under ${sections.join(', ')}` : ''}${noteLine}`)
        }
      })
    }

    const signatoryMeta = noticeDoc?.metadata as any
    const signatoryName = signatoryMeta?.signatory_name || ''
    const signatoryDesignation = signatoryMeta?.signatory_designation || ''
    const signatoryDin = signatoryMeta?.signatory_din || ''

    const userPrompt = `Generate a formal Board Meeting Agenda with the following details:

COMPANY DETAILS:
Company Name: ${client.company_name}
CIN: ${client.cin}
Registered Office: ${client.registered_office}
Email: ${(client as any).email || ''}

MEETING DETAILS:
Meeting Number (ordinal): ${signatoryMeta?.meeting_number ? `${signatoryMeta.meeting_number}` : '1'}
Date: ${formatDate(meeting.meeting_date)}
Time: ${formatTime(meeting.meeting_time)}
Venue: ${venue}

AGENDA ITEMS (in this exact order):
${agendaLines.join('\n') || 'To transact general business of the company'}

SIGNATORY:
Name: ${signatoryName || 'Authorised Signatory'}
Designation: ${signatoryDesignation || 'Director'}
DIN: ${signatoryDin || ''}

${special_instructions ? `SPECIAL INSTRUCTIONS:\n${special_instructions}` : ''}

Output clean HTML only using the specified CSS classes. Follow the document structure exactly.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: AGENDA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let content = (message.content[0] as any).text || ''
    content = content.replace(/```html|```/g, '').trim()

    // Delete existing agenda for this meeting
    await supabase
      .from('documents')
      .delete()
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'agenda')
      .eq('user_id', user.id)

    const title = `${client.company_name} — Board Meeting Agenda — ${meeting.meeting_date}`
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        client_id: client.id,
        meeting_id: params.id,
        doc_subtype: 'agenda',
        type: 'board_agenda',
        title,
        content,
        metadata: {
          meeting_date: meeting.meeting_date,
          meeting_time: meeting.meeting_time,
          venue,
          agenda_items,
          special_instructions,
          item_count: agendaLines.length,
        },
      })
      .select()
      .single()

    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
    return NextResponse.json({ document: doc, content }, { status: 201 })
  } catch (err: any) {
    console.error('Agenda generation error:', err)
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
      .eq('doc_subtype', 'agenda')
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
