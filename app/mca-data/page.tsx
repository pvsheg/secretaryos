'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Stats { total_companies: number; active_companies: number }

const STATE_COUNTS = [
  { name: 'Maharashtra', count: 389387 },
  { name: 'Delhi', count: 273063 },
  { name: 'West Bengal', count: 170070 },
  { name: 'Uttar Pradesh', count: 160701 },
  { name: 'Karnataka', count: 135787 },
  { name: 'Tamil Nadu', count: 131803 },
  { name: 'Telangana', count: 115472 },
  { name: 'Gujarat', count: 113058 },
]
const max = STATE_COUNTS[0].count

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / 1500, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(ease * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])
  return <>{display.toLocaleString('en-IN')}</>
}

export default function MCADataPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL
    if (!url) return
    fetch(`${url}/stats`).then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const total = stats?.active_companies || 1998213

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
            Live MCA database — sourced from data.gov.in
          </div>
          <h1 className="font-serif text-5xl font-bold text-ink mb-3">
            <AnimatedNumber value={total} />
          </h1>
          <p className="text-slate-500 text-lg">active companies across India in our database</p>
          <p className="text-slate-400 text-sm mt-2">Type a CIN — company details appear in under a second. Free for every CS professional on SecretaryOS.</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { num: '38', label: 'States & UTs', sub: 'Pan-India coverage' },
            { num: '13', label: 'Data points', sub: 'Per company record' },
            { num: '< 1s', label: 'Lookup time', sub: 'Cloudflare edge' },
            { num: '₹0', label: 'Per lookup', sub: 'Included in plan' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-4">
              <div className="text-2xl font-semibold text-ink">{s.num}</div>
              <div className="text-xs font-medium text-slate-600 mt-1">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-ink mb-5 text-sm uppercase tracking-wider text-slate-400">Top states by company count</h2>
          <div className="space-y-4">
            {STATE_COUNTS.map(s => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="text-xs text-slate-500 w-28 text-right flex-shrink-0">{s.name}</div>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-ink rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
                <div className="text-xs text-slate-400 w-20 flex-shrink-0">{s.count.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h3 className="font-semibold text-ink text-sm mb-3">What auto-fills from a CIN</h3>
            <div className="flex flex-wrap gap-2">
              {['Company name', 'Registered office', 'Company type', 'Incorporation date', 'Authorised capital', 'Paid-up capital', 'ROC code'].map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{tag}</span>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h3 className="font-semibold text-ink text-sm mb-3">Company types covered</h3>
            <div className="flex flex-wrap gap-2">
              {['Private Limited', 'Public Limited', 'One Person Company', 'Section 8', 'Government', 'Foreign Company'].map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-100">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-ink text-white rounded-2xl p-8 text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">Try it yourself</h2>
          <p className="text-slate-400 text-sm mb-6">Add a client — type the CIN and watch the details appear instantly</p>
          <Link href="/clients/new" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink font-semibold rounded-xl hover:bg-slate-100 transition-colors text-sm">
            Add a client company →
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sourced from MCA via data.gov.in · Active companies only · Directors added manually or via MCA sync
        </p>
      </main>
    </div>
  )
}
