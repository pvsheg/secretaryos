'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const steps = [
  {
    number: '1',
    title: 'Get your referral link',
    desc: 'Sign in to your SecretaryOS account and copy your unique referral link from the dashboard.',
  },
  {
    number: '2',
    title: 'Share with CS professionals',
    desc: 'Send your link to colleagues, post in CS communities, or share at ICSI chapter meetings.',
  },
  {
    number: '3',
    title: 'They sign up & get 1 free month',
    desc: 'When they sign up through your link, they automatically get their first month free — no codes needed.',
  },
  {
    number: '4',
    title: 'You earn 20% every month',
    desc: 'As long as they remain subscribed, you earn 20% of their monthly fee — credited to your account monthly.',
  },
]

const earningsExamples = [
  { scenario: '5 individual CS referrals', monthly: '₹499/mo', commission: '₹99.80/mo each', total: '₹5,988/year' },
  { scenario: '10 individual CS referrals', monthly: '₹499/mo', commission: '₹99.80/mo each', total: '₹11,970/year' },
  { scenario: '2 firm referrals', monthly: '₹1,500/mo', commission: '₹300/mo each', total: '₹7,200/year' },
  { scenario: '5 individual + 2 firm', monthly: 'Mixed', commission: '20% on each', total: '₹14,388/year' },
]

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)

  function handleCopyDemo() {
    navigator.clipboard.writeText('https://secretaryos.com/?ref=your-code')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-14 fade-in-1">
          <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 text-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></span>
            Referral Partner Program
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink mb-4">
            Earn 20% Recurring<br className="hidden sm:block" /> Commission
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Share SecretaryOS with your CS network and earn passive income every month — for as long as your referrals stay subscribed.
          </p>
        </div>

        {/* Commission cards */}
        <div className="grid sm:grid-cols-2 gap-5 mb-14 fade-in-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Individual CS Referral</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-bold text-ink">₹99.80</span>
              <span className="text-gray-400">/month</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">₹1,197 per year, per referral</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Their plan</span>
                <span className="font-medium text-ink">Professional (₹499/mo)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your commission</span>
                <span className="font-medium text-teal">20% = ₹99.80/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Their benefit</span>
                <span className="font-medium text-ink">1 free month</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Firm Referral</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl font-bold text-ink">₹300</span>
              <span className="text-gray-400">/month</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">₹3,600 per year, per referral</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Their plan</span>
                <span className="font-medium text-ink">Firm (₹1,500/mo)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your commission</span>
                <span className="font-medium text-teal">20% = ₹300/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Their benefit</span>
                <span className="font-medium text-ink">1 free month</span>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-14 fade-in-3">
          <h2 className="font-serif text-2xl font-bold text-ink mb-8 text-center">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(step => (
              <div key={step.number} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="w-8 h-8 bg-teal text-white font-bold text-sm rounded-full flex items-center justify-center mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold text-ink text-sm mb-2">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Earnings examples */}
        <div className="mb-14 fade-in-3">
          <h2 className="font-serif text-2xl font-bold text-ink mb-6 text-center">Example earnings</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Scenario</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Plan Price</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Commission</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-teal">Annual Earnings</th>
                </tr>
              </thead>
              <tbody>
                {earningsExamples.map((ex, i) => (
                  <tr key={ex.scenario} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-4 font-medium text-ink">{ex.scenario}</td>
                    <td className="px-4 py-4 text-center text-gray-500 hidden sm:table-cell">{ex.monthly}</td>
                    <td className="px-4 py-4 text-center text-gray-500 hidden sm:table-cell">{ex.commission}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-serif text-lg font-bold text-teal">{ex.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">Commissions are recurring — you keep earning as long as referrals remain subscribed.</p>
        </div>

        {/* Referral link demo / CTA */}
        <div className="bg-ink text-white rounded-2xl p-8 text-center mb-10 fade-in-4">
          <h2 className="font-serif text-2xl font-bold mb-2">Get your referral link</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to your account to get your unique referral link and start earning.</p>

          {/* Demo link box */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3 mb-5 max-w-md mx-auto">
            <span className="text-gray-300 text-sm flex-1 text-left truncate">secretaryos.com/?ref=your-code</span>
            <button
              onClick={handleCopyDemo}
              className="flex-shrink-0 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <Link href="/auth"
            className="inline-flex items-center gap-2 px-7 py-3 bg-teal text-white font-semibold rounded-xl hover:bg-teal-dark transition-colors text-sm active:scale-95">
            Become a Referral Partner →
          </Link>
          <p className="text-xs text-gray-500 mt-3">Already have an account? <Link href="/auth" className="text-teal hover:underline">Sign in</Link> to access your link.</p>
        </div>

        {/* Fine print */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>No referral limit. No minimum required. Commissions paid monthly.</p>
          <p>Questions? <a href="mailto:pvsheg@gmail.com" className="text-teal hover:underline">Contact us</a></p>
        </div>

      </main>
    </div>
  )
}
