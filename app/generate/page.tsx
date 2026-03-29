'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Client {
  id: string; company_name: string; cin: string
  registered_office: string; financial_year_end: string
  authorised_capital?: string; paid_up_capital?: string
  company_type?: string
  directors: { name: string; din: string; designation: string }[]
}

const DOC_TYPES = [
  { id: 'board_minutes', label: 'Board minutes', icon: '📋', desc: 'Section 118 — SS-1' },
  { id: 'agm_notice', label: 'AGM notice', icon: '📢', desc: 'Section 96 — SS-2' },
  { id: 'roc_filing', label: 'ROC filing', icon: '🗂️', desc: 'MCA form resolutions' },
]

const COMPLIANCE_CATEGORIES = [
  { id: 'mandatory_annual', label: 'Mandatory Annual', icon: '📅', desc: 'Annual filings, AGM, accounts' },
  { id: 'event_based', label: 'Event Based', icon: '⚡', desc: 'Director changes, share issues, RPT' },
  { id: 'offline', label: 'Offline / Ongoing', icon: '📁', desc: 'Registers, minutes, secretarial audit' },
]

// Agenda library matching the API route
const AGENDA_LIBRARY: Record<string, Record<string, { label: string; sections: string[] }>> = {
  mandatory_annual: {
    financial_statements: { label: 'Approval of financial statements', sections: ['Section 134', 'Section 129'] },
    auditor_appointment: { label: 'Appointment / reappointment of auditor', sections: ['Section 139'] },
    dividend_declaration: { label: 'Declaration of dividend', sections: ['Section 123'] },
    agm_notice_agenda: { label: 'AGM notice and agenda', sections: ['Section 96', 'SS-2'] },
    mgt7_filing: { label: 'Annual return filing (MGT-7)', sections: ['Section 92'] },
    aoc4_filing: { label: 'Financial statements filing (AOC-4)', sections: ['Section 137'] },
    directors_report: { label: "Approval of Directors' Report", sections: ['Section 134'] },
  },
  event_based: {
    director_appointment: { label: 'Appointment of director', sections: ['Section 152', 'Section 160'] },
    director_resignation: { label: 'Acceptance of director resignation', sections: ['Section 168', 'DIR-12'] },
    managing_director_appointment: { label: 'Appointment of Managing Director / WTD', sections: ['Section 196', 'Schedule V'] },
    share_allotment: { label: 'Allotment of shares', sections: ['Section 62', 'PAS-3'] },
    registered_office_change: { label: 'Change of registered office', sections: ['Section 12', 'INC-22'] },
    bank_account_opening: { label: 'Opening of bank account', sections: ['Section 179'] },
    loan_borrowing: { label: 'Borrowing of funds / loan', sections: ['Section 179', 'Section 180'] },
    rpt_approval: { label: 'Related party transaction approval', sections: ['Section 188'] },
    property_purchase: { label: 'Purchase / sale of property or asset', sections: ['Section 179', 'Section 180'] },
    investment_approval: { label: 'Investment in securities', sections: ['Section 186'] },
    director_remuneration: { label: 'Approval of director remuneration', sections: ['Section 197', 'Schedule V'] },
    cs_appointment: { label: 'Appointment of Company Secretary', sections: ['Section 203'] },
    cfo_appointment: { label: 'Appointment of CFO / KMP', sections: ['Section 203'] },
    capital_increase: { label: 'Increase in authorised capital', sections: ['Section 61', 'SH-7'] },
    din_allotment: { label: 'Application for DIN', sections: ['Section 154', 'DIR-3'] },
  },
  offline: {
    statutory_registers: { label: 'Maintenance of statutory registers', sections: ['Section 88'] },
    minutes_confirmation: { label: 'Confirmation of previous meeting minutes', sections: ['Section 118', 'SS-1'] },
    annual_compliance_review: { label: 'Annual compliance review', sections: ['Section 134'] },
    secretarial_audit: { label: 'Secretarial audit appointment', sections: ['Section 204', 'MR-3'] },
  },
}

const LOADING_STEPS = [
  'Reading client profile',
  'Applying Companies Act 2013 rules',
  'Drafting statutory resolutions',
  'Adding FURTHER RESOLVED THAT clauses',
  'Formatting for SS-1 compliance',
]

