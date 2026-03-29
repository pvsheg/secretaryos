'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 2999,
    founding: 1499,
    period: 'month',
    tagline: 'Solo CS — up to 10 clients',
    docs: 50,
    features: [
      'Up to 10 client companies',
      '50 documents per month',
      'Board minutes, AGM notices, ROC filings',
      'MCA auto-fetch via CIN',
      '30 agenda types',
      'PDF download',
      'Compliance calendar',
    ],
    missing: [
      '100+ agenda types',
      'Statutory registers',
      'MCA sync (Probe42)',
      'White-label reports',
    ],
    color: 'slate',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 5999,
    founding: 2999,
    period: 'month',
    tagline: 'Solo CS — unlimited clients',
    docs: 200,
    featured: true,
    features: [
      'Unlimited client companies',
      '200 documents per month',
      'All document types',
      'MCA auto-fetch via CIN',
      '100+ agenda types',
      'PDF download',
      'Compliance calendar',
      'Statutory registers',
      '10 MCA syncs per month',
      'Priority support',
    ],
    missing: [],
    color: 'blue',
  },
  {
    id: 'firm',
    name: 'Firm',
    price: 14999,
    founding: 7499,
    period: 'month',
    tagline: 'CS firm — 5 team seats',
    docs: 500,
    features: [
      'Everything in Growth',
      '5 team member seats',
      '500 documents per month',
      'Firm-wide client dashboard',
      'Unlimited MCA syncs',
      'White-label client reports',
      'Directors & auditor reports',
      'Custom agenda templates',
      'Dedicated account manager',
    ],
    missing: [],
    color: 'slate',
  },
]

const faqs = [
  {
    q: 'What happens when I hit my monthly document limit?',
    a: 'You will be notified when you are close to your limit. You can purchase additional documents at ₹5 each (Starter), ₹3 each (Growth), or ₹2 each (Firm). Or upgrade your plan instantly.',
  },
  {
    q: 'What is the founding member rate?',
    a: 'The first 50 customers get a permanently locked rate — exactly half the regular price. This never increases as long as your subscription remains active. If you cancel and rejoin, you return to the market rate.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes — upgrade anytime and the new plan takes effect immediately. Downgrade at the end of your current billing period.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your client data and documents are stored securely on Supabase (AWS Mumbai region) with row-level security — meaning only you can see your data. We never share your client information with anyone.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes — pay annually and get 2 months free. Starter: ₹29,990/year, Growth: ₹59,990/year, Firm: ₹1,49,990/year.',
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [showFounding, setShowFounding] = useState(true)

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-ink mb-3">Simple, transparent pricing</h1>
          <p className="text-slate-500 text-lg mb-6">Built for practicing Company Secretaries in India. No hidden fees.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${billing === 'annual' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">2 months free</span>
            </button>
          </div>
        </div>

        {/* Founding member banner */}
        {showFounding && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-amber-800">Founding member pricing — first 50 customers only</span>
              </div>
              <p className="text-sm text-amber-700">Lock in 50% off forever. This rate never increases as long as you stay subscribed.</p>
            </div>
            <button onClick={() => setShowFounding(false)} className="text-amber-400 hover:text-amber-600 ml-4 flex-shrink-0">✕</button>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-3 gap-5 mb-12">
          {plans.map(plan => {
            const price = showFounding ? plan.founding : (billing === 'annual' ? Math.round(plan.price * 10 / 12) : plan.price)
            const annualTotal = showFounding ? plan.founding * 10 : plan.price * 10

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 border flex flex-col ${plan.featured ? 'border-2 border-blue-400 bg-white' : 'border border-slate-100 bg-white'}`}
              >
                {plan.featured && (
                  <div className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full self-start mb-3 border border-blue-100">
                    Most popular
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-semibold text-ink">₹{price.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 text-sm">/month</span>
                </div>
                {showFounding && (
                  <div className="text-xs text-slate-400 line-through mb-1">₹{plan.price.toLocaleString('en-IN')}/month regular</div>
                )}
                {billing === 'annual' && (
                  <div className="text-xs text-green-600 mb-1">₹{annualTotal.toLocaleString('en-IN')}/year — 2 months free</div>
                )}
                <div className="text-xs text-slate-500 mb-4">{plan.tagline}</div>
                <div className="text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
                  {plan.docs} documents/month
                </div>

                <div className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                      {f}
                    </div>
                  ))}
                  {plan.missing.map(f => (
                    <div key={f} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="flex-shrink-0 mt-0.5">–</span>
                      {f}
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth"
                  className={`w-full py-2.5 text-center text-sm font-semibold rounded-xl transition-colors ${plan.featured ? 'bg-ink text-white hover:bg-slate-800' : 'border border-slate-200 text-ink hover:bg-slate-50'}`}
                >
                  {showFounding ? 'Get founding rate →' : 'Get started →'}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Referral section */}
        <div className="bg-white border border-slate-100 rounded-2xl p-8 mb-8">
          <div className="grid grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink mb-2">Refer a colleague, get a free month</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Every CS professional you refer who becomes a paying customer earns you one free month — credited automatically after their second payment. No cap. Refer 12 colleagues, get a free year.
              </p>
              <div className="space-y-2">
                {[
                  'Your referral: 1 free month per converted customer',
                  'Their benefit: 30 days free on the Growth plan',
                  'Credits auto-applied — no voucher codes needed',
                  'No minimum referrals required',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <div className="text-4xl font-semibold text-ink mb-1">50×</div>
              <div className="text-sm text-slate-500 mb-4">return on every referral</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                A free month costs us ₹120 in API fees. A converted customer pays ₹5,999/month. Your referral generates 50× its cost.
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold text-ink mb-6 text-center">Common questions</h2>
          <div className="space-y-3">
            {faqs.map(faq => (
              <details key={faq.q} className="bg-white border border-slate-100 rounded-xl group">
                <summary className="px-5 py-4 text-sm font-medium text-ink cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">↓</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-ink text-white rounded-2xl p-8 text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">Questions? Talk to us directly</h2>
          <p className="text-slate-400 text-sm mb-5">We are a small team building this specifically for CS professionals. We respond to every message.</p>
          <a
            href="mailto:pvsheg@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink font-semibold rounded-xl hover:bg-slate-100 transition-colors text-sm"
          >
            Email us →
          </a>
        </div>
      </main>
    </div>
  )
}
