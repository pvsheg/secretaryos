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

const AGENDA_SYSTEM_PROMPT = `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate a formal Board Meeting Agenda under the Companies Act 2013 and Secretarial Standard SS-1.

CRITICAL RULES:
1. NEVER leave placeholder text — use only the actual data provided
2. Complete document — never cut off
3. Number agenda items sequentially
4. For each item cite the relevant statutory section

OUTPUT FORMAT — use ONLY these exact HTML classes, no markdown:
- <p class="doc-title-main"> — title: AGENDA FOR THE MEETING OF THE BOARD OF DIRECTORS
- <p class="doc-center"> — company name, CIN, registered office
- <p class="doc-section"> — section headers (e.g. "AGENDA ITEMS")
- <p class="doc-line"> — meeting details and body text
- <p class="doc-resolution"> — each numbered agenda item, e.g. "1. [Item label] — [Sections]"

DOCUMENT STRUCTURE:
1. Title
2. Company name, CIN, Registered Office
3. Meeting details (date, time, venue)
4. Numbered agenda items with statutory references
5. Note: "Any other business with the permission of the Chair"`

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
          // key lookup
          const lib = AGENDA_LIBRARY[item]
          if (lib) {
            agendaLines.push(`${idx + 1}. ${lib.label} — under ${lib.sections.join(', ')}`)
          } else {
            agendaLines.push(`${idx + 1}. ${item}`)
          }
        } else if (item && item.key) {
          const lib = AGENDA_LIBRARY[item.key]
          if (lib) {
            agendaLines.push(`${idx + 1}. ${lib.label} — under ${lib.sections.join(', ')}${item.notes ? ` (Note: ${item.notes})` : ''}`)
          }
        } else if (item && item.label) {
          agendaLines.push(`${idx + 1}. ${item.label}${item.sections ? ` — under ${item.sections.join(', ')}` : ''}${item.notes ? ` (Note: ${item.notes})` : ''}`)
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

MEETING DETAILS:
Date: ${formatDate(meeting.meeting_date)}
Time: ${formatTime(meeting.meeting_time)}
Venue: ${venue}

AGENDA ITEMS:
${agendaLines.join('\n') || 'To transact general business of the company'}

${signatoryName ? `SIGNATORY:\nName: ${signatoryName}\nDesignation: ${signatoryDesignation}\nDIN: ${signatoryDin}` : ''}
${special_instructions ? `\nSPECIAL INSTRUCTIONS:\n${special_instructions}` : ''}

Generate a complete, formal agenda. Output clean HTML only using the specified CSS classes.`

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
