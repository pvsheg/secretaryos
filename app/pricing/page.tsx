'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try SecretaryOS',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthly: 0,
    docs: 5,
    docsLabel: 'documents / month',
    rollover: null,
    users: 1,
    featured: false,
    badge: null,
    features: [
      'Board meetings (Notice, Agenda, Minutes)',
      'Unlimited companies',
      'MCA auto-fetch via CIN',
      'PDF download',
    ],
    missing: [
      'AGM system',
      'Document rollover',
      'Email support',
      'Custom templates',
      'Multi-user access',
    ],
    cta: 'Get Started Free',
    ctaHref: '/auth',
    ctaStyle: 'outline',
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'For individual CS professionals',
    monthlyPrice: 499,
    annualPrice: 4999,
    annualMonthly: 417,
    docs: 100,
    docsLabel: 'documents / month',
    rollover: 200,
    users: 1,
    featured: true,
    badge: 'Most Popular',
    features: [
      'Board meetings (Notice, Agenda, Minutes)',
      'AGM system (Notice, Agenda, Minutes)',
      'Unlimited companies',
      'Unlimited document templates',
      'Email support',
      'MCA auto-fetch via CIN',
      'PDF download',
      '30-day document rollover (up to 200)',
    ],
    missing: [
      'Custom PDF templates',
      'Multi-user access (5 seats)',
      'Admin dashboard',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/auth',
    ctaStyle: 'primary',
  },
  {
    id: 'firm',
    name: 'Firm',
    tagline: 'For CS firms & larger practices',
    monthlyPrice: 1500,
    annualPrice: 14999,
    annualMonthly: 1250,
    docs: 200,
    docsLabel: 'documents / month',
    rollover: 400,
    users: 5,
    featured: false,
    badge: 'For Firms',
    features: [
      'Everything in Professional',
      'Priority support (24-hour response)',
      'Custom PDF templates',
      'Multi-user access (5 seats)',
      'Admin dashboard',
      '30-day document rollover (up to 400)',
    ],
    missing: [],
    cta: 'Start Free Trial',
    ctaHref: '/auth',
    ctaStyle: 'dark',
  },
]

const comparisonRows = [
  { label: 'Monthly documents',     free: '5',           professional: '100',           firm: '200' },
  { label: 'Max with rollover',      free: '5',           professional: '200',           firm: '400' },
  { label: 'Rollover window',        free: '–',           professional: '30 days',       firm: '30 days' },
  { label: 'Companies',             free: 'Unlimited',   professional: 'Unlimited',     firm: 'Unlimited' },
  { label: 'User seats',            free: '1',           professional: '1',             firm: '5' },
  { label: 'Board meetings',        free: true,          professional: true,            firm: true },
  { label: 'AGM system',            free: false,         professional: true,            firm: true },
  { label: 'Document templates',    free: false,         professional: true,            firm: true },
  { label: 'Email support',         free: false,         professional: true,            firm: true },
  { label: 'Priority support',      free: false,         professional: false,           firm: true },
  { label: 'Custom PDF templates',  free: false,         professional: false,           firm: true },
  { label: 'Multi-user access',     free: false,         professional: false,           firm: true },
  { label: 'Admin dashboard',       free: false,         professional: false,           firm: true },
]

const faqs = [
  {
    q: 'Do document limits reset monthly?',
    a: 'Yes, you get fresh documents each month. Plus, unused documents roll over for up to 30 days — so a Professional plan user can have up to 200 documents available in any given month.',
  },
  {
    q: 'What counts as a "document"?',
    a: 'Every generated document counts toward your limit — Notices, Agendas, Minutes, Forms, Reports, etc. Viewing or downloading a document you already generated does not count.',
  },
  {
    q: 'Can I change tiers anytime?',
    a: 'Yes. Upgrades take effect immediately; downgrades apply at the end of your current billing cycle.',
  },
  {
    q: 'How do I earn referral commissions?',
    a: 'Share your referral link from your dashboard. When someone signs up through your link, you earn 20% of their monthly subscription — every month, permanently.',
  },
  {
    q: 'When are referral commissions paid?',
    a: 'Commissions are calculated monthly and paid out on a monthly basis directly to your account.',
  },
  {
    q: 'Is there a referral limit?',
    a: 'No limit. Refer as many CS professionals as you want and earn unlimited commission.',
  },
  {
    q: 'Do referred customers get a benefit?',
    a: 'Yes — anyone who signs up via a referral link gets 1 free month on their chosen plan.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes — pay annually and save 16%. Professional: ₹4,999/year (₹417/month), Firm: ₹14,999/year (₹1,250/month).',
  },
  {
    q: 'Is my data safe?',
    a: 'Your client data and documents are stored on Supabase (AWS Mumbai region) with row-level security — only you can see your data. We never share your client information.',
  },
]

