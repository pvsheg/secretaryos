import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-app-bg">
      {/* ── NAVBAR (public) ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 h-16 flex items-center px-4 sm:px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <span className="font-serif text-xl font-bold text-ink">
            Secretary<span className="text-teal">OS</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-gray-500 hover:text-ink transition-colors">Sign in</Link>
            <Link href="/auth" className="btn btn-primary text-sm px-4 py-2">Start free →</Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 px-4 sm:px-6 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 text-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-6 fade-in-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></span>
            20,00,000+ verified Indian companies in our database
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-tight mb-5 fade-in-2">
            Generate board minutes<br className="hidden sm:block" />
            in minutes. Not hours.
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed fade-in-3">
            The AI compliance assistant for Company Secretaries. Section 118-compliant board minutes,
            AGM notices and ROC filings — drafted in under 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 fade-in-4">
            <Link href="/auth" className="btn btn-primary text-base px-7 py-3 w-full sm:w-auto">
              Start free — 5 documents included
            </Link>
            <Link href="/pricing" className="btn btn-secondary text-base px-7 py-3 w-full sm:w-auto">
              View pricing
            </Link>
          </div>

          {/* Trust row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400 fade-in-4">
            <div className="flex items-center gap-2">
              <span className="text-teal">✓</span> No credit card required
            </div>
            <div className="flex items-center gap-2">
              <span className="text-teal">✓</span> Companies Act 2013 compliant
            </div>
            <div className="flex items-center gap-2">
              <span className="text-teal">✓</span> Trusted by 50+ CS professionals
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6 bg-white border-y border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-bold text-ink mb-2">How it works</h2>
              <p className="text-gray-500">From client CIN to signed PDF in under 2 minutes</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  icon: '🔍',
                  title: 'Search & add your client',
                  desc: 'Enter a CIN or search by name. All 13 MCA data points — company type, directors, capital — load automatically.',
                },
                {
                  step: '2',
                  icon: '📋',
                  title: 'Pick agenda items & generate',
                  desc: 'Select from 100+ pre-built agenda items. Our AI drafts a legally precise, SS-1 compliant document in seconds.',
                },
                {
                  step: '3',
                  icon: '📥',
                  title: 'Review, edit & download PDF',
                  desc: 'Edit inline if needed, then download a print-ready PDF — or save to your documents library for later.',
                },
              ].map(s => (
                <div key={s.step} className="text-center">
                  <div className="w-10 h-10 bg-teal text-white font-bold text-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    {s.step}
                  </div>
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <h3 className="font-serif text-lg font-semibold text-ink mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-bold text-ink mb-2">Built for the way CS professionals work</h2>
              <p className="text-gray-500">Every feature designed around the Companies Act 2013 and ICSI Secretarial Standards</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: '⚡', title: 'Instant generation', desc: 'Board minutes in under 60 seconds. AGM notices in 30. Never type the same clauses twice.' },
                { icon: '🏛️', title: '100+ agenda items', desc: 'Pre-built resolutions for every situation — director changes, RPTs, capital increases, ROC filings.' },
                { icon: '🔗', title: 'MCA auto-fetch', desc: 'Enter a CIN and all company data populates automatically via live MCA database of 20L+ companies.' },
                { icon: '📑', title: 'Custom PDF templates', desc: 'Upload your firm\'s letterhead. Every generated document adopts your format exactly.' },
                { icon: '✅', title: 'SS-1 & SS-2 compliant', desc: 'Every document follows the ICSI Secretarial Standards and cites the exact Companies Act sections.' },
                { icon: '🔒', title: 'Your data, yours only', desc: 'Row-level security on Supabase. Only you can see your clients and documents. No sharing, ever.' },
              ].map(f => (
                <div key={f.title} className="card card-hover p-5">
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <h3 className="font-semibold text-ink mb-1.5 text-sm">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING OVERVIEW ─────────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6 bg-white border-y border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-serif text-3xl font-bold text-ink mb-2">Simple pricing that scales</h2>
              <p className="text-gray-500">Start free. Upgrade when you need more.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { name: 'Free', price: '₹0', docs: '5 docs/month', note: 'Forever free', cta: 'Get started', featured: false },
                { name: 'Professional', price: '₹499', docs: '100 docs/month', note: 'Most popular', cta: 'Start free trial', featured: true },
                { name: 'Firm', price: '₹1,500', docs: '200 docs/month', note: 'For firms', cta: 'Start free trial', featured: false },
              ].map(tier => (
                <div key={tier.name} className={`rounded-2xl p-5 text-center border ${tier.featured ? 'border-teal bg-teal/5' : 'border-gray-100 bg-white'}`}>
                  {tier.note && (
                    <div className={`text-xs font-semibold mb-2 ${tier.featured ? 'text-teal' : 'text-gray-400'}`}>{tier.note}</div>
                  )}
                  <div className="font-semibold text-ink mb-1">{tier.name}</div>
                  <div className="font-serif text-2xl font-bold text-ink mb-0.5">{tier.price}<span className="text-sm font-normal text-gray-400">/mo</span></div>
                  <div className="text-xs text-gray-400 mb-4">{tier.docs}</div>
                  <Link href="/pricing" className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${tier.featured ? 'bg-teal text-white hover:bg-teal-dark' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link href="/pricing" className="text-sm text-teal font-medium hover:underline">See full pricing & feature comparison →</Link>
            </div>
          </div>
        </section>

        {/* ── REFERRAL BADGE ───────────────────────────────────────────── */}
        <section className="py-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-teal/5 to-teal/10 border border-teal/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-ink text-sm mb-0.5">Earn 20% by referring colleagues</p>
                <p className="text-xs text-gray-500">Get ₹99.80/month per individual CS, ₹300/month per firm — recurring, no limits.</p>
              </div>
              <Link href="/referral" className="flex-shrink-0 text-sm font-semibold text-teal border border-teal/30 rounded-xl px-4 py-2 hover:bg-teal/5 transition-colors whitespace-nowrap">
                Learn more →
              </Link>
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ───────────────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center bg-ink text-white rounded-2xl p-10">
            <h2 className="font-serif text-3xl font-bold mb-3">Start generating today</h2>
            <p className="text-gray-400 mb-7">5 free documents. No credit card. No setup.</p>
            <Link href="/auth" className="btn btn-primary text-base px-8 py-3 bg-teal hover:bg-teal-dark">
              Create free account →
            </Link>
            <p className="text-xs text-gray-500 mt-4">Already have an account? <Link href="/auth" className="text-teal hover:underline">Sign in</Link></p>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-200 py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-serif font-bold text-ink">
              Secretary<span className="text-teal">OS</span>
            </span>
            <div className="flex items-center gap-5 text-sm text-gray-400">
              <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
              <Link href="/referral" className="hover:text-ink transition-colors">Referral</Link>
              <Link href="/auth" className="hover:text-ink transition-colors">Sign in</Link>
              <a href="mailto:pvsheg@gmail.com" className="hover:text-ink transition-colors">Contact</a>
            </div>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} SecretaryOS. Built for Indian CS professionals.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
