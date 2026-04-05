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

const MINUTES_SYSTEM_PROMPT = `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate formal Board Meeting Minutes exactly matching the format of a real CS-drafted Indian board meeting minute.

CRITICAL RULES:
1. NEVER leave placeholder text — use only the actual data provided
2. Complete document — never cut off
3. Number items with zero-padded 2-digit numbers: 01. 02. 03. etc.
4. Items 01, 02, 03 are always procedural (Chairperson, Quorum, Leave of Absence) — they come BEFORE the agenda items which start at 04
5. Every agenda item must have a RESOLVED THAT block
6. Resolution text goes inside a <p class="doc-resolution"> tag
7. Use "RESOLVED FURTHER THAT" in <p class="doc-further"> for additional clauses
8. If RESOLUTION NOTES are provided for an item, incorporate those details into the RESOLVED THAT text

OUTPUT FORMAT — use ONLY these exact HTML classes:
- <p class="doc-title-main"> — main title (the "MINUTE OF THE..." heading), ALL CAPS
- <p class="doc-section"> — section headers (PRESENT)
- <p class="doc-line"> — all body text paragraphs, present list, item titles, context paragraphs
- <p class="doc-resolution"> — RESOLVED THAT text (start with <strong>RESOLVED THAT</strong>)
- <p class="doc-further"> — RESOLVED FURTHER THAT text (start with <strong>RESOLVED FURTHER THAT</strong>)

DOCUMENT STRUCTURE (follow exactly):

1. Title:
<p class="doc-title-main">MINUTE OF THE [Nth] BOARD MEETING OF THE BOARD OF DIRECTORS OF [COMPANY NAME] HELD ON [DAY, DATE], AT [TIME] AT [VENUE]-</p>

2. Present section:
<p class="doc-section">PRESENT</p>
<p class="doc-line">[Director Name],&nbsp;&nbsp;&nbsp;[Designation]</p>
(one line per director)

3. Times:
<p class="doc-line"><strong>Time of Commencement of meeting</strong>&nbsp;&nbsp;&nbsp; [time]</p>
<p class="doc-line"><strong>Time of Conclusion of Meeting</strong>&nbsp;&nbsp;&nbsp; [time or blank line]</p>

4. PROCEDURAL ITEMS (always items 01, 02, 03):

<p class="doc-line"><strong>01. Chairperson:</strong></p>
<p class="doc-line">[Chairman Name] was unanimously elected as the Chairperson of the meeting.</p>

<p class="doc-line"><strong>02. Quorum:</strong></p>
<p class="doc-line">The Chairperson confirmed that the quorum was present, and the meeting commenced at [time].</p>

<p class="doc-line"><strong>03. Grant of Leave of Absence:</strong></p>
<p class="doc-line">[All Directors were present so no Leave of Absence was granted. / OR list who was absent]</p>

5. AGENDA ITEMS (starting from 04):
For each agenda item:
<p class="doc-line"><strong>[NN]. [Item Title]:</strong></p>
<p class="doc-line">[One sentence context: "The matter of X was placed before the Board."]</p>
<p class="doc-line">The Board, after due discussion, passed the following resolution unanimously:</p>
<p class="doc-resolution"><strong>RESOLVED THAT</strong> [operative resolution text incorporating any resolution notes provided].</p>
(Add <p class="doc-further"><strong>RESOLVED FURTHER THAT</strong> ... only when genuinely needed)

6. Second-to-last item:
<p class="doc-line"><strong>[NN]. Any Other Business with the Permission of the Chair:</strong></p>
<p class="doc-line">No additional matters were raised.</p>

7. Last item:
<p class="doc-line"><strong>[NN]. Vote of Thanks:</strong></p>
<p class="doc-line">The Chairperson expressed gratitude to the Directors for their active participation and declared the meeting concluded at [conclusion time].</p>

8. Signature:
<p class="doc-line" style="margin-top:20px;">For <strong>[Company Name]</strong></p>
<p class="doc-line" style="margin-top:40px;"><strong>[Chairman Name]</strong><br>Chairperson of the Meeting</p>
<p class="doc-line" style="margin-top:16px;">Place: _______________</p>
<p class="doc-line">Date: _______________</p>
<p class="doc-line">Date of Signing: _______________</p>
<p class="doc-line">Date of Entering into Minutes Book: _______________</p>`

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { directors_present_ids = [], chairman_director_id, place_of_signing, resolutions = [], time_of_conclusion = '' } = body

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

    // Fetch meeting number from notice doc
    const { data: noticeDocForNum } = await supabase
      .from('documents')
      .select('metadata')
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'notice')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    const meetingNumber = (noticeDocForNum?.metadata as any)?.meeting_number || 1

    const directorsStr = presentDirectors
      .map((d: any) => `${d.name} (DIN: ${d.din}), ${d.designation}`)
      .join('\n')

    const quorumTotal = allDirectors.length
    const quorumNeeded = Math.max(2, Math.ceil(quorumTotal / 3))
    const quorumNote = `${presentDirectors.length} out of ${quorumTotal} directors present (quorum: ${quorumNeeded} required)`

    const agendaLines = Array.isArray(agendaItemsRaw) && agendaItemsRaw.length > 0
      ? agendaItemsRaw.map((item: any, idx: number) => {
          const itemNum = String(idx + 4).padStart(2, '0') // agenda items start at 04 in minutes
          const resolutionNote = resolutions.find((r: any) => r.idx === idx)?.notes || item.notes || ''
          let line = ''
          if (typeof item === 'string') {
            line = `${itemNum}. ${item}`
          } else if (item.label) {
            line = `${itemNum}. ${item.label}${item.sections?.length ? ` — under ${item.sections.join(', ')}` : ''}`
          } else {
            line = `${itemNum}. Item ${idx + 1}`
          }
          if (resolutionNote) line += `\n   RESOLUTION NOTES: ${resolutionNote}`
          return line
        }).join('\n')
      : 'General business of the company'

    const userPrompt = `Generate complete board meeting minutes using the following details:

COMPANY DETAILS:
Company Name: ${client.company_name}
CIN: ${client.cin}
Registered Office: ${client.registered_office}

MEETING DETAILS:
Meeting Number (ordinal): ${meetingNumber}
Date: ${formatDate(meeting.meeting_date)}
Time: ${formatTime(meeting.meeting_time)}
Venue: ${venue}
Time of Conclusion: ${time_of_conclusion || '_______________'}
Place of Signing: ${signingPlace}

CHAIRMAN: ${chairman?.name || 'Director'} (DIN: ${chairman?.din || ''}), ${chairman?.designation || 'Director'}

DIRECTORS PRESENT (list every one exactly):
${directorsStr || 'No directors listed'}

QUORUM: ${quorumNote}

AGENDA ITEMS (items 04 onwards — 01/02/03 are always procedural):
${agendaLines}

Output clean HTML only using the specified CSS classes. Follow the document structure exactly.`

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
