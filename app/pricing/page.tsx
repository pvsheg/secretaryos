'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    founding: 0,
    tagline: 'Try SecretaryOS',
    docs: '3',
    docsLabel: 'document generations',
    features: [
      'All document types',
      'MCA auto-fetch via CIN',
      '30 agenda types',
      'PDF download',
    ],
    missing: [
      'More than 3 generations',
      'Custom templates',
      'Priority support',
    ],
    cta: 'Start free',
    ctaHref: '/auth',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 2999,
    founding: 1499,
    tagline: 'Solo CS — up to 10 clients',
    docs: '50',
    docsLabel: 'documents / month',
    features: [
      'Up to 10 client companies',
      '50 documents per month',
      'All document types',
      'MCA auto-fetch via CIN',
      '30 agenda types',
      'PDF download',
      'Compliance calendar',
    ],
    missing: [
      '100+ agenda types',
      'Statutory registers',
      'White-label reports',
    ],
    cta: 'Get founding rate',
    ctaHref: '/auth',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 5999,
    founding: 2999,
    tagline: 'Solo CS — unlimited clients',
    docs: '200',
    docsLabel: 'documents / month',
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
    cta: 'Get founding rate',
    ctaHref: '/auth',
  },
  {
    id: 'firm',
    name: 'Firm',
    price: 14999,
    founding: 7499,
    tagline: 'CS firm — 5 seats',
    docs: '500',
    docsLabel: 'documents / month',
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
    cta: 'Get founding rate',
    ctaHref: '/auth',
  },
]

const faqs = [
  {
    q: 'What counts as a "document generation"?',
    a: 'Each time you click Generate and the AI creates a new document, that counts as one generation. Viewing or downloading a document you already generated does not count.',
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
    a: 'Your client data and documents are stored on Supabase (AWS Mumbai region) with row-level security — only you can see your data. We never share your client information.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes — pay annually and get 2 months free. Starter: ₹29,990/year, Growth: ₹59,990/year, Firm: ₹1,49,990/year.',
  },
]

export default function PricingPage() {
  const [showFounding, setShowFounding] = useState(true)
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

        {/* Founding member banner */}
        {showFounding && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 fade-in-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></div>
              <div>
                <span className="text-sm font-semibold text-amber-800">Founding member pricing — first 50 customers only</span>
                <p className="text-xs text-amber-700 mt-0.5">Lock in 50% off forever. Rate never increases as long as you stay subscribed.</p>
              </div>
            </div>
            <button onClick={() => setShowFounding(false)} className="text-amber-400 hover:text-amber-600 flex-shrink-0 text-lg">✕</button>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 fade-in-3">
          {plans.map(plan => {
            const displayPrice = plan.price === 0 ? 0 : (showFounding ? plan.founding : plan.price)

            return (
              <div key={plan.id} className={`bg-white rounded-lg flex flex-col relative ${
                plan.featured
                  ? 'border-2 border-teal shadow-card'
                  : 'border border-gray-200'
              }`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-teal text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  {/* Plan name + price */}
                  <div className="mb-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{plan.name}</div>
                    <div className="flex items-baseline gap-1 mb-1">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-bold text-ink">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-ink">₹{displayPrice.toLocaleString('en-IN')}</span>
                          <span className="text-gray-400 text-sm">/mo</span>
                        </>
                      )}
                    </div>
                    {showFounding && plan.price > 0 && (
                      <div className="text-xs text-gray-400 line-through">₹{plan.price.toLocaleString('en-IN')}/mo regular</div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{plan.tagline}</p>
                  </div>

                  {/* Docs count */}
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <span className="font-serif text-2xl font-semibold text-ink">{plan.docs}</span>
                    <span className="text-xs text-gray-400 ml-1">{plan.docsLabel}</span>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 flex-1 mb-5">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-teal flex-shrink-0 mt-0.5 font-bold">✓</span>
                        {f}
                      </div>
                    ))}
                    {plan.missing.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-300">
                        <span className="flex-shrink-0 mt-0.5">–</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link href={plan.ctaHref}
                    className={`w-full py-2.5 text-center text-sm font-semibold rounded-lg transition-all ${
                      plan.featured
                        ? 'bg-teal text-white hover:bg-teal-dark shadow-sm hover:shadow-card active:scale-95'
                        : plan.price === 0
                          ? 'border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          : 'border-2 border-ink text-ink hover:bg-gray-50 active:scale-95'
                    }`}>
                    {plan.cta} →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Referral section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 mb-8 fade-in-4">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink mb-2">Refer a colleague, get a free month</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Every CS professional you refer who becomes a paying customer earns you one free month — credited automatically after their second payment. No cap.
              </p>
              <div className="space-y-2">
                {[
                  '1 free month per converted referral',
                  'Their benefit: 30 days free on Growth',
                  'Credits auto-applied — no voucher codes',
                  'No minimum referrals required',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-teal flex-shrink-0 font-bold">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-100">
              <div className="font-serif text-4xl font-bold text-ink mb-1">50×</div>
              <div className="text-sm text-gray-500 mb-4">return on every referral</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                A free month costs ₹120 in API fees. A converted customer pays ₹5,999/month. Your referral generates 50× its cost.
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl font-bold text-ink mb-6 text-center">Common questions</h2>
          <div className="space-y-2 max-w-3xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
        <div className="bg-ink text-white rounded-lg p-8 text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">Questions? Talk to us directly</h2>
          <p className="text-gray-400 text-sm mb-5">We are a small team building this specifically for CS professionals. We respond to every message.</p>
          <a href="mailto:pvsheg@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm active:scale-95">
            Email us →
          </a>
        </div>

      </main>
    </div>
  )
}
