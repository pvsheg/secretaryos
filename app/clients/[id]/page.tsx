import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const [{ data: client }, { data: documents }] = await Promise.all([
    supabase.from('clients').select('*, directors(*)').eq('id', params.id).single(),
    supabase.from('documents').select('*').eq('client_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  const directors = (client as any).directors || []

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/clients" className="hover:text-ink">Clients</Link>
          <span>/</span>
          <span className="text-ink">{client.company_name}</span>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-ink rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {client.company_name.charAt(0)}
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-ink">{client.company_name}</h1>
              <p className="text-slate-500 text-sm">CIN: {client.cin}</p>
            </div>
          </div>
          <Link href={`/generate?client=${client.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
            ✦ Generate document
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* COMPANY DETAILS */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Company details</p>
              <div className="space-y-3">
                {[
                  { label: 'Registered office', val: client.registered_office },
                  { label: 'Financial year end', val: client.financial_year_end },
                  { label: 'Authorised capital', val: client.authorised_capital || 'Not set' },
                  { label: 'Paid-up capital', val: client.paid_up_capital || 'Not set' },
                  { label: 'Documents generated', val: documents?.length || 0 },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm text-ink font-medium">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* DIRECTORS */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Directors ({directors.length})
              </p>
              {directors.length === 0 ? (
                <p className="text-sm text-slate-400">No directors on record</p>
              ) : (
                <div className="space-y-3">
                  {directors.map((dir: any) => (
                    <div key={dir.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 mt-0.5">
                        {dir.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{dir.name}</p>
                        <p className="text-xs text-slate-500">{dir.designation}</p>
                        <p className="text-xs text-slate-400 font-mono">DIN: {dir.din}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DOCUMENTS */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink">Documents</h2>
              <Link href={`/generate?client=${client.id}`} className="text-xs text-slate-500 hover:text-ink">Generate new →</Link>
            </div>

            {!documents?.length ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <div className="text-3xl mb-2">📄</div>
                <p className="font-semibold text-ink mb-1 text-sm">No documents yet for this client</p>
                <p className="text-xs text-slate-500 mb-4">Generate your first board minutes document</p>
                <Link href={`/generate?client=${client.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white text-xs font-medium rounded-lg">
                  Generate now →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}
                    className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                      {doc.type === 'board_minutes' ? '📋' : doc.type === 'agm_notice' ? '📢' : '🗂️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{doc.type?.replace('_', ' ')}</p>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    <span className="text-slate-300">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
