'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Director { name: string; din: string; designation: string; email: string }
const emptyDirector = (): Director => ({ name: '', din: '', designation: 'Director', email: '' })

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '', cin: '', registered_office: '',
    financial_year_end: 'March 31', authorised_capital: '', paid_up_capital: '',
  })
  const [directors, setDirectors] = useState<Director[]>([emptyDirector()])

  function updateForm(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }
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
        <p className="text-slate-500 text-sm mb-8">Store once, auto-populate in every document forever.</p>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-8">
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
                  <input className={inputCls} value={form.cin} onChange={e => updateForm('cin', e.target.value)} placeholder="U72900KA2019PTC112345" required />
                </div>
                <div>
                  <label className={labelCls}>Financial year end</label>
                  <select className={inputCls} value={form.financial_year_end} onChange={e => updateForm('financial_year_end', e.target.value)}>
                    <option>March 31</option>
                    <option>December 31</option>
                    <option>September 30</option>
                    <option>June 30</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Registered office address *</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.registered_office} onChange={e => updateForm('registered_office', e.target.value)} placeholder="4th Floor, Prestige Tower, MG Road, Bengaluru — 560001" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
            <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">2</span>
              Directors
            </h2>
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
                      <input className={inputCls} value={dir.din} onChange={e => updateDirector(idx, 'din', e.target.value)} placeholder="07654321" maxLength={8} />
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

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {loading ? 'Saving...' : 'Save client profile →'}
          </button>
        </form>
      </main>
    </div>
  )
}
