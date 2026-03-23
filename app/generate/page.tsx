'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Client { id: string; company_name: string; cin: string; registered_office: string; financial_year_end: string; directors: { name: string; din: string; designation: string }[] }

const DOC_TYPES = [
  { id: 'board_minutes', label: 'Board meeting minutes', icon: '📋', desc: 'Section 118 compliant' },
  { id: 'agm_notice', label: 'AGM notice', icon: '📢', desc: 'SS-2 compliant' },
  { id: 'roc_filing', label: 'ROC filing resolution', icon: '🗂️', desc: 'MCA compliant' },
]

function GenerateForm() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [docType, setDocType] = useState('board_minutes')
  const [form, setForm] = useState({ meeting_date: '', meeting_venue: '', directors_present: '', agenda_items: '' })
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [genTime, setGenTime] = useState('')
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    supabase.from('clients').select('*, directors(name, din, designation)').order('company_name').then(({ data }) => {
      if (data) {
        setClients(data as Client[])
        const preselect = searchParams.get('client')
        if (preselect) {
          const c = data.find((c: Client) => c.id === preselect)
          if (c) selectClient(c as Client)
        }
      }
    })
  }, [])

  function selectClient(c: Client) {
    setSelectedClient(c)
    const dirStr = c.directors?.map(d => `${d.name} — DIN ${d.din}, ${d.designation}`).join('\n') || ''
    setForm(f => ({ ...f, directors_present: dirStr, meeting_venue: `Registered office, ${c.registered_office.split(',').pop()?.trim() || ''}` }))
    setOutput(''); setSaved(false)
  }

  const LOADING_STEPS = ['Reading client profile', 'Applying Companies Act 2013 rules', 'Drafting statutory resolutions', 'Formatting for SS-1 compliance']

  async function generate() {
    if (!selectedClient) return
    setLoading(true); setOutput(''); setSaved(false); setStep(0)
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 700)
    const start = Date.now()

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClient.id,
        doc_type: docType,
        company_name: selectedClient.company_name,
        cin: selectedClient.cin,
        registered_office: selectedClient.registered_office,
        financial_year_end: selectedClient.financial_year_end,
        ...form,
      })
    })

    clearInterval(stepTimer)
    const data = await res.json()
    setGenTime(((Date.now() - start) / 1000).toFixed(1) + 's')
    setOutput(data.content || '')
    setLoading(false)
  }

  async function saveDocument() {
    if (!selectedClient || !output) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const title = `${selectedClient.company_name} — ${DOC_TYPES.find(d => d.id === docType)?.label} — ${form.meeting_date}`
    await supabase.from('documents').insert({
      client_id: selectedClient.id, user_id: session.user.id,
      type: docType, title, content: output,
      metadata: { meeting_date: form.meeting_date, meeting_venue: form.meeting_venue, agenda_items: form.agenda_items }
    })
    setSaved(true)
  }

  function downloadTxt() {
    const content = document.getElementById('doc-output')?.innerText || output
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = `${selectedClient?.company_name}_${docType}_${form.meeting_date}.txt`; a.click()
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors bg-white"
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-8">
      {/* LEFT — FORM */}
      <div className="space-y-6">
        {/* DOC TYPE */}
        <div>
          <p className={labelCls}>Document type</p>
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setDocType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${docType === t.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="text-xl mb-1">{t.icon}</div>
                <div className={`text-xs font-semibold leading-tight ${docType === t.id ? 'text-white' : 'text-ink'}`}>{t.label}</div>
                <div className={`text-xs ${docType === t.id ? 'text-slate-400' : 'text-slate-400'}`}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CLIENT SELECT */}
        <div>
          <label className={labelCls}>Client company *</label>
          {!clients.length ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              No clients yet. <Link href="/clients/new" className="font-semibold underline">Add a client first →</Link>
            </div>
          ) : (
            <select className={inputCls} value={selectedClient?.id || ''} onChange={e => { const c = clients.find(c => c.id === e.target.value); if (c) selectClient(c) }}>
              <option value="">Select a client company...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          )}
        </div>

        {selectedClient && (
          <>
            {/* CLIENT PREVIEW */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Client profile loaded</p>
              <p className="text-sm font-semibold text-ink">{selectedClient.company_name}</p>
              <p className="text-xs text-slate-500">CIN: {selectedClient.cin}</p>
              <p className="text-xs text-slate-500">{selectedClient.directors?.length || 0} directors on record</p>
            </div>

            {/* MEETING DETAILS */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Meeting date *</label>
                  <input type="date" className={inputCls} value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Venue</label>
                  <input className={inputCls} value={form.meeting_venue} onChange={e => setForm(f => ({ ...f, meeting_venue: e.target.value }))} placeholder="Registered office" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Directors present</label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.directors_present} onChange={e => setForm(f => ({ ...f, directors_present: e.target.value }))} placeholder="Auto-filled from client profile" />
              </div>
              <div>
                <label className={labelCls}>Agenda items & decisions *</label>
                <textarea className={`${inputCls} resize-none`} rows={4} value={form.agenda_items} onChange={e => setForm(f => ({ ...f, agenda_items: e.target.value }))} placeholder="1. Approval of Q1 financials — approved unanimously&#10;2. Director appointment — approved&#10;3. Related party transaction — approved" required />
              </div>
            </div>

            <button onClick={generate} disabled={loading || !form.meeting_date || !form.agenda_items}
              className="w-full py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Generating...</>
              ) : (
                <>✦ Generate {DOC_TYPES.find(d => d.id === docType)?.label}</>
              )}
            </button>
          </>
        )}
      </div>

      {/* RIGHT — OUTPUT */}
      <div className="sticky top-24">
        {loading && (
          <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-ink rounded-full animate-spin mx-auto mb-6"></div>
            <p className="font-semibold text-ink mb-4">Generating your document</p>
            <div className="space-y-2">
              {LOADING_STEPS.map((s, i) => (
                <div key={s} className={`text-sm px-4 py-2 rounded-lg transition-all ${i === step ? 'bg-gold-pale text-gold font-medium' : i < step ? 'text-green-600 opacity-70' : 'text-slate-400'}`}>
                  {i < step ? '✓ ' : i === step ? '→ ' : ''}{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !output && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-64">
            <div className="text-4xl mb-3">📄</div>
            <p className="font-semibold text-ink mb-1">Document appears here</p>
            <p className="text-sm text-slate-500">Fill the form and click generate</p>
          </div>
        )}

        {!loading && output && (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="bg-ink px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Generated in {genTime}</span>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/20">✓ Section 118 compliant</span>
            </div>
            <div id="doc-output" className="p-6 max-h-[500px] overflow-y-auto doc-preview" dangerouslySetInnerHTML={{ __html: output }} />
            <div className="border-t border-slate-100 px-5 py-3 flex gap-3">
              <button onClick={downloadTxt} className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-ink hover:bg-slate-50 transition-colors">↓ Download</button>
              <button onClick={saveDocument} disabled={saved} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${saved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-ink text-white hover:bg-slate-800'}`}>
                {saved ? '✓ Saved' : 'Save to documents'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-ink mb-1">Generate document</h1>
        <p className="text-slate-500 text-sm">Companies Act 2013 compliant output in under 60 seconds</p>
        <Suspense fallback={<div className="mt-8 text-slate-500">Loading...</div>}>
          <GenerateForm />
        </Suspense>
      </main>
    </div>
  )
}
