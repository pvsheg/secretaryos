'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Director { name: string; din: string; designation: string; email: string }
interface MCAResult {
  cin: string; company_name: string; company_status: string
  company_class: string; registered_office_address: string
  state_code: string; registration_date: string
  company_category: string; industrial_classification: string
}

const emptyDirector = (): Director => ({ name: '', din: '', designation: 'Director', email: '' })

const formatCapital = (val: string | number | null): string => {
  if (!val) return ''
  const num = typeof val === 'string' ? parseFloat(val.replace(/[,₹\s]/g, '')) : val
  if (isNaN(num)) return String(val)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')
  const [fetchOk, setFetchOk] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [cinInput, setCinInput] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const [nameResults, setNameResults] = useState<MCAResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<NodeJS.Timeout>()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    // Core
    company_name: '',
    cin: '',
    registered_office: '',
    email: '',
    financial_year_end: 'March 31',
    company_type: '',       // company_class from MCA
    company_status: 'Active',
    // MCA data columns
    company_category: '',
    company_sub_category: '',
    authorised_capital: '',
    paid_up_capital: '',
    registration_date: '',
    listing_status: 'Unlisted',
    state_code: '',
    industrial_classification: '',
    roc_code: '',
  })

  const [directors, setDirectors] = useState<Director[]>([emptyDirector()])

  // Debounced name search — call Worker directly
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
    }, 250)
  }, [nameSearch])


  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNameResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
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
      company_category: result.company_category || '',
      state_code: result.state_code || '',
      registration_date: result.registration_date || '',
      industrial_classification: result.industrial_classification || '',
    }))
    // Auto-fetch full CIN details to populate roc_code, capital, sub_category etc.
    fetchFromMCAByCin(result.cin)
  }

  function updateForm(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }
  function updateDirector(idx: number, key: string, val: string) {
    setDirectors(d => d.map((dir, i) => i === idx ? { ...dir, [key]: val } : dir))
  }
  function addDirector() { setDirectors(d => [...d, emptyDirector()]) }
  function removeDirector(idx: number) { setDirectors(d => d.filter((_, i) => i !== idx)) }

  async function fetchFromMCAByCin(cinValue: string) {
    const cin = cinValue.trim().toUpperCase()
    if (!cin || cin.length !== 21) return
    setFetching(true); setFetchOk(null); setFetchMsg('')
    try {
      const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL
      if (!workerUrl) throw new Error('Worker not configured')
      const res = await fetch(`${workerUrl}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin }),
      })
      const data = await res.json()

      setForm(f => ({
        ...f,
        cin: data.cin || cin,
        company_name: data.company_name || f.company_name,
        registered_office: data.registered_office_address || f.registered_office,
        company_status: data.company_status || f.company_status,
        company_type: data.company_class || data.company_type || f.company_type,
        company_category: data.company_category || f.company_category,
        company_sub_category: data.company_sub_category || f.company_sub_category,
        authorised_capital: data.authorized_capital ? String(data.authorized_capital) : f.authorised_capital,
        paid_up_capital: data.paidup_capital ? String(data.paidup_capital) : f.paid_up_capital,
        registration_date: data.registration_date || f.registration_date,
        listing_status: data.listing_status || f.listing_status,
        state_code: data.state_code || f.state_code,
        industrial_classification: data.industrial_classification || f.industrial_classification,
        roc_code: data.roc_code || f.roc_code,
      }))

      if (data.found) {
        setFetchOk(true)
        setFetchMsg('All available MCA data fetched. Review the details below and add directors.')
      } else {
        setFetchOk(false)
        setFetchMsg(data.message || 'Company not found. Please fill in details manually.')
      }
    } catch {
      setFetchOk(false)
      setFetchMsg('Could not reach MCA database. Please fill in details manually.')
    }
    setFetching(false)
  }

  async function fetchFromMCA() {
    const cin = cinInput.trim().toUpperCase()
    if (!cin || cin.length !== 21) {
      setFetchMsg('Please enter a valid 21-character CIN first.')
      setFetchOk(false); return
    }
    await fetchFromMCAByCin(cin)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const clientData = {
      user_id: session.user.id,
      company_name: form.company_name,
      cin: form.cin.trim().toUpperCase(),
      registered_office: form.registered_office,
      email: form.email,
      financial_year_end: form.financial_year_end,
      company_type: form.company_type,
      company_status: form.company_status,
      company_category: form.company_category,
      company_sub_category: form.company_sub_category,
      authorised_capital: form.authorised_capital,
      paid_up_capital: form.paid_up_capital,
      registration_date: form.registration_date || null,
      listing_status: form.listing_status,
      state_code: form.state_code,
      industrial_classification: form.industrial_classification,
      roc_code: form.roc_code,
      mca_last_synced: fetchOk ? new Date().toISOString() : null,
    }

    // Check for duplicate CIN before inserting
    const { data: existing } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('user_id', session.user.id)
      .eq('cin', form.cin.trim().toUpperCase())
      .single()

    if (existing) {
      setError(`A client with this CIN already exists: "${existing.company_name}". Each company can only be added once.`)
      setLoading(false); return
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients').insert(clientData).select().single()

    if (clientErr) {
      if (clientErr.code === '23505') {
        setError('A client with this CIN already exists in your account.')
      } else {
        setError(clientErr.message)
      }
      setLoading(false); return
    }

    const validDirs = directors.filter(d => d.name && d.din)
    if (validDirs.length) {
      const { error: dirErr } = await supabase.from('directors').insert(
        validDirs.map(d => ({ ...d, client_id: client.id, is_active: true }))
      )
      if (dirErr) { setError(dirErr.message); setLoading(false); return }
    }
    router.push(`/clients/${client.id}`)
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors bg-white"
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
  const readonlyCls = "w-full px-4 py-2.5 border border-slate-100 rounded-xl text-sm bg-slate-50 text-slate-600"

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/clients" className="text-slate-400 hover:text-ink text-sm">← Clients</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-ink font-medium">New client</span>
        </div>

        <h1 className="font-serif text-3xl font-bold text-ink mb-2">Add client company</h1>
        <p className="text-slate-500 text-sm mb-4">Search by company name or enter CIN — all MCA data loads automatically.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-6">
          <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            MCA data may not always be up to date. Please cross-check company details, capital structure, and especially director information against the{' '}
            <a href="https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
              MCA Master Data portal
            </a>{' '}
            before saving.
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-6">{error}</div>}

        {/* SEARCH */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-ink mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">✦</span>
            Find from MCA database
          </h2>
          <p className="text-xs text-slate-500 mb-4">Search by name or enter CIN — fetches all 13 data points automatically</p>

          <div className="relative mb-3">
            <label className={labelCls}>Search by company name</label>
            <input className={inputCls} value={nameSearch} onChange={e => setNameSearch(e.target.value)} onKeyDown={e => e.key === 'Escape' && setNameResults([])} placeholder="Type company name..." />
            {searchLoading && (
              <div className="absolute right-3 top-9">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-ink rounded-full animate-spin inline-block"></span>
              </div>
            )}
            {nameResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-64 overflow-y-auto">
                {nameResults.map(r => (
                  <button key={r.cin} type="button" onClick={() => selectFromSearch(r)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-none transition-colors">
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

          <div className="flex flex-col sm:flex-row gap-3">
            <input className={`${inputCls} flex-1 font-mono uppercase`} value={cinInput}
              onChange={e => setCinInput(e.target.value.toUpperCase())} placeholder="U72900KA2019PTC112345" maxLength={21} />
            <button type="button" onClick={fetchFromMCA} disabled={fetching}
              className="px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 sm:flex-shrink-0 flex items-center justify-center gap-2">
              {fetching ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></span>Fetching...</> : '↓ Fetch all data'}
            </button>
          </div>

          {fetchMsg && (
            <div className={`mt-3 p-3 rounded-xl text-sm flex items-start gap-2 ${fetchOk ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
              <span className="flex-shrink-0">{fetchOk ? '✓' : '⚠'}</span>{fetchMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* COMPANY IDENTITY */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">1</span>
              Company identity
            </h2>
            <div className="grid gap-4">
              <div>
                <label className={labelCls}>Company name *</label>
                <input className={inputCls} value={form.company_name} onChange={e => updateForm('company_name', e.target.value)} placeholder="Acme Technologies Private Limited" required />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>CIN *</label>
                  <input className={`${inputCls} font-mono uppercase`} value={form.cin} onChange={e => updateForm('cin', e.target.value.toUpperCase())} placeholder="U72900KA2019PTC112345" required maxLength={21} />
                </div>
                <div>
                  <label className={labelCls}>ROC code</label>
                  <input className={readonlyCls} value={form.roc_code} readOnly placeholder="Auto-fetched from MCA" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Registered office address *</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.registered_office} onChange={e => updateForm('registered_office', e.target.value)} placeholder="4th Floor, Prestige Tower, MG Road, Bengaluru — 560001" required />
              </div>
              <div>
                <label className={labelCls}>Company email</label>
                <input className={inputCls} type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="info@company.com" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>State</label>
                  <input className={readonlyCls} value={form.state_code} readOnly placeholder="Auto from CIN" />
                </div>
                <div>
                  <label className={labelCls}>Date of incorporation</label>
                  <input className={readonlyCls} value={form.registration_date} readOnly placeholder="Auto from MCA" />
                </div>
              </div>
            </div>
          </div>

          {/* COMPANY CLASSIFICATION */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">2</span>
              Company classification
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company class</label>
                <input className={readonlyCls} value={form.company_type} readOnly placeholder="Private / Public / OPC" />
              </div>
              <div>
                <label className={labelCls}>Company category</label>
                <input className={readonlyCls} value={form.company_category} readOnly placeholder="Auto from MCA" />
              </div>
              <div>
                <label className={labelCls}>Sub category</label>
                <input className={readonlyCls} value={form.company_sub_category} readOnly placeholder="Auto from MCA" />
              </div>
              <div>
                <label className={labelCls}>Listing status</label>
                <input className={readonlyCls} value={form.listing_status} readOnly placeholder="Listed / Unlisted" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Industrial classification (NIC)</label>
                <input className={readonlyCls} value={form.industrial_classification} readOnly placeholder="Auto from MCA" />
              </div>
            </div>
          </div>

          {/* CAPITAL STRUCTURE */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">3</span>
              Capital structure
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
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
                <div className="relative">
                  <input className={inputCls} value={form.authorised_capital} onChange={e => updateForm('authorised_capital', e.target.value)} placeholder="e.g. 1000000" />
                  {form.authorised_capital && (
                    <div className="text-xs text-slate-400 mt-1">{formatCapital(form.authorised_capital)}</div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Paid-up capital</label>
                <div>
                  <input className={inputCls} value={form.paid_up_capital} onChange={e => updateForm('paid_up_capital', e.target.value)} placeholder="e.g. 500000" />
                  {form.paid_up_capital && (
                    <div className="text-xs text-slate-400 mt-1">{formatCapital(form.paid_up_capital)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COMPANY STATUS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">4</span>
              Status
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company status</label>
                <select className={inputCls} value={form.company_status} onChange={e => updateForm('company_status', e.target.value)}>
                  <option>Active</option>
                  <option>Strike Off</option>
                  <option>Under Liquidation</option>
                  <option>Amalgamated</option>
                  <option>Dormant</option>
                </select>
              </div>
              {fetchOk && (
                <div className="flex items-center">
                  <div className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    ✓ Verified from MCA · {new Date().toLocaleDateString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DIRECTORS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">5</span>
              Directors
            </h2>
            <p className="text-xs text-slate-500 mb-4">Enter director details manually — you have this as their CS handling the filings. Director data is not available in bulk from MCA.</p>
            <div className="space-y-4">
              {directors.map((dir, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Director {idx + 1}</span>
                    {directors.length > 1 && (
                      <button type="button" onClick={() => removeDirector(idx)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
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
