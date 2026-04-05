import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const MEETING_TYPE_LABELS: Record<string, string> = {
  board: 'Board', agm: 'AGM', egm: 'EGM', custom: 'Custom',
}
const MEETING_TYPE_COLORS: Record<string, string> = {
  board: 'bg-blue-50 text-blue-700',
  agm: 'bg-purple-50 text-purple-700',
  egm: 'bg-orange-50 text-orange-700',
  custom: 'bg-slate-100 text-slate-600',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

function DocBadge({ label, present, color }: { label: string; present: boolean; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${present ? color : 'bg-slate-50 text-slate-400'}`}>
      {present ? '✓' : '–'} {label}
    </span>
  )
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const statusFilter = searchParams.status || 'all'

  let query = supabase
    .from('meetings')
    .select('*, clients(company_name, cin), documents(id, doc_subtype)')
    .eq('user_id', session.user.id)
    .order('meeting_date', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: meetings } = await query

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Meetings</h1>
            <p className="text-slate-500 text-sm mt-0.5">Board, AGM and EGM meeting management</p>
          </div>
          <Link
            href="/meetings/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            + Call a Meeting
          </Link>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 mb-5">
          {['all', 'scheduled', 'completed', 'cancelled'].map(s => (
            <Link
              key={s}
              href={s === 'all' ? '/meetings' : `/meetings?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-ink text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s === 'all' ? 'All meetings' : s}
            </Link>
          ))}
        </div>

        {/* Meetings list */}
        {!meetings?.length ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-semibold text-ink mb-1">No meetings yet</p>
            <p className="text-sm text-slate-500 mb-5">Schedule a board meeting to generate notices, agendas and minutes</p>
            <Link href="/meetings/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
              + Call a Meeting
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            {meetings.map((meeting: any, idx: number) => {
              const docs: any[] = meeting.documents || []
              const hasNotice = docs.some((d: any) => d.doc_subtype === 'notice')
              const hasAgenda = docs.some((d: any) => d.doc_subtype === 'agenda')
              const hasMinutes = docs.some((d: any) => d.doc_subtype === 'minutes')
              const client = meeting.clients as any

              const meetingDate = new Date(meeting.meeting_date + 'T00:00:00Z')
              const formattedDate = meetingDate.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
              })

              return (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${idx !== 0 ? 'border-t border-slate-50' : ''}`}
                >
                  {/* Date block */}
                  <div className="flex-shrink-0 w-12 text-center hidden sm:block">
                    <p className="font-serif text-xl font-bold text-ink leading-none">{meetingDate.getUTCDate()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{meetingDate.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}</p>
                    <p className="text-xs text-slate-400">{meetingDate.getUTCFullYear()}</p>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{client?.company_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${MEETING_TYPE_COLORS[meeting.meeting_type] || MEETING_TYPE_COLORS.board}`}>
                        {MEETING_TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[meeting.status] || STATUS_COLORS.scheduled}`}>
                        {meeting.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 sm:hidden mb-2">{formattedDate} · {meeting.meeting_time?.slice(0, 5)}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DocBadge label="Notice" present={hasNotice} color="bg-amber-50 text-amber-700" />
                      <DocBadge label="Agenda" present={hasAgenda} color="bg-purple-50 text-purple-700" />
                      <DocBadge label="Minutes" present={hasMinutes} color="bg-blue-50 text-blue-700" />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">{meeting.meeting_time?.slice(0, 5)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{client?.cin}</p>
                  </div>

                  <span className="text-slate-300 flex-shrink-0 hidden sm:block">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
