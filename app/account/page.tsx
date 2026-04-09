import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const PLAN_FEATURES: Record<string, string[]> = {
  free:         ['5 documents / month', 'Board meetings (Notice, Agenda, Minutes)', 'Unlimited companies', 'MCA auto-fetch via CIN', 'PDF download'],
  professional: ['100 documents / month (200 with rollover)', 'Board meetings + AGM system', 'Unlimited companies', 'Unlimited document templates', 'Email support'],
  firm:         ['200 documents / month (400 with rollover)', 'Everything in Professional', 'Priority support (24-hour response)', 'Custom PDF templates', 'Multi-user access (5 seats)', 'Admin dashboard'],
  // legacy plans
  founding:     ['100 documents / month', 'All document types', 'MCA auto-fetch, 100+ agenda types', 'Priority support'],
  starter:      ['50 documents / month', 'Up to 10 client companies', 'All document types', 'MCA auto-fetch, PDF download', 'Compliance calendar'],
  growth:       ['200 documents / month', 'Unlimited client companies', 'All document types', '100+ agenda types', 'Compliance calendar, statutory registers', '10 MCA syncs / month', 'Priority support'],
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', professional: 'Professional', firm: 'Firm',
  // legacy
  founding: 'Founding', starter: 'Starter', growth: 'Growth',
}

const PLAN_BADGE: Record<string, string> = {
  free:         'bg-gray-100 text-gray-700',
  professional: 'bg-teal/10 text-teal-dark',
  firm:         'bg-purple-100 text-purple-700',
  // legacy
  founding:     'bg-amber-100 text-amber-700',
  starter:      'bg-blue-100 text-blue-700',
  growth:       'bg-teal/10 text-teal-dark',
}

export default async function AccountPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [{ data: subscription }, { count: monthlyCount }, { count: allTimeCount }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', session.user.id).single(),
    supabase.from('generation_usage').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('created_at', startOfMonth.toISOString()),
    supabase.from('generation_usage').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id),
  ])

  const plan = subscription?.plan || 'free'
  const planLimit = subscription?.monthly_doc_limit || 3
  const docsUsed = plan === 'free' ? (allTimeCount ?? 0) : (monthlyCount ?? 0)
  const docsLeft = Math.max(0, planLimit - docsUsed)
  const usagePct = Math.min(100, Math.round((docsUsed / planLimit) * 100))
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free

  const renewalDate = new Date()
  renewalDate.setMonth(renewalDate.getMonth() + 1)
  renewalDate.setDate(1)

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-2xl mx-auto">

        <div className="mb-8 fade-in-1">
          <h1 className="font-serif text-2xl font-bold text-ink mb-1">Account</h1>
          <p className="text-sm text-gray-400">{session.user.email}</p>
        </div>

        {/* Plan card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 fade-in-2">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Active plan</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>
                  {PLAN_LABELS[plan] || 'Free'} plan
                </span>
                {subscription?.status === 'active' && plan !== 'free' && (
                  <span className="text-xs text-green-600 font-medium">Active</span>
                )}
              </div>
            </div>
            {plan === 'free' && (
              <Link href="/pricing"
                className="flex-shrink-0 btn btn-primary text-xs px-4 py-2">
                Upgrade plan →
              </Link>
            )}
          </div>

          {/* Usage bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ink font-medium">{docsUsed} / {planLimit} documents used</span>
              <span className="text-gray-400 text-xs">
                {plan === 'free' ? 'All time' : `Resets ${renewalDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-400' : usagePct > 60 ? 'bg-amber-400' : 'bg-teal'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {docsLeft > 0
                ? `${docsLeft} generation${docsLeft !== 1 ? 's' : ''} remaining`
                : plan === 'free'
                  ? 'Free limit reached — upgrade to continue'
                  : 'Monthly limit reached — resets next month'}
            </p>
          </div>

          {/* Plan features */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              What&apos;s included
            </p>
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-teal mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Usage stats */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 fade-in-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Usage stats</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Total documents generated</p>
              <p className="font-serif text-2xl font-bold text-ink">{allTimeCount ?? 0}</p>
            </div>
            {plan !== 'free' && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">This month</p>
                <p className="font-serif text-2xl font-bold text-ink">{monthlyCount ?? 0}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade CTA — only for non-firm plans */}
        {plan !== 'firm' && (
          <div className="bg-teal/5 border border-teal/20 rounded-xl p-5 flex items-center justify-between gap-4 fade-in-4">
            <div>
              <p className="font-semibold text-ink text-sm mb-0.5">Need more documents?</p>
              <p className="text-xs text-gray-500">View all plans and upgrade anytime.</p>
            </div>
            <Link href="/pricing" className="flex-shrink-0 btn btn-teal-outline text-xs px-4 py-2">
              View plans →
            </Link>
          </div>
        )}

      </main>
    </div>
  )
}
