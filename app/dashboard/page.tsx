import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const [{ data: clients }, { data: documents }, { data: subscription }, { data: usage }, { count: totalDocs }] = await Promise.all([
    supabase.from('clients').select('id, company_name').order('created_at', { ascending: false }),
    supabase.from('documents').select('id, title, type, created_at, clients(company_name)').order('created_at', { ascending: false }).limit(5),
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
    free: 'Free', founding: 'Founding Member', starter: 'Starter',
    growth: 'Growth', firm: 'Firm'
  }
  const planColors: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    founding: 'bg-amber-100 text-amber-700',
    starter: 'bg-blue-100 text-blue-700',
    growth: 'bg-green-100 text-green-700',
    firm: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-20 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-6 sm:mb-10">
          <p className="text-slate-500 text-sm mb-1">{greeting},</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">{firstName} 👋</h1>
        </div>

        {/* SUBSCRIPTION BANNER */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${planColors[plan] || planColors.free}`}>
              {planLabels[plan] || 'Free'} plan
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{docsUsed} of {planLimit} documents used this month</span>
                <span className="text-xs font-semibold text-ink">{docsLeft} left</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          </div>
          {plan === 'free' && (
            <Link href="/pricing" className="flex-shrink-0 px-4 py-2 bg-ink text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors text-center">
              Upgrade plan →
            </Link>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-10">
          {[
            { label: 'Total clients', val: clients?.length || 0, icon: '🏢', color: 'bg-blue-50 border-blue-100' },
            { label: 'Documents generated', val: totalDocs || 0, icon: '📄', color: 'bg-green-50 border-green-100' },
          ].map(s => (
            <div key={s.label} className={`border rounded-2xl p-4 sm:p-5 ${s.color}`}>
              <div className="text-xl sm:text-2xl mb-2 sm:mb-3">{s.icon}</div>
              <div className="text-2xl sm:text-3xl font-bold text-ink font-serif mb-1">{s.val}</div>
              <div className="text-xs text-slate-500 font-medium leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
          {/* QUICK ACTIONS */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 sm:mb-4">Quick actions</h2>
            <div className="space-y-3">
              <Link href="/generate" className="flex items-center gap-3 sm:gap-4 p-4 bg-ink text-white rounded-2xl hover:bg-slate-800 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0">✦</div>
                <div>
                  <div className="font-semibold text-sm">Generate document</div>
                  <div className="text-xs text-slate-400">Board minutes, AGM, ROC filings</div>
                </div>
              </Link>
              <Link href="/clients/new" className="flex items-center gap-3 sm:gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0">➕</div>
                <div>
                  <div className="font-semibold text-sm text-ink">Add client</div>
                  <div className="text-xs text-slate-500">Store company profile once</div>
                </div>
              </Link>
              <Link href="/pricing" className="flex items-center gap-3 sm:gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0">💳</div>
                <div>
                  <div className="font-semibold text-sm text-ink">Plans & pricing</div>
                  <div className="text-xs text-slate-500">Upgrade · Referrals · Advisors</div>
                </div>
              </Link>
            </div>
          </div>

          {/* RECENT DOCUMENTS */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent documents</h2>
              <Link href="/documents" className="text-xs text-slate-500 hover:text-ink">View all →</Link>
            </div>

            {!documents?.length ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 sm:p-10 text-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="font-semibold text-ink mb-1 text-sm">No documents yet</p>
                <p className="text-sm text-slate-500 mb-4">Generate your first board minutes document</p>
                <Link href="/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg">
                  Generate now →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {documents.map((doc: any) => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                    <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                      {doc.type === 'board_minutes' ? '📋' : doc.type === 'agm_notice' ? '📢' : '🗂️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">{doc.title}</div>
                      <div className="text-xs text-slate-500">{(doc.clients as any)?.company_name}</div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                      {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {!clients?.length && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
            <div className="text-xl sm:text-2xl">💡</div>
            <div>
              <p className="font-semibold text-amber-900 mb-1 text-sm sm:text-base">Start by adding your first client</p>
              <p className="text-xs sm:text-sm text-amber-700 mb-3">Store a client's CIN, directors and DINs once — every document auto-populates from there.</p>
              <Link href="/clients/new" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors">
                Add first client →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
