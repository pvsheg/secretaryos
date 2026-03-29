'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Director { name: string; din: string; designation: string; email: string }
interface MCAResult { cin: string; company_name: string; company_status: string; company_class: string; registered_office_address: string; state_code: string; registration_date: string }

const emptyDirector = (): Director => ({ name: '', din: '', designation: 'Director', email: '' })

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')
  const [fetchOk, setFetchOk] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [cinInput, setCinInput] = useState('')

  // Company name search
  const [nameSearch, setNameSearch] = useState('')
  const [nameResults, setNameResults] = useState<MCAResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<NodeJS.Timeout>()

  const [form, setForm] = useState({
    company_name: '', cin: '', registered_office: '',
    financial_year_end: 'March 31', authorised_capital: '',
    paid_up_capital: '', company_type: '', company_status: 'Active',
  })
  const [directors, setDirectors] = useState<Director[]>([emptyDirector()])

  // Debounced company name search
  // Call Worker directly — it has CORS enabled so no need to proxy through Next.js
  useEffect(() => {
    if (nameSearch.length < 3) { setNameResults([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL
        if (!workerUrl) { setSearchLoading(false); return }
        const res = await fetch(`${workerUrl}/search?q=${encodeURIComponent(nameSearch)}&limit=15`)
        const data = await res.json()
        setNameResults(data.results || [])
      } catch { setNameResults([]) }
      setSearchLoading(false)
    }, 400)
  }, [nameSearch])

  function selectFromSearch(result: MCAResult) {
    setCinInput(result.cin)
    setNameSearch('')
    setNameResults([])
    setForm(f => ({
      ...f,
      cin: result.cin,
      company_name: result.company_name || '',
      registered_office: result.registered_office_address || '',
      company_status: result.company_status || 'Active',
      company_type: result.company_class || '',
    }))
    setFetchOk(true)
    setFetchMsg('Company selected from MCA database. Please review details and add directors below.')
  }

  function updateForm(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }
  function updateDirector(idx: number, key: string, val: string) {
    setDirectors(d => d.map((dir, i) => i === idx ? { ...dir, [key]: val } : dir))
  }
  function addDirector() { setDirectors(d => [...d, emptyDirector()]) }
  function removeDirector(idx: number) { setDirectors(d => d.filter((_, i) => i !== idx)) }

  async function fetchFromMCA() {
    const cin = cinInput.trim().toUpperCase()
    if (!cin || cin.length !== 21) {
      setFetchMsg('Please enter a valid 21-character CIN first.')
      setFetchOk(false)
      return
    }
    setFetching(true); setFetchOk(null); setFetchMsg('')
    try {
      const res = await fetch('/api/fetch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin }),
      })
      const data = await res.json()
      if (data.error && !data.found === false) {
        setFetchOk(false)
        setFetchMsg(data.error)
        setForm(f => ({ ...f, cin }))
      } else {
        setForm(f => ({
          ...f,
          cin: data.cin || cin,
          company_name: data.company_name || f.company_name,
          registered_office: data.registered_office_address || f.registered_office,
          company_status: data.company_status || f.company_status,
          company_type: data.company_type || data.company_class || f.company_type,
          authorised_capital: data.authorized_capital ? String(data.authorized_capital) : f.authorised_capital,
          paid_up_capital: data.paidup_capital ? String(data.paidup_capital) : f.paid_up_capital,
        }))
        if (data.found) {
          setFetchOk(true)
          setFetchMsg('Company details fetched from MCA database. Please review and add directors.')
        } else {
          setFetchOk(false)
          setFetchMsg(data.message || 'Company not found in database. Please fill in details manually.')
        }
      }
    } catch {
      setFetchOk(false)
      setFetchMsg('Could not reach MCA database. Please fill in details manually.')
      setForm(f => ({ ...f, cin: cinInput.toUpperCase() }))
    }
    setFetching(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({ ...form, user_id: session.user.id })
      .select().single()

    if (clientErr) { setError(clientErr.message); setLoading(false); return }

    const validDirs = directors.filter(d => d.name && d.din)
    if (validDirs.length) {
      const { error: dirErr } = await supabase.from('directors').insert(
        validDirs.map(d => ({ ...d, client_id: client.id, is_active: true }))
      )
      if (dirErr) { setError(dirErr.message); setLoading(false); return }
    }
    router.push(`/clients/${client.id}`)
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors bg-white"
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/clients" className="text-slate-400 hover:text-ink text-sm">← Clients</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-ink font-medium">New client</span>
        </div>

        <h1 className="font-serif text-3xl font-bold text-ink mb-2">Add client company</h1>
        <p className="text-slate-500 text-sm mb-8">Search by company name or enter CIN to auto-fetch details from MCA.</p>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-6">{error}</div>}

        {/* SEARCH SECTION */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-ink mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">✦</span>
            Find company from MCA database
          </h2>
          <p className="text-xs text-slate-500 mb-4">Search by company name or enter CIN directly</p>

          {/* Company name search */}
          <div className="relative mb-3">
            <label className={labelCls}>Search by company name</label>
            <input
              className={inputCls}
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              placeholder="Type company name — e.g. Acme Technologies"
            />
            {searchLoading && (
              <div className="absolute right-3 top-9">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-ink rounded-full animate-spin inline-block"></span>
              </div>
            )}
            {nameResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-64 overflow-y-auto">
                {nameResults.map(r => (
                  <button
                    key={r.cin}
                    type="button"
                    onClick={() => selectFromSearch(r)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-none transition-colors"
                  >
                    <div className="font-semibold text-sm text-ink">{r.company_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.cin} · {r.company_class} · {r.company_status}</div>
                    <div className="text-xs text-slate-400 truncate">{r.registered_office_address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-xs text-slate-400">or enter CIN directly</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          {/* CIN input + fetch */}
          <div className="flex gap-3">
            <input
              className={`${inputCls} flex-1 font-mono uppercase`}
              value={cinInput}
              onChange={e => setCinInput(e.target.value.toUpperCase())}
              placeholder="U72900KA2019PTC112345"
              maxLength={21}
            />
            <button type="button" onClick={fetchFromMCA} disabled={fetching}
              className="px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex-shrink-0 flex items-center gap-2">
              {fetching
                ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></span>Fetching...</>
                : '↓ Fetch from MCA'}
            </button>
          </div>

          {fetchMsg && (
            <div className={`mt-3 p-3 rounded-xl text-sm flex items-start gap-2 ${fetchOk ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
              <span className="flex-shrink-0">{fetchOk ? '✓' : '⚠'}</span>
              {fetchMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* COMPANY DETAILS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">1</span>
              Company details
            </h2>
            <div className="grid gap-4">
              <div>
                <label className={labelCls}>Company name *</label>
                <input className={inputCls} value={form.company_name} onChange={e => updateForm('company_name', e.target.value)} placeholder="Acme Technologies Private Limited" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>CIN *</label>
                  <input className={`${inputCls} font-mono uppercase`} value={form.cin} onChange={e => updateForm('cin', e.target.value.toUpperCase())} placeholder="U72900KA2019PTC112345" required maxLength={21} />
                </div>
                <div>
                  <label className={labelCls}>Company type</label>
                  <input className={inputCls} value={form.company_type} onChange={e => updateForm('company_type', e.target.value)} placeholder="Private Limited" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Registered office address *</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.registered_office} onChange={e => updateForm('registered_office', e.target.value)} placeholder="4th Floor, Prestige Tower, MG Road, Bengaluru — 560001" required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Financial year end</label>
                  <select className={inputCls} value={form.financial_year_end} onChange={e => updateForm('financial_year_end', e.target.value)}>
                    <option>March 31</option>
                    <option>December 31</option>
                    <option>September 30</option>
                    <option>June 30</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Authorised capital</label>
                  <input className={inputCls} value={form.authorised_capital} onChange={e => updateForm('authorised_capital', e.target.value)} placeholder="₹10,00,000" />
                </div>
                <div>
                  <label className={labelCls}>Paid-up capital</label>
                  <input className={inputCls} value={form.paid_up_capital} onChange={e => updateForm('paid_up_capital', e.target.value)} placeholder="₹5,00,000" />
                </div>
              </div>
            </div>
          </div>

          {/* DIRECTORS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">2</span>
              Directors
            </h2>
            <p className="text-xs text-slate-500 mb-4">Enter director details manually — you have this information as the CS handling their filings.</p>
            <div className="space-y-4">
              {directors.map((dir, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Director {idx + 1}</span>
                    {directors.length > 1 && (
                      <button type="button" onClick={() => removeDirector(idx)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Full name *</label>
                      <input className={inputCls} value={dir.name} onChange={e => updateDirector(idx, 'name', e.target.value)} placeholder="Anil Kumar Sharma" />
                    </div>
                    <div>
                      <label className={labelCls}>DIN *</label>
                      <input className={`${inputCls} font-mono`} value={dir.din} onChange={e => updateDirector(idx, 'din', e.target.value)} placeholder="07654321" maxLength={8} />
                    </div>
                    <div>
                      <label className={labelCls}>Designation</label>
                      <select className={inputCls} value={dir.designation} onChange={e => updateDirector(idx, 'designation', e.target.value)}>
                        <option>Director</option>
                        <option>Managing Director</option>
                        <option>Whole-time Director</option>
                        <option>Independent Director</option>
                        <option>Nominee Director</option>
                        <option>Chairman</option>
                        <option>Additional Director</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Email (optional)</label>
                      <input className={inputCls} value={dir.email} onChange={e => updateDirector(idx, 'email', e.target.value)} placeholder="director@company.com" type="email" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addDirector} className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:text-ink transition-colors">
                + Add another director
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm">
            {loading ? 'Saving...' : 'Save client profile →'}
          </button>
        </form>
      </main>
    </div>
  )
}
