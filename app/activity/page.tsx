import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const DOC_TYPE_LABELS: Record<string, string> = {
  board_minutes: 'Board Minutes',
  agm_notice: 'AGM Notice',
  roc_filing: 'ROC Filing',
}

const DOC_TYPE_ICONS: Record<string, string> = {
  board_minutes: '📋',
  agm_notice: '📢',
  roc_filing: '🗂️',
}

const DOC_TYPE_COLORS: Record<string, string> = {
  board_minutes: 'bg-blue-50 text-blue-700 border-blue-100',
  agm_notice: 'bg-purple-50 text-purple-700 border-purple-100',
  roc_filing: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupByDate(items: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  for (const item of items) {
    const date = new Date(item.created_at).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return groups
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'board_minutes', label: 'Board Minutes' },
  { id: 'agm_notice', label: 'AGM Notice' },
  { id: 'roc_filing', label: 'ROC Filing' },
]

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const activeFilter = searchParams.type || 'all'

  // Fetch generation activity (with company name from client join)
  let usageQuery = supabase
    .from('generation_usage')
    .select('id, doc_type, company_name, client_id, model_used, tokens_used, input_hash, created_at, clients(company_name, cin)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (activeFilter !== 'all') {
    usageQuery = usageQuery.eq('doc_type', activeFilter)
  }

  // Fetch saved documents to match against generations
  const [{ data: activity }, { data: savedDocs }, { data: subscription }, { count: totalCount }] = await Promise.all([
    usageQuery,
    supabase.from('documents').select('id, input_hash, type, title').not('input_hash', 'is', null),
    supabase.from('subscriptions').select('plan, monthly_doc_limit').single(),
    supabase.from('generation_usage').select('id', { count: 'exact', head: true }),
  ])

  // Build a map from input_hash → saved document id
  const savedByHash = new Map<string, { id: string; title: string }>(
    (savedDocs || []).map(d => [d.input_hash!, { id: d.id, title: d.title }])
  )

  const plan = subscription?.plan || 'free'
  const planLimit = subscription?.monthly_doc_limit || 3

  // Start of current month for monthly count
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: monthlyCount } = await supabase
    .from('generation_usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())

  const usedThisPeriod = plan === 'free' ? (totalCount ?? 0) : (monthlyCount ?? 0)

  const grouped = groupByDate(activity || [])

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Activity</h1>
            <p className="text-slate-500 text-sm mt-1">Every document generation, in order</p>
          </div>
          {/* Usage summary */}
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 self-start">
            <p className="text-xs text-slate-400 mb-1">
              {plan === 'free' ? 'All-time usage' : 'This month'}
            </p>
            <div className="flex items-center gap-3">
              <div className="font-serif text-2xl font-bold text-ink">
                {usedThisPeriod}
                <span className="text-base font-normal text-slate-400">/{planLimit}</span>
              </div>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${usedThisPeriod / planLimit > 0.8 ? 'bg-red-400' : 'bg-teal'}`}
                  style={{ width: `${Math.min(100, Math.round((usedThisPeriod / planLimit) * 100))}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 capitalize">{plan} plan</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 mb-6 w-fit">
          {FILTER_TABS.map(tab => (
            <Link
              key={tab.id}
              href={tab.id === 'all' ? '/activity' : `/activity?type=${tab.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-ink text-white'
                  : 'text-slate-500 hover:text-ink hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Activity timeline */}
        {!activity?.length ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-semibold text-ink mb-1">No activity yet</p>
            <p className="text-sm text-slate-500 mb-4">
              {activeFilter === 'all'
                ? 'Generate your first document to see it here.'
                : `No ${DOC_TYPE_LABELS[activeFilter] || activeFilter} generations yet.`}
            </p>
            <Link href="/generate" className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
              ✦ Generate document
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{date}</p>
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                  {items.map((item: any, idx: number) => {
                    const companyName = (item.clients as any)?.company_name || item.company_name || 'Unknown company'
                    const cin = (item.clients as any)?.cin
                    const savedDoc = item.input_hash ? savedByHash.get(item.input_hash) : undefined
                    const rowHref = savedDoc
                      ? `/documents/${savedDoc.id}`
                      : item.client_id
                      ? `/generate?client=${item.client_id}`
                      : null

                    const rowClass = `flex items-center gap-4 px-5 py-4 transition-colors ${idx !== 0 ? 'border-t border-slate-100' : ''} ${rowHref ? 'hover:bg-slate-50/70 cursor-pointer' : ''}`

                    const inner = (
                      <>
                        <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                          {DOC_TYPE_ICONS[item.doc_type] || '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${DOC_TYPE_COLORS[item.doc_type] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                              {DOC_TYPE_LABELS[item.doc_type] || item.doc_type}
                            </span>
                            {savedDoc && (
                              <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-ink mt-1 truncate">{companyName}</p>
                          {cin && <p className="text-xs text-slate-400 font-mono">{cin}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatRelativeDate(item.created_at)}
                          </span>
                          {rowHref && <span className="text-slate-300">→</span>}
                        </div>
                      </>
                    )

                    return rowHref ? (
                      <Link key={item.id} href={rowHref} className={rowClass}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={item.id} className={rowClass}>
                        {inner}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activity && activity.length >= 200 && (
          <p className="text-center text-xs text-slate-400 mt-6">Showing last 200 generations</p>
        )}
      </main>
    </div>
  )
}
