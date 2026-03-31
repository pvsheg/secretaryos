import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const TYPE_LABELS: Record<string, string> = {
  board_minutes: 'Board Minutes',
  agm_notice: 'AGM Notice',
  roc_filing: 'ROC Filing',
}
const TYPE_COLORS: Record<string, string> = {
  board_minutes: 'bg-blue-50 text-blue-700',
  agm_notice: 'bg-purple-50 text-purple-700',
  roc_filing: 'bg-emerald-50 text-emerald-700',
}

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const [{ data: clients }, { data: documents }, { data: subscription }, { data: usage }, { count: totalDocs }] = await Promise.all([
    supabase.from('clients').select('id, company_name').order('created_at', { ascending: false }),
    supabase.from('documents').select('id, title, type, created_at, clients(company_name)').order('created_at', { ascending: false }).limit(6),
    supabase.from('subscriptions').select('*').eq('user_id', session.user.id).single(),
    supabase.from('generation_usage').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = session.user.user_metadata?.full_name?.split(' ')[0]
    || session.user.email?.split('@')[0] || 'there'

  const plan = subscription?.plan || 'free'
  const planLimit = subscription?.monthly_doc_limit || 3
  const docsUsed = (usage as any)?.count || 0
  const docsLeft = Math.max(0, planLimit - docsUsed)
  const usagePct = Math.min(100, Math.round((docsUsed / planLimit) * 100))

  const planLabels: Record<string, string> = {
    free: 'Free', founding: 'Founding', starter: 'Starter',
    growth: 'Growth', firm: 'Firm',
  }
  const planBadge: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    founding: 'bg-amber-100 text-amber-700',
    starter: 'bg-blue-100 text-blue-700',
    growth: 'bg-teal/10 text-teal-dark',
    firm: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-20 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">

        {/* ── HEADER + PLAN CARD ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 fade-in-1">
          <div>
            <p className="text-gray-400 text-sm mb-0.5">{greeting},</p>
            <h1 className="font-serif text-3xl font-bold text-ink">{firstName}</h1>
          </div>

          {/* Plan card — compact, right-aligned */}
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm self-start">
            <div className="w-0.5 self-stretch bg-teal rounded-full"></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planBadge[plan] || planBadge.free}`}>
                  {planLabels[plan] || 'Free'} plan
                </span>
                <span className="text-xs text-gray-400">{docsUsed} / {planLimit} this month</span>
              </div>
              <div className="w-36 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-400' : 'bg-teal'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
            {plan === 'free' && (
              <Link href="/pricing" className="text-xs font-semibold text-teal hover:text-teal-dark transition-colors whitespace-nowrap ml-1">
                Upgrade →
              </Link>
            )}
          </div>
        </div>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card card-hover fade-in-2">
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">🏢</span>
              <span className="text-xs text-gray-400 font-medium">Total</span>
            </div>
            <div className="font-serif text-3xl font-semibold text-ink mb-1">{clients?.length || 0}</div>
            <div className="text-sm text-gray-500">Client companies</div>
          </div>
          <div className="card card-hover fade-in-3">
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">📄</span>
              <span className="text-xs text-gray-400 font-medium">All time</span>
            </div>
            <div className="font-serif text-3xl font-semibold text-ink mb-1">{totalDocs || 0}</div>
            <div className="text-sm text-gray-500">Documents generated</div>
          </div>
        </div>

        {/* ── BODY: QUICK ACTIONS + RECENT DOCS ────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 fade-in-4">

          {/* Quick actions */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Quick actions</h2>
            <div className="space-y-2.5">
              <Link href="/generate"
                className="flex items-center gap-3 p-4 bg-teal text-white rounded-lg hover:bg-teal-dark transition-all hover:shadow-card group">
                <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center text-base flex-shrink-0">✦</div>
                <div>
                  <div className="font-semibold text-sm">Generate document</div>
                  <div className="text-xs text-white/70">Board minutes, AGM, ROC</div>
                </div>
              </Link>
              <Link href="/clients/new"
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-card transition-all">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">➕</div>
                <div>
                  <div className="font-semibold text-sm text-ink">Add client</div>
                  <div className="text-xs text-gray-400">Store company profile once</div>
                </div>
              </Link>
              <Link href="/pricing"
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-card transition-all">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">💳</div>
                <div>
                  <div className="font-semibold text-sm text-ink">Plans & pricing</div>
                  <div className="text-xs text-gray-400">{docsLeft} generations left</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent documents */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Recent documents</h2>
                <Link href="/documents" className="text-xs text-teal hover:text-teal-dark font-medium transition-colors">
                  View all →
                </Link>
              </div>

              {!documents?.length ? (
                <div className="p-10 text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="font-semibold text-ink mb-1 text-sm">No documents yet</p>
                  <p className="text-sm text-gray-400 mb-4">Generate your first board minutes or AGM notice</p>
                  <Link href="/generate" className="btn btn-primary text-xs">
                    Generate now →
                  </Link>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Document</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc: any, idx: number) => (
                      <tr key={doc.id}
                        className={`hover:bg-gray-50 transition-colors group ${idx !== 0 ? 'border-t border-gray-50' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="font-medium text-sm text-ink truncate max-w-[180px] sm:max-w-none">{doc.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{(doc.clients as any)?.company_name}</div>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[doc.type] || 'bg-gray-100 text-gray-600'}`}>
                            {TYPE_LABELS[doc.type] || doc.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-400 whitespace-nowrap">
                          {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/documents/${doc.id}`}
                            className="text-xs text-teal font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── NO CLIENTS NUDGE ─────────────────────────────────────────── */}
        {!clients?.length && (
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-4 fade-in">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-semibold text-amber-900 mb-1 text-sm">Start by adding your first client</p>
              <p className="text-xs text-amber-700 mb-3">Store a client's CIN, directors and DINs once — every document auto-populates from there.</p>
              <Link href="/clients/new" className="btn btn-primary text-xs">
                Add first client →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
