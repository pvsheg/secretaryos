'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Client {
  id: string
  company_name: string
  cin: string
  registered_office: string
  financial_year_end: string
  directors: { name: string; din: string; designation: string }[]
}

const DOC_TYPES = [
  { id: 'board_minutes', label: 'Board meeting minutes', icon: '📋', desc: 'Section 118 compliant' },
  { id: 'agm_notice', label: 'AGM notice', icon: '📢', desc: 'SS-2 compliant' },
  { id: 'roc_filing', label: 'ROC filing resolution', icon: '🗂️', desc: 'MCA compliant' },
]

const LOADING_STEPS = [
  'Reading client profile',
  'Applying Companies Act 2013 rules',
  'Drafting statutory resolutions',
  'Formatting for SS-1 compliance',
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
    setOutput('')
    setRawText('')
    setSaved(false)
  }

  async function generate() {
    if (!selectedClient) return
    setLoading(true); setOutput(''); setRawText(''); setSaved(false); setStep(0); setLimitError('')
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 700)
    const start = Date.now()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.id, doc_type: docType,
          company_name: selectedClient.company_name, cin: selectedClient.cin,
          registered_office: selectedClient.registered_office,
          financial_year_end: selectedClient.financial_year_end, ...form,
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
      metadata: { meeting_date: form.meeting_date, meeting_venue: form.meeting_venue, agenda_items: form.agenda_items },
    })
    setSaved(true)
  }

  async function downloadPDF() {
    if (!rawText || !selectedClient) return
    setDownloading(true)

    // Load jsPDF dynamically
    await new Promise<void>((resolve, reject) => {
      if ((window as any).jspdf) { resolve(); return }
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })

    const { jsPDF } = (window as any).jspdf
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentW = pageW - margin * 2
    let y = margin

    function addHeader() {
      pdf.setFillColor(10, 15, 30)
      pdf.rect(0, 0, pageW, 14, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(184, 151, 58)
      pdf.text('SECRETARYOS', margin, 9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(160, 160, 160)
      pdf.text('Companies Act 2013 Compliant Document', pageW - margin, 9, { align: 'right' })
    }

    function addFooter(pageNum: number, totalPages: number) {
      pdf.setFillColor(248, 248, 248)
      pdf.rect(0, pageH - 10, pageW, 10, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(150, 150, 150)
      pdf.text('Generated by SecretaryOS — AI Compliance Copilot for Company Secretaries', margin, pageH - 4)
      pdf.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' })
    }

    function checkPage(neededHeight: number) {
      if (y + neededHeight > pageH - 16) {
        pdf.addPage()
        addHeader()
        y = 24
      }
    }

    addHeader()
    y = 24

    const lines = rawText.split('\n')

    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed) { y += 2; return }

      const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 4 && /[A-Z]/.test(trimmed)
      const isTitle = isAllCaps && (trimmed.includes('MINUTES') || trimmed.includes('NOTICE') || trimmed.includes('RESOLUTION'))
      const isSection = isAllCaps && !isTitle && trimmed.length < 50
      const isResolution = trimmed.startsWith('RESOLVED THAT') || trimmed.startsWith('FURTHER RESOLVED')
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-')
      const isCenter = trimmed.includes('CIN:') || trimmed.includes('Pvt Ltd') || trimmed.includes('Private Limited') || trimmed.includes('Incorporated under')

      if (isTitle) {
        checkPage(16)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13)
        pdf.setTextColor(10, 15, 30)
        pdf.text(trimmed, pageW / 2, y, { align: 'center' })
        y += 3
        pdf.setDrawColor(184, 151, 58)
        pdf.setLineWidth(0.6)
        pdf.line(margin + 20, y, pageW - margin - 20, y)
        y += 8
      } else if (isSection) {
        checkPage(12)
        y += 2
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(184, 151, 58)
        pdf.text(trimmed, margin, y)
        y += 1.5
        pdf.setDrawColor(230, 230, 230)
        pdf.setLineWidth(0.3)
        pdf.line(margin, y, pageW - margin, y)
        y += 5
      } else if (isResolution) {
        checkPage(10)
        const keyword = trimmed.startsWith('FURTHER RESOLVED THAT') ? 'FURTHER RESOLVED THAT' : 'RESOLVED THAT'
        const rest = trimmed.substring(keyword.length).trim()
        const full = keyword + (rest ? ' ' + rest : '')
        const wrapped = pdf.splitTextToSize(full, contentW - 6)
        checkPage(wrapped.length * 5 + 4)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(10, 15, 30)
        pdf.text(keyword, margin + 4, y)
        if (rest) {
          pdf.setFont('helvetica', 'normal')
          const restWrapped = pdf.splitTextToSize(rest, contentW - 6 - pdf.getTextWidth(keyword) - 3)
          pdf.text(restWrapped[0] || '', margin + 4 + pdf.getTextWidth(keyword) + 2, y)
          if (restWrapped.length > 1) {
            y += 5
            pdf.text(restWrapped.slice(1), margin + 4, y)
            y += (restWrapped.length - 1) * 5
          }
        }
        y += 7
      } else if (isBullet) {
        const text = trimmed.substring(1).trim()
        const wrapped = pdf.splitTextToSize(text, contentW - 10)
        checkPage(wrapped.length * 5 + 2)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text('•', margin + 4, y)
        pdf.text(wrapped, margin + 9, y)
        y += wrapped.length * 5 + 2
      } else if (isCenter) {
        const wrapped = pdf.splitTextToSize(trimmed, contentW)
        checkPage(wrapped.length * 5 + 2)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(80, 80, 80)
        pdf.text(wrapped, pageW / 2, y, { align: 'center' })
        y += wrapped.length * 5 + 2
      } else if (trimmed.includes('____')) {
        checkPage(14)
        y += 2
        pdf.setDrawColor(100, 100, 100)
        pdf.setLineWidth(0.4)
        if (trimmed.toLowerCase().includes('secretary') || trimmed.toLowerCase().includes('chairman')) {
          pdf.line(margin + 4, y, margin + 60, y)
          pdf.line(pageW - margin - 60, y, pageW - margin - 4, y)
        }
        y += 4
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(80, 80, 80)
        pdf.text(trimmed.replace(/_+/g, '').trim(), margin + 4, y)
        y += 6
      } else {
        const wrapped = pdf.splitTextToSize(trimmed, contentW - 4)
        checkPage(wrapped.length * 5 + 2)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text(wrapped, margin + 4, y)
        y += wrapped.length * 5 + 2
      }
    })

    // Add footers to all pages
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      addFooter(i, totalPages)
    }

    const fileName = `${selectedClient.company_name.replace(/[^a-z0-9]/gi, '_')}_${docType}_${form.meeting_date || 'document'}.pdf`
    pdf.save(fileName)
    setDownloading(false)
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors bg-white'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5'

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-8">
      {/* LEFT FORM */}
      <div className="space-y-6">
        <div>
          <p className={labelCls}>Document type</p>
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setDocType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${docType === t.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="text-xl mb-1">{t.icon}</div>
                <div className={`text-xs font-semibold leading-tight ${docType === t.id ? 'text-white' : 'text-ink'}`}>{t.label}</div>
                <div className="text-xs text-slate-400">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

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
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Client profile loaded</p>
              <p className="text-sm font-semibold text-ink">{selectedClient.company_name}</p>
              <p className="text-xs text-slate-500">CIN: {selectedClient.cin}</p>
              <p className="text-xs text-slate-500">{selectedClient.directors?.length || 0} directors on record</p>
            </div>

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
                <textarea className={`${inputCls} resize-none`} rows={4} value={form.agenda_items} onChange={e => setForm(f => ({ ...f, agenda_items: e.target.value }))} placeholder={`1. Approval of Q1 financials — approved unanimously\n2. Director appointment — approved`} required />
              </div>
            </div>

            {limitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Demo limit reached</p>
                  <p className="text-xs text-red-600 leading-relaxed">{limitError}</p>
                  <p className="text-xs text-red-500 mt-2">Want full access? <a href="mailto:pvsheg@gmail.com" className="underline font-medium">Contact us</a></p>
                </div>
              </div>
            )}

            <button onClick={generate} disabled={loading || !form.meeting_date || !form.agenda_items}
              className="w-full py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Generating...</>
              ) : (
                <>✦ Generate {DOC_TYPES.find(d => d.id === docType)?.label}</>
              )}
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
              <button onClick={downloadPDF} disabled={downloading}
                className="flex-1 py-2.5 bg-ink text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {downloading ? (
                  <><span className="inline-block w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></span>Preparing PDF...</>
                ) : '↓ Download PDF'}
              </button>
              <button onClick={saveDocument} disabled={saved}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors border ${saved ? 'bg-green-50 text-green-700 border-green-200' : 'border-slate-200 text-ink hover:bg-slate-50'}`}>
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
