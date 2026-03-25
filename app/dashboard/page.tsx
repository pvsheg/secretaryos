import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import type { Client, DocumentWithClient } from '@/types'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: clients },
    { data: recentDocuments },
    { count: totalDocuments },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('documents').select('*, clients(company_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
  ])

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there'
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <p className="text-slate-500 text-sm mb-1">{greeting},</p>
          <h1 className="font-serif text-4xl font-bold text-ink">{firstName} 👋</h1>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total clients', val: clients?.length || 0, icon: '🏢', color: 'bg-blue-50 border-blue-100' },
            { label: 'Documents generated', val: totalDocuments || 0, icon: '📄', color: 'bg-green-50 border-green-100' },
            { label: 'Hours saved (est.)', val: `${(((totalDocuments || 0) * 1.5)).toFixed(0)}h`, icon: '⏱️', color: 'bg-amber-50 border-amber-100' },
            { label: 'Compliance score', val: '100%', icon: '✅', color: 'bg-emerald-50 border-emerald-100' },
          ].map(s => (
            <div key={s.label} className={`border rounded-2xl p-5 ${s.color}`}>
              <div className="text-2xl mb-3">{s.icon}</div>
              <div className="text-3xl font-bold text-ink font-serif mb-1">{s.val}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* QUICK ACTIONS */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Quick actions</h2>
            <div className="space-y-3">
              <Link href="/generate" className="flex items-center gap-4 p-4 bg-ink text-white rounded-2xl hover:bg-slate-800 transition-colors group">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg">✦</div>
                <div>
                  <div className="font-semibold text-sm">Generate document</div>
                  <div className="text-xs text-slate-400">Board minutes, AGM, ROC filings</div>
                </div>
              </Link>
              <Link href="/clients/new" className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">➕</div>
                <div>
                  <div className="font-semibold text-sm text-ink">Add client</div>
                  <div className="text-xs text-slate-500">Store company profile once</div>
                </div>
              </Link>
              <Link href="/documents" className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">📁</div>
                <div>
                  <div className="font-semibold text-sm text-ink">View documents</div>
                  <div className="text-xs text-slate-500">All generated documents</div>
                </div>
              </Link>
            </div>
          </div>

          {/* RECENT DOCUMENTS */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recent documents</h2>
              <Link href="/documents" className="text-xs text-slate-500 hover:text-ink">View all →</Link>
            </div>

            {!recentDocuments?.length ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="font-semibold text-ink mb-1">No documents yet</p>
                <p className="text-sm text-slate-500 mb-4">Generate your first board minutes document</p>
                <Link href="/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg">
                  Generate now →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentDocuments as DocumentWithClient[]).map(doc => (
                  <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                    <div className="w-10 h-10 bg-gold-pale rounded-xl flex items-center justify-center text-lg flex-shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">{doc.title}</div>
                      <div className="text-xs text-slate-500">{doc.clients?.company_name}</div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EMPTY STATE — no clients */}
        {!clients?.length && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="text-2xl">💡</div>
            <div>
              <p className="font-semibold text-amber-900 mb-1">Start by adding your first client</p>
              <p className="text-sm text-amber-700 mb-3">Store a client's company details once — CIN, directors, DINs — and every document auto-populates from there.</p>
              <Link href="/clients/new" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors">
                Add first client →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
