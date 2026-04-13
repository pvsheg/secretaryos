import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// "5" → "5th", "1" → "1st", etc.
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// "2024-04-05" → "5th April 2024"
function formatNoticeDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDate()
  const month = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' })
  const year = d.getUTCFullYear()
  return `${ordinal(day)} ${month} ${year}`
}

// "2024-04-05" → "Friday, 5th April 2024"
function formatMeetingDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = days[d.getUTCDay()]
  return `${dayName}, ${formatNoticeDate(dateStr)}`
}

// "11:00" → "11:00 AM"
function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

// "2024-04-05" → { short: "2024-25", long: "2024-2025" }
function financialYear(dateStr: string): { short: string; long: string } {
  const d = new Date(dateStr + 'T00:00:00Z')
  const month = d.getUTCMonth() + 1 // 1-12
  const year = d.getUTCFullYear()
  const fyStart = month >= 4 ? year : year - 1
  const fyEnd = fyStart + 1
  return {
    short: `${fyStart}-${String(fyEnd).slice(2)}`,
    long: `${fyStart}-${fyEnd}`,
  }
}

function generateNoticeHTML(data: {
  companyName: string
  cin: string
  registeredOffice: string
  email: string
  dateOfNotice: string
  meetingDate: string
  meetingTime: string
  venue: string
  meetingNumber: number
  directorName: string
  directorDesignation: string
  directorDin: string
  subject: string
  specialInstructions?: string
}): string {
  const {
    companyName, cin, registeredOffice, email,
    dateOfNotice, meetingDate, meetingTime, venue,
    meetingNumber, directorName, directorDesignation, directorDin,
    subject, specialInstructions,
  } = data

  const fy = financialYear(meetingDate)
  const mtgOrdinal = ordinal(meetingNumber)

  return `
<p class="doc-title-main">${companyName.toUpperCase()}</p>
<p class="doc-center">(CIN: ${cin})<br>Registered Office: ${registeredOffice}</p>

<p class="doc-line" style="margin-top:16px;">Date: ${formatNoticeDate(dateOfNotice)}</p>
<p class="doc-center" style="margin-top:6px;">Tel: __________ &nbsp;|&nbsp; Email: ${email || '__________'} &nbsp;|&nbsp; Website: __________</p>

<p class="doc-line" style="margin-top:18px;">To,<br>The Board of Directors<br><strong>${companyName}</strong><br>${registeredOffice}</p>

<p class="doc-line" style="margin-top:14px;"><strong>Sub: ${subject}</strong></p>

<p class="doc-line" style="margin-top:14px;">Dear Directors,</p>

<p class="doc-line" style="margin-top:10px;">Notice is hereby given that the ${mtgOrdinal} Meeting of the Board of Directors of <strong>${companyName}</strong> (the "Company") for the financial year ${fy.long} is proposed to be held as per the following details:</p>

<p class="doc-line" style="margin-top:12px;"><strong>Day and Date:</strong>&nbsp; ${formatMeetingDate(meetingDate)}</p>
<p class="doc-line"><strong>Time:</strong>&nbsp; ${formatTime(meetingTime)}</p>
<p class="doc-line"><strong>Venue:</strong>&nbsp; ${venue}</p>

<p class="doc-line" style="margin-top:14px;">The Agenda along with notes to the agenda for the Board Meeting is attached herewith for your reference as Annexure I.</p>

<p class="doc-line" style="margin-top:10px;">Each Director is requested to inform if they have any conflict of interest before participating in the aforesaid meeting and making decisions regarding the business of the Company.</p>

<p class="doc-line" style="margin-top:10px;">Further, if any Director of the Company is unable to attend the ensuing Board Meeting, they may inform the Board before the date of the meeting by sending a signed leave of absence application.</p>

<p class="doc-line" style="margin-top:10px;">Kindly make it convenient to attend the Meeting. Please acknowledge receipt of this notice.</p>
${specialInstructions ? `\n<p class="doc-line" style="margin-top:10px;">${specialInstructions}</p>` : ''}
<p class="doc-line" style="margin-top:20px;">With best regards,</p>
<p class="doc-line">For <strong>${companyName}</strong></p>

<div class="doc-notice-sig" style="margin-top:40px;">
  <div>
    <div class="doc-sig-line"></div>
    <p><strong>${directorName}</strong></p>
    <p>${directorDesignation}</p>
    <p>DIN: ${directorDin}</p>
    <p>Place: __________</p>
  </div>
</div>
`.trim()
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { signatory_director_id, date_of_notice, meeting_number, subject, venue_override, special_instructions } = body

    if (!date_of_notice || !meeting_number || !subject) {
      return NextResponse.json(
        { error: 'date_of_notice, meeting_number and subject are required' },
        { status: 400 }
      )
    }

    // Fetch meeting with client data (including email)
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('*, clients(id, company_name, cin, registered_office, company_status, email)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (meetingErr || !meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    const client = meeting.clients as any

    // Fetch signatory director (optional)
    let director: { name: string; din: string; designation: string } | null = null
    if (signatory_director_id) {
      const { data: dir, error: dirErr } = await supabase
        .from('directors')
        .select('id, name, din, designation, email')
        .eq('id', signatory_director_id)
        .eq('client_id', client.id)
        .single()
      if (dirErr || !dir) return NextResponse.json({ error: 'Director not found' }, { status: 404 })
      director = dir
    }

    const venue = venue_override && venue_override.trim()
      ? venue_override.trim()
      : meeting.venue_type === 'registered_office'
        ? `Registered Office of the Company at ${client.registered_office}`
        : meeting.venue_type === 'video'
          ? 'Video Conference'
          : meeting.venue_address || client.registered_office

    const content = generateNoticeHTML({
      companyName: client.company_name,
      cin: client.cin,
      registeredOffice: client.registered_office,
      email: client.email || '',
      dateOfNotice: date_of_notice,
      meetingDate: meeting.meeting_date,
      meetingTime: meeting.meeting_time,
      venue,
      meetingNumber: Number(meeting_number),
      directorName: director?.name || '',
      directorDesignation: director?.designation || '',
      directorDin: director?.din || '',
      subject,
      specialInstructions: special_instructions,
    })

    // Delete existing notice for this meeting
    await supabase
      .from('documents')
      .delete()
      .eq('meeting_id', params.id)
      .eq('doc_subtype', 'notice')
      .eq('user_id', user.id)

    const fy = financialYear(meeting.meeting_date)
    const title = `${client.company_name} — ${ordinal(Number(meeting_number))} Board Meeting Notice (${fy.short})`

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
        ...(signatory_director_id ? { signatory_director_id } : {}),
        metadata: {
          meeting_date: meeting.meeting_date,
          meeting_time: meeting.meeting_time,
          venue,
          date_of_notice,
          meeting_number: Number(meeting_number),
          financial_year: fy.short,
          ...(director ? {
            signatory_name: director.name,
            signatory_din: director.din,
            signatory_designation: director.designation,
          } : {}),
          subject,
          ...(special_instructions ? { special_instructions } : {}),
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
