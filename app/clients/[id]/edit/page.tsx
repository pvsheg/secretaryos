'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Director { id?: string; name: string; din: string; designation: string; email: string }

const emptyDirector = (): Director => ({ name: '', din: '', designation: 'Director', email: '' })

const formatCapital = (val: string | number | null): string => {
  if (!val) return ''
  const num = typeof val === 'string' ? parseFloat(val.replace(/[,₹\s]/g, '')) : val
  if (isNaN(num)) return String(val)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const clientId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    company_name: '',
    cin: '',
    registered_office: '',
    email: '',
    financial_year_end: 'March 31',
    company_type: '',
    company_status: 'Active',
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

  useEffect(() => {
    async function loadClient() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data: client } = await supabase
        .from('clients')
        .select('*, directors(*)')
        .eq('id', clientId)
        .single()

      if (!client) { router.push('/clients'); return }

      setForm({
        company_name: client.company_name || '',
        cin: client.cin || '',
        registered_office: client.registered_office || '',
        email: (client as any).email || '',
        financial_year_end: client.financial_year_end || 'March 31',
        company_type: (client as any).company_type || '',
        company_status: (client as any).company_status || 'Active',
        company_category: (client as any).company_category || '',
        company_sub_category: (client as any).company_sub_category || '',
        authorised_capital: client.authorised_capital || '',
        paid_up_capital: client.paid_up_capital || '',
        registration_date: (client as any).registration_date || '',
        listing_status: (client as any).listing_status || 'Unlisted',
        state_code: (client as any).state_code || '',
        industrial_classification: (client as any).industrial_classification || '',
        roc_code: (client as any).roc_code || '',
      })

      const dirs = (client as any).directors || []
      setDirectors(dirs.length > 0
        ? dirs.map((d: any) => ({ id: d.id, name: d.name, din: d.din, designation: d.designation, email: d.email || '' }))
        : [emptyDirector()]
      )
      setFetching(false)
    }
    loadClient()
  }, [clientId])

  function updateForm(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }
  function updateDirector(idx: number, key: string, val: string) {
    setDirectors(d => d.map((dir, i) => i === idx ? { ...dir, [key]: val } : dir))
  }
  function addDirector() { setDirectors(d => [...d, emptyDirector()]) }
  function removeDirector(idx: number) { setDirectors(d => d.filter((_, i) => i !== idx)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const { error: clientErr } = await supabase
      .from('clients')
      .update({
        company_name: form.company_name,
        cin: form.cin,
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    if (clientErr) { setError(clientErr.message); setLoading(false); return }

    // Replace all directors: delete existing, insert current list
    const { error: delErr } = await supabase
      .from('directors')
      .delete()
      .eq('client_id', clientId)

    if (delErr) { setError(delErr.message); setLoading(false); return }

    const validDirs = directors.filter(d => d.name && d.din)
    if (validDirs.length) {
      const { error: dirErr } = await supabase.from('directors').insert(
        validDirs.map(({ id: _id, ...d }) => ({ ...d, client_id: clientId, is_active: true }))
      )
      if (dirErr) { setError(dirErr.message); setLoading(false); return }
    }

    router.push(`/clients/${clientId}`)
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors bg-white"
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
  const readonlyCls = "w-full px-4 py-2.5 border border-slate-100 rounded-xl text-sm bg-slate-50 text-slate-600"

  if (fetching) return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="pt-32 flex justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-ink rounded-full animate-spin"></div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/clients/${clientId}`} className="text-slate-400 hover:text-ink text-sm">← {form.company_name || 'Client'}</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-ink font-medium">Edit</span>
        </div>

        <h1 className="font-serif text-3xl font-bold text-ink mb-2">Edit client</h1>
        <p className="text-slate-500 text-sm mb-8">Update company details and directors.</p>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-6">{error}</div>}

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
                <input className={inputCls} value={form.company_name} onChange={e => updateForm('company_name', e.target.value)} required />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>CIN *</label>
                  <input className={`${inputCls} font-mono uppercase`} value={form.cin} onChange={e => updateForm('cin', e.target.value.toUpperCase())} required maxLength={21} />
                </div>
                <div>
                  <label className={labelCls}>ROC code</label>
                  <input className={inputCls} value={form.roc_code} onChange={e => updateForm('roc_code', e.target.value)} placeholder="RoC-Bangalore" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Registered office address *</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.registered_office} onChange={e => updateForm('registered_office', e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>Company email</label>
                <input className={inputCls} type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="info@company.com" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={form.state_code} onChange={e => updateForm('state_code', e.target.value)} placeholder="KA" />
                </div>
                <div>
                  <label className={labelCls}>Date of incorporation</label>
                  <input className={readonlyCls} value={form.registration_date} readOnly />
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
                <input className={inputCls} value={form.company_type} onChange={e => updateForm('company_type', e.target.value)} placeholder="Private / Public / OPC" />
              </div>
              <div>
                <label className={labelCls}>Company category</label>
                <input className={inputCls} value={form.company_category} onChange={e => updateForm('company_category', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Sub category</label>
                <input className={inputCls} value={form.company_sub_category} onChange={e => updateForm('company_sub_category', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Listing status</label>
                <select className={inputCls} value={form.listing_status} onChange={e => updateForm('listing_status', e.target.value)}>
                  <option>Unlisted</option>
                  <option>Listed</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Industrial classification (NIC)</label>
                <input className={inputCls} value={form.industrial_classification} onChange={e => updateForm('industrial_classification', e.target.value)} />
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
                <input className={inputCls} value={form.authorised_capital} onChange={e => updateForm('authorised_capital', e.target.value)} placeholder="e.g. 1000000" />
                {form.authorised_capital && <div className="text-xs text-slate-400 mt-1">{formatCapital(form.authorised_capital)}</div>}
              </div>
              <div>
                <label className={labelCls}>Paid-up capital</label>
                <input className={inputCls} value={form.paid_up_capital} onChange={e => updateForm('paid_up_capital', e.target.value)} placeholder="e.g. 500000" />
                {form.paid_up_capital && <div className="text-xs text-slate-400 mt-1">{formatCapital(form.paid_up_capital)}</div>}
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">4</span>
              Status
            </h2>
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
          </div>

          {/* DIRECTORS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">5</span>
              Directors
            </h2>
            <p className="text-xs text-slate-500 mb-4">Changes here replace the full director list for this client.</p>
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

          <div className="flex gap-3">
            <Link href={`/clients/${clientId}`} className="flex-1 py-3.5 border border-slate-200 text-ink font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm text-center">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm">
              {loading ? 'Saving...' : 'Save changes →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