function CheckIcon() {
  return <span className="text-teal flex-shrink-0 mt-0.5 font-bold">✓</span>
}
function DashIcon() {
  return <span className="flex-shrink-0 mt-0.5 text-gray-300">–</span>
}
function TableCheck({ val }: { val: boolean | string }) {
  if (typeof val === 'string') return <span className="text-sm text-gray-700">{val}</span>
  return val
    ? <span className="text-teal font-bold text-base">✓</span>
    : <span className="text-gray-200 font-bold text-base">–</span>
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10 fade-in-1">
          <h1 className="font-serif text-4xl font-bold text-ink mb-3">Simple, transparent pricing</h1>
          <p className="text-gray-500 text-lg">Built for practicing Company Secretaries in India. No hidden fees.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10 fade-in-2">
          <span className={`text-sm font-medium ${!annual ? 'text-ink' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-teal' : 'bg-gray-200'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-ink' : 'text-gray-400'}`}>
            Annual
            <span className="ml-1.5 bg-teal/10 text-teal text-xs font-semibold px-2 py-0.5 rounded-full">Save 16%</span>
          </span>
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-3 gap-5 mb-14 fade-in-3">
          {plans.map(plan => {
            const displayPrice = annual && plan.monthlyPrice > 0 ? plan.annualMonthly : plan.monthlyPrice

            return (
              <div key={plan.id} className={`bg-white rounded-2xl flex flex-col relative ${
                plan.featured
                  ? 'border-2 border-teal shadow-card'
                  : 'border border-gray-200'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${plan.featured ? 'bg-teal' : 'bg-ink'}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  {/* Plan name + price */}
                  <div className="mb-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{plan.name}</div>
                    <div className="flex items-baseline gap-1 mb-1">
                      {plan.monthlyPrice === 0 ? (
                        <span className="text-3xl font-bold text-ink">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-ink">₹{displayPrice.toLocaleString('en-IN')}</span>
                          <span className="text-gray-400 text-sm">/mo</span>
                        </>
                      )}
                    </div>
                    {annual && plan.annualPrice > 0 && (
                      <div className="text-xs text-gray-400">₹{plan.annualPrice.toLocaleString('en-IN')} billed annually</div>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">{plan.tagline}</p>
                  </div>

                  {/* Docs count */}
                  <div className="mb-5 pb-5 border-b border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif text-2xl font-semibold text-ink">{plan.docs}</span>
                      <span className="text-xs text-gray-400">{plan.docsLabel}</span>
                    </div>
                    {plan.rollover && (
                      <p className="text-xs text-gray-400 mt-0.5">Up to {plan.rollover} with 30-day rollover</p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 flex-1 mb-6">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckIcon />
                        {f}
                      </div>
                    ))}
                    {plan.missing.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-300">
                        <DashIcon />
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link href={plan.ctaHref}
                    className={`w-full py-2.5 text-center text-sm font-semibold rounded-xl transition-all active:scale-95 ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-teal text-white hover:bg-teal-dark shadow-sm hover:shadow-card'
                        : plan.ctaStyle === 'dark'
                          ? 'bg-ink text-white hover:bg-gray-800'
                          : 'border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {plan.cta} →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature comparison table */}
        <div className="mb-14 fade-in-4">
          <h2 className="font-serif text-2xl font-bold text-ink mb-6 text-center">Full feature comparison</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 w-1/2">Feature</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Free</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-teal bg-teal/5">Professional</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Firm</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.label} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-5 py-3 text-sm text-gray-700">{row.label}</td>
                    <td className="px-4 py-3 text-center"><TableCheck val={row.free} /></td>
                    <td className="px-4 py-3 text-center bg-teal/5"><TableCheck val={row.professional} /></td>
                    <td className="px-4 py-3 text-center"><TableCheck val={row.firm} /></td>
                  </tr>
                ))}
                <tr>
                  <td className="px-5 py-4"></td>
                  <td className="px-4 py-4 text-center">
                    <Link href="/auth" className="text-xs font-semibold text-gray-500 hover:text-ink border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                      Get Started
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-center bg-teal/5">
                    <Link href="/auth" className="text-xs font-semibold text-white bg-teal hover:bg-teal-dark rounded-lg px-3 py-1.5 transition-colors">
                      Start Trial
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link href="/auth" className="text-xs font-semibold text-white bg-ink hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors">
                      Start Trial
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral program section */}
        <div className="bg-gradient-to-br from-teal/5 to-teal/10 border border-teal/20 rounded-2xl p-6 sm:p-8 mb-14 fade-in-4">
          <div className="grid sm:grid-cols-2 gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 text-teal text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></span>
                Referral Program
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink mb-2">Earn 20% recurring commission</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Share SecretaryOS with your CS network and earn passive income every month — for as long as your referrals remain subscribed.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  { label: 'Individual CS referral', monthly: '₹99.80/month', annual: '₹1,197/year' },
                  { label: 'Firm referral', monthly: '₹300/month', annual: '₹3,600/year' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-teal/10">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-ink">{item.monthly}</div>
                      <div className="text-xs text-gray-400">{item.annual}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  'No referral limit — earn unlimited commission',
                  'Referrals get 1 free month when they sign up',
                  'Track all referrals from your dashboard',
                  'Commissions paid out monthly',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings calculator */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Example earnings</p>
              {[
                { label: '5 individual referrals', value: '₹5,988/year' },
                { label: '10 individual referrals', value: '₹11,970/year' },
                { label: '2 firm referrals', value: '₹7,200/year' },
                { label: '5 individual + 2 firm', value: '₹14,388/year' },
              ].map(ex => (
                <div key={ex.label} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{ex.label}</span>
                  <span className="font-serif text-lg font-bold text-teal">{ex.value}</span>
                </div>
              ))}
              <Link href="/referral"
                className="w-full mt-2 py-3 text-center text-sm font-semibold rounded-xl bg-teal text-white hover:bg-teal-dark transition-all active:scale-95 block">
                Become a Referral Partner →
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl font-bold text-ink mb-6 text-center">Common questions</h2>
          <div className="space-y-2 max-w-3xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 text-sm font-medium text-ink text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                  {faq.q}
                  <span className={`text-gray-400 transition-transform flex-shrink-0 ml-3 ${openFaq === i ? 'rotate-180' : ''}`}>↓</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-ink text-white rounded-2xl p-8 text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">Questions? Talk to us directly</h2>
          <p className="text-gray-400 text-sm mb-5">We are a small team building this specifically for CS professionals. We respond to every message.</p>
          <a href="mailto:pvsheg@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm active:scale-95">
            Email us →
          </a>
        </div>

      </main>
    </div>
  )
}