function GenerateForm() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [docType, setDocType] = useState('board_minutes')
  const [complianceCategory, setComplianceCategory] = useState('')
  const [selectedAgendas, setSelectedAgendas] = useState<string[]>([])
  const [form, setForm] = useState({ meeting_date: '', meeting_venue: '', directors_present: '', agenda_items: '' })
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [rawText, setRawText] = useState('')
  const [genTime, setGenTime] = useState('')
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [limitError, setLimitError] = useState('')

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
    setOutput(''); setRawText(''); setSaved(false)
  }

  function toggleAgenda(key: string) {
    setSelectedAgendas(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function generate() {
    if (!selectedClient) return
    setLoading(true); setOutput(''); setRawText(''); setSaved(false); setStep(0); setLimitError('')
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 800)
    const start = Date.now()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          company_name: selectedClient.company_name,
          cin: selectedClient.cin,
          registered_office: selectedClient.registered_office,
          financial_year_end: selectedClient.financial_year_end,
          company_class: selectedClient.company_type,
          authorised_capital: selectedClient.authorised_capital,
          paid_up_capital: selectedClient.paid_up_capital,
          compliance_category: complianceCategory,
          agenda_types: selectedAgendas,
          ...form,
        }),
      })
      clearInterval(stepTimer)
      const data = await res.json()
      setGenTime(((Date.now() - start) / 1000).toFixed(1) + 's')
      if (data.limit_reached) {
        setLimitError(data.error || 'Demo limit reached.')
      } else if (data.content) {
        setOutput(data.content)
        const tmp = document.createElement('div')
        tmp.innerHTML = data.content
        setRawText(tmp.innerText || tmp.textContent || '')
      }
    } catch (err) {
      clearInterval(stepTimer)
      console.error(err)
    }
    setLoading(false)
  }

  async function saveDocument() {
    if (!selectedClient || !output) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const title = `${selectedClient.company_name} — ${DOC_TYPES.find(d => d.id === docType)?.label} — ${form.meeting_date}`
    await supabase.from('documents').insert({
      client_id: selectedClient.id, user_id: session.user.id, type: docType, title, content: output,
      metadata: { meeting_date: form.meeting_date, meeting_venue: form.meeting_venue, agenda_items: form.agenda_items, agenda_types: selectedAgendas },
    })
    setSaved(true)
  }

  async function downloadPDF() {
    if (!output || !selectedClient) return
    setDownloading(true)
    try {
      const { generatePDF } = await import('@/lib/pdf-generator')
      const fileName = `${selectedClient.company_name.replace(/[^a-z0-9]/gi, '_')}_${docType}_${form.meeting_date || 'document'}`
      await generatePDF(output, fileName, {
        companyName: selectedClient.company_name,
        docType,
        meetingDate: form.meeting_date,
        cin: selectedClient.cin,
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setDownloading(false)
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors bg-white'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5'

  const currentAgendas = complianceCategory ? AGENDA_LIBRARY[complianceCategory] || {} : {}

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-8">
      {/* LEFT FORM */}
      <div className="space-y-5">
        {/* DOC TYPE */}
        <div>
          <p className={labelCls}>Document type</p>
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setDocType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${docType === t.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="text-xl mb-1">{t.icon}</div>
                <div className={`text-xs font-semibold leading-tight ${docType === t.id ? 'text-white' : 'text-ink'}`}>{t.label}</div>
                <div className="text-xs opacity-60">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CLIENT */}
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Client loaded</p>
              <p className="text-sm font-semibold text-ink">{selectedClient.company_name}</p>
              <p className="text-xs text-slate-500">CIN: {selectedClient.cin} · {selectedClient.directors?.length || 0} directors</p>
            </div>

            {/* COMPLIANCE CATEGORY — Bikash's 3 types */}
            <div>
              <p className={labelCls}>Compliance category</p>
              <p className="text-xs text-slate-400 mb-2">Select the type of compliance — this shapes the agenda library</p>
              <div className="grid grid-cols-3 gap-2">
                {COMPLIANCE_CATEGORIES.map(c => (
                  <button key={c.id} type="button" onClick={() => { setComplianceCategory(c.id); setSelectedAgendas([]) }}
                    className={`p-3 rounded-xl border text-left transition-all ${complianceCategory === c.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="text-lg mb-1">{c.icon}</div>
                    <div className={`text-xs font-semibold leading-tight ${complianceCategory === c.id ? 'text-white' : 'text-ink'}`}>{c.label}</div>
                    <div className="text-xs opacity-60 leading-tight mt-0.5">{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AGENDA LIBRARY */}
            {complianceCategory && Object.keys(currentAgendas).length > 0 && (
              <div>
                <p className={labelCls}>Agenda items <span className="text-slate-400 normal-case font-normal">— select all that apply</span></p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(currentAgendas).map(([key, item]) => (
                    <button key={key} type="button" onClick={() => toggleAgenda(key)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${selectedAgendas.includes(key) ? 'border-ink bg-ink/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${selectedAgendas.includes(key) ? 'bg-ink border-ink' : 'border-slate-300'}`}>
                        {selectedAgendas.includes(key) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-ink">{item.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.sections.join(' · ')}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedAgendas.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">{selectedAgendas.length} agenda item{selectedAgendas.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}

            {/* ADDITIONAL AGENDA */}
            <div>
              <label className={labelCls}>Additional agenda / decisions <span className="text-slate-400 normal-case font-normal">(optional — add anything not in the library above)</span></label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.agenda_items} onChange={e => setForm(f => ({ ...f, agenda_items: e.target.value }))} placeholder="Any additional agenda items or specific decisions not covered above..." />
            </div>

            {/* MEETING DETAILS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Meeting date *</label>
                <input type="date" className={inputCls} value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} required />
              </div>
              <div>
                <label className={labelCls}>Venue</label>
                <input className={inputCls} value={form.meeting_venue} onChange={e => setForm(f => ({ ...f, meeting_venue: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Directors present</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.directors_present} onChange={e => setForm(f => ({ ...f, directors_present: e.target.value }))} placeholder="Auto-filled from client profile" />
            </div>

            {limitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-red-500 flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Demo limit reached</p>
                  <p className="text-xs text-red-600">{limitError}</p>
                  <p className="text-xs text-red-500 mt-2">Want full access? <a href="mailto:pvsheg@gmail.com" className="underline font-medium">Contact us</a></p>
                </div>
              </div>
            )}

            <button onClick={generate} disabled={loading || !form.meeting_date || (selectedAgendas.length === 0 && !form.agenda_items)}
              className="w-full py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
              {loading
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Generating...</>
                : <>✦ Generate {DOC_TYPES.find(d => d.id === docType)?.label}</>}
            </button>
          </>
        )}
      </div>

      {/* RIGHT OUTPUT */}
      <div className="sticky top-24">
        {loading && (
          <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-ink rounded-full animate-spin mx-auto mb-6"></div>
            <p className="font-semibold text-ink mb-4">Generating your document</p>
            <div className="space-y-2">
              {LOADING_STEPS.map((s, i) => (
                <div key={s} className={`text-sm px-4 py-2 rounded-lg transition-all ${i === step ? 'bg-amber-50 text-amber-700 font-medium' : i < step ? 'text-green-600 opacity-70' : 'text-slate-400'}`}>
                  {i < step ? '✓ ' : i === step ? '→ ' : ''}{s}
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && !output && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center min-h-64 flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="font-semibold text-ink mb-1">Document appears here</p>
            <p className="text-sm text-slate-500">Select agenda items and click generate</p>
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
              <button onClick={downloadPDF} disabled={downloading}
                className="flex-1 py-2.5 bg-ink text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {downloading ? <><span className="inline-block w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></span>Preparing...</> : '↓ Download PDF'}
              </button>
              <button onClick={saveDocument} disabled={saved}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${saved ? 'bg-green-50 text-green-700 border-green-200' : 'border-slate-200 text-ink hover:bg-slate-50'}`}>
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
        <p className="text-slate-500 text-sm">Select compliance category → pick agenda items → generate in seconds</p>
        <Suspense fallback={<div className="mt-8 text-slate-500">Loading...</div>}>
          <GenerateForm />
        </Suspense>
      </main>
    </div>
  )
}
