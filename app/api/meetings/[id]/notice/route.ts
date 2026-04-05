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

const NOTICE_SYSTEM_PROMPT = `You are SecretaryOS, an expert AI assistant for Indian Company Secretaries. Generate a formal Board Meeting Notice under the Companies Act 2013 and Secretarial Standard SS-1.

CRITICAL RULES:
1. NEVER leave placeholder text — use only the actual data provided
2. Complete document — never cut off
3. Include company name, CIN, registered office, notice date, meeting date/time/venue, and the name and designation of the signing director

OUTPUT FORMAT — use ONLY these exact HTML classes, no markdown:
- <p class="doc-title-main"> — main title, centered, bold, uppercase
- <p class="doc-center"> — company details (name, CIN, address), centered
- <p class="doc-section"> — section headers
- <p class="doc-line"> — body text paragraphs
- <div class="doc-sig">...</div> — signature block (director name, designation, DIN)

DOCUMENT STRUCTURE:
1. Title: NOTICE OF MEETING OF THE BOARD OF DIRECTORS
2. Company name, CIN, Registered Office
3. Notice date
4. Body: Notice is hereby given under Section 173(3) of the Companies Act, 2013 read with SS-1 that a meeting of the Board of Directors will be held on [date] at [time] at [venue]
5. Agenda items if provided, else state "to transact such other business as may be brought before the Board"
6. Signature block: For [Company Name], [Director Name], [Designation], DIN: [DIN]`

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { signatory_director_id, date_of_notice } = body

    if (!signatory_director_id || !date_of_notice) {
      return NextResponse.json({ error: 'signatory_director_id and date_of_notice are required' }, { status: 400 })
    }

    // Fetch meeting with client data
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('*, clients(id, company_name, cin, registered_office)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (meetingErr || !meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    // Fetch signatory director
    const { data: director, error: dirErr } = await supabase
      .from('directors')
      .select('id, name, din, designation')
      .eq('id', signatory_director_id)
      .eq('client_id', (meeting.clients as any).id)
      .single()

    if (dirErr || !director) return NextResponse.json({ error: 'Director not found' }, { status: 404 })

    const client = meeting.clients as any
    const venue = meeting.venue_type === 'registered_office'
      ? client.registered_office
      : meeting.venue_type === 'video'
        ? 'Video Conference'
        : meeting.venue_address || client.registered_office

    const userPrompt = `Generate a formal Board Meeting Notice with the following details:

COMPANY DETAILS:
Company Name: ${client.company_name}
CIN: ${client.cin}
Registered Office: ${client.registered_office}

NOTICE DATE: ${formatDate(date_of_notice)}

MEETING DETAILS:
Date: ${formatDate(meeting.meeting_date)}
Time: ${formatTime(meeting.meeting_time)}
Venue: ${venue}
Meeting Type: ${meeting.meeting_type.toUpperCase()} Meeting of the Board of Directors

SIGNATORY:
Name: ${director.name}
Designation: ${director.designation}
DIN: ${director.din}

Generate a complete, formal notice. Output clean HTML only using the specified CSS classes.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: NOTICE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let content = (message.content[0] as any).text || ''
    content = content.replace(/```html|```/g, '').trim()

    // Delete any existing notice for this meeting
    await supabase
      .from('documents')
      .delete()
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'notice')
      .eq('user_id', user.id)

    // Save to documents
    const title = `${client.company_name} — Board Meeting Notice — ${meeting.meeting_date}`
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        client_id: client.id,
        meeting_id: params.id,
        doc_subtype: 'notice',
        type: 'board_notice',
        title,
        content,
        signatory_director_id,
        metadata: {
          meeting_date: meeting.meeting_date,
          meeting_time: meeting.meeting_time,
          venue,
          date_of_notice,
          signatory_name: director.name,
          signatory_din: director.din,
          signatory_designation: director.designation,
        },
      })
      .select()
      .single()

    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
    return NextResponse.json({ document: doc, content }, { status: 201 })
  } catch (err: any) {
    console.error('Notice generation error:', err)
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
      .eq('doc_subtype', 'notice')
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
