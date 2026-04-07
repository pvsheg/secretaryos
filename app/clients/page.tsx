import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const revalidate = 30

const STATUS_BADGE: Record<string, string> = {
  active:             'bg-green-100 text-green-700',
  'strike off':       'bg-red-100 text-red-600',
  dormant:            'bg-gray-100 text-gray-500',
  'under liquidation':'bg-orange-100 text-orange-700',
}

export default async function ClientsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, company_name, cin, registered_office, company_type, company_status,
      directors(count),
      meetings(count),
      documents(count)
    `)
    .eq('meetings.user_id', session.user.id)
    .eq('documents.user_id', session.user.id)
    .order('company_name')
    .limit(200)

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Client companies</h1>
            <p className="text-slate-500 text-sm mt-0.5">{clients?.length || 0} companies on record</p>
          </div>
          <Link href="/clients/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0">
            + Add client
          </Link>
        </div>

        {!clients?.length ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="font-semibold text-xl text-ink mb-2">No clients yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
              Add your first client company and store their CIN, directors, and DINs once — never type them again.
            </p>
            <Link href="/clients/new" className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors">
              Add first client →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center w-16">Directors</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center w-16">Meetings</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center w-16">Docs</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center w-28">Actions</span>
            </div>

            {/* Rows */}
            {clients.map((client: any, idx: number) => {
              const status = (client.company_status || 'active').toLowerCase()
              const dirCount  = client.directors?.[0]?.count  ?? 0
              const meetCount = client.meetings?.[0]?.count   ?? 0
              const docCount  = client.documents?.[0]?.count  ?? 0

              return (
                <div
                  key={client.id}
                  className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 gap-y-2 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors ${idx !== 0 ? 'border-t border-slate-50' : ''}`}
                >
                  {/* Company info */}
                  <Link href={`/clients/${client.id}`} className="flex items-center gap-3 min-w-0 group">
                    <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {client.company_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink group-hover:text-teal transition-colors truncate text-sm">
                        {client.company_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono">{client.cin}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-500'}`}>
                          {client.company_status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="hidden sm:flex flex-col items-center w-16">
                    <span className="font-semibold text-ink text-sm">{dirCount}</span>
                    <span className="text-xs text-slate-400">directors</span>
                  </div>
                  <div className="hidden sm:flex flex-col items-center w-16">
                    <span className="font-semibold text-ink text-sm">{meetCount}</span>
                    <span className="text-xs text-slate-400">meetings</span>
                  </div>
                  <div className="hidden sm:flex flex-col items-center w-16">
                    <span className="font-semibold text-ink text-sm">{docCount}</span>
                    <span className="text-xs text-slate-400">docs</span>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2 sm:w-28 justify-end sm:justify-center">
                    <Link
                      href={`/meetings/new?client=${client.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal text-white text-xs font-semibold rounded-lg hover:bg-teal-dark transition-colors whitespace-nowrap"
                      title="Call a meeting"
                    >
                      + Meeting
                    </Link>
                    <Link
                      href={`/clients/${client.id}`}
                      className="p-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
                      title="View client"
                    >
                      →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
