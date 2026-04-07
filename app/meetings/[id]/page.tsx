'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { AGENDA_LIBRARY } from '@/lib/agenda-library'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Director {
  id: string; name: string; din: string; designation: string
}
interface ClientData {
  id: string; company_name: string; cin: string; registered_office: string
  directors: Director[]
}
interface Meeting {
  id: string; client_id: string; meeting_date: string; meeting_time: string
  meeting_type: string; venue_type: string; venue_address?: string
  status: string; created_at: string; clients: ClientData
}
interface MeetingDoc {
  id: string; doc_subtype: string; title: string; created_at: string
  content: string; signatory_director_id?: string
  metadata?: Record<string, any>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEETING_TYPE_LABELS: Record<string, string> = {
  board: 'Board', agm: 'AGM', egm: 'EGM', custom: 'Custom',
}
const MEETING_TYPE_COLORS: Record<string, string> = {
  board: 'bg-blue-50 text-blue-700',
  agm: 'bg-purple-50 text-purple-700',
  egm: 'bg-orange-50 text-orange-700',
  custom: 'bg-slate-100 text-slate-600',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatShortDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
}

function DocPreview({ content, onDownload, downloading }: {
  content: string; onDownload: (html: string) => void; downloading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [savedContent, setSavedContent] = useState(content)
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSavedContent(content) }, [content])
  useEffect(() => { if (divRef.current) divRef.current.innerHTML = savedContent }, [savedContent])

  function saveEdit() {
    const html = divRef.current?.innerHTML || savedContent
    setSavedContent(html)
    setEditing(false)
  }
  function cancelEdit() {
    if (divRef.current) divRef.current.innerHTML = savedContent
    setEditing(false)
  }

  return (
    <div className="mt-4 bg-white border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60 border-b border-slate-50">
        <span className="text-xs text-slate-400">{editing ? 'Click any text to edit' : 'Document preview'}</span>
        <div className="flex gap-2 items-center">
          {editing ? (
            <>
              <button onClick={saveEdit} className="text-xs font-semibold text-teal hover:text-teal-dark transition-colors">Save changes</button>
              <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-ink transition-colors">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs font-medium text-slate-500 hover:text-ink transition-colors">✎ Edit</button>
          )}
        </div>
      </div>
      <div
        ref={divRef}
        className={`p-5 max-h-80 overflow-y-auto doc-preview text-sm focus:outline-none ${editing ? 'bg-amber-50/10 cursor-text' : ''}`}
        contentEditable={editing}
        suppressContentEditableWarning
      />
      <div className="border-t border-slate-100 px-4 py-3">
        <button
          onClick={() => onDownload(savedContent)}
          disabled={downloading}
          className="w-full py-2.5 bg-ink text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {downloading ? <><Spinner />Preparing PDF...</> : '↓ Download PDF'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const meetingId = params.id as string

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [documents, setDocuments] = useState<MeetingDoc[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [pageError, setPageError] = useState('')

  // UI state
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [showAgendaForm, setShowAgendaForm] = useState(false)
  const [showMinutesForm, setShowMinutesForm] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<'notice' | 'agenda' | 'minutes' | null>(null)
  const [downloading, setDownloading] = useState<string>('')

  // Notice form
  const [noticeSignatory, setNoticeSignatory] = useState('')
  const [noticeDate, setNoticeDate] = useState(() => new Date().toISOString().split('T')[0])
  const [meetingNumber, setMeetingNumber] = useState('1')
  const [noticeSubject, setNoticeSubject] = useState('')
  const [noticeVenue, setNoticeVenue] = useState('')
  const [noticeSpecialInstructions, setNoticeSpecialInstructions] = useState('')
  const [noticePending, setNoticePending] = useState(false)
  const [noticeError, setNoticeError] = useState('')

  // Agenda form
  const [selectedAgendaItems, setSelectedAgendaItems] = useState<{ key: string; notes: string; notesOpen: boolean; label?: string; sections?: string[] }[]>([])
  const [agendaSpecial, setAgendaSpecial] = useState('')
  const [agendaPending, setAgendaPending] = useState(false)
  const [agendaError, setAgendaError] = useState('')
  const [customAgendas, setCustomAgendas] = useState<{ id: string; label: string; sections: string }[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customSections, setCustomSections] = useState('')

  // Minutes form
  const [minutesChairman, setMinutesChairman] = useState('')
  const [minutesPresent, setMinutesPresent] = useState<string[]>([])
  const [minutesPlace, setMinutesPlace] = useState('')
  const [minutesConclusion, setMinutesConclusion] = useState('')
  const [minutesResolutions, setMinutesResolutions] = useState<Record<number, string>>({})
  const [minutesPending, setMinutesPending] = useState(false)
  const [minutesError, setMinutesError] = useState('')

  const [deletePending, setDeletePending] = useState<string>('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sos_custom_agendas')
      if (stored) setCustomAgendas(JSON.parse(stored))
    } catch {}
  }, [])

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchMeeting = useCallback(async () => {
    setLoadingPage(true)
    setPageError('')
    try {
      const res = await fetch(`/api/meetings/${meetingId}`)
      const data = await res.json()
      if (!res.ok) { setPageError(data.error || 'Failed to load meeting'); return }
      setMeeting(data.meeting)
      setDocuments(data.documents || [])

      // Pre-fill minutes place from registered office
      const client = data.meeting.clients as ClientData
      if (client?.registered_office && !minutesPlace) {
        const city = client.registered_office.split(',').slice(-2, -1)[0]?.trim() || ''
        setMinutesPlace(city)
      }
      // Pre-fill all directors as present in minutes form
      if (client?.directors?.length && minutesPresent.length === 0) {
        setMinutesPresent(client.directors.map((d: Director) => d.id))
        if (!minutesChairman && client.directors[0]) setMinutesChairman(client.directors[0].id)
      }
    } catch (err: any) {
      setPageError(err.message)
    } finally {
      setLoadingPage(false)
    }
  }, [meetingId])

  useEffect(() => { fetchMeeting() }, [fetchMeeting])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const noticeDoc = documents.find(d => d.doc_subtype === 'notice')
  const agendaDoc = documents.find(d => d.doc_subtype === 'agenda')
  const minutesDoc = documents.find(d => d.doc_subtype === 'minutes')
  const client = meeting?.clients
  const directors: Director[] = client?.directors || []

  const venue = meeting
    ? meeting.venue_type === 'registered_office'
      ? client?.registered_office || ''
      : meeting.venue_type === 'video'
        ? 'Video Conference'
        : meeting.venue_address || client?.registered_office || ''
    : ''

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function markComplete() {
    if (!meeting) return
    await fetch(`/api/meetings/${meetingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    fetchMeeting()
  }

  async function deleteMeeting() {
    if (!confirm('Delete this meeting and all its documents? This cannot be undone.')) return
    await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' })
    router.push('/meetings')
  }

  async function generateNotice() {
    if (!noticeDate || !meetingNumber || !noticeSubject) { setNoticeError('Please fill all notice fields.'); return }
    setNoticePending(true); setNoticeError('')
    try {
      const res = await fetch(`/api/meetings/${meetingId}/notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatory_director_id: noticeSignatory,
          date_of_notice: noticeDate,
          meeting_number: Number(meetingNumber),
          subject: noticeSubject,
          venue_override: noticeVenue || undefined,
          special_instructions: noticeSpecialInstructions || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setNoticeError(data.error || 'Generation failed'); return }
      setShowNoticeForm(false)
      setPreviewDoc('notice')
      await fetchMeeting()
    } catch (err: any) { setNoticeError(err.message) }
    finally { setNoticePending(false) }
  }

  async function generateAgenda() {
    if (selectedAgendaItems.length === 0) { setAgendaError('Add at least one agenda item.'); return }
    setAgendaPending(true); setAgendaError('')
    try {
      const res = await fetch(`/api/meetings/${meetingId}/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agenda_items: selectedAgendaItems.map(({ key, notes, label, sections }) =>
            AGENDA_LIBRARY[key] ? { key, notes } : { label: label || key, sections: sections || [], notes }
          ),
          special_instructions: agendaSpecial,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAgendaError(data.error || 'Generation failed'); return }
      setShowAgendaForm(false)
      setPreviewDoc('agenda')
      await fetchMeeting()
    } catch (err: any) { setAgendaError(err.message) }
    finally { setAgendaPending(false) }
  }

  async function generateMinutes() {
    if (!minutesChairman) { setMinutesError('Please select a chairman.'); return }
    setMinutesPending(true); setMinutesError('')
    try {
      const res = await fetch(`/api/meetings/${meetingId}/minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directors_present_ids: minutesPresent,
          chairman_director_id: minutesChairman,
          place_of_signing: minutesPlace,
          time_of_conclusion: minutesConclusion || undefined,
          resolutions: Object.entries(minutesResolutions)
            .filter(([, notes]) => notes.trim())
            .map(([idx, notes]) => ({ idx: Number(idx), notes })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMinutesError(data.error || 'Generation failed'); return }
      setShowMinutesForm(false)
      setPreviewDoc('minutes')
      await fetchMeeting()
    } catch (err: any) { setMinutesError(err.message) }
    finally { setMinutesPending(false) }
  }

  async function deleteDoc(subtype: string) {
    setDeletePending(subtype)
    try {
      await fetch(`/api/meetings/${meetingId}/${subtype}`, { method: 'DELETE' })
      await fetchMeeting()
      if (previewDoc === subtype) setPreviewDoc(null)
    } finally { setDeletePending('') }
  }

  async function downloadPDF(doc: MeetingDoc, htmlOverride?: string) {
    setDownloading(doc.doc_subtype)
    try {
      const { generatePDF } = await import('@/lib/pdf-generator')
      const fileName = `${client?.company_name?.replace(/[^a-z0-9]/gi, '_') || 'doc'}_${doc.doc_subtype}_${meeting?.meeting_date || ''}`
      const meta: import('@/lib/pdf-generator').PDFMetadata = {
        companyName: client?.company_name || '',
        docType: doc.doc_subtype,
        meetingDate: meeting?.meeting_date || '',
        cin: client?.cin || '',
        customTemplate: null,
      }
      // Pass signatory for notice/agenda from own metadata; fall back to notice metadata for older agenda docs
      const sigMeta = doc.doc_subtype === 'notice'
        ? doc.metadata
        : doc.doc_subtype === 'agenda'
          ? (doc.metadata?.signatory_name ? doc.metadata : (noticeDoc?.metadata ?? null))
          : null
      if (sigMeta) {
        meta.signatoryName = sigMeta.signatory_name || ''
        meta.signatoryDesignation = sigMeta.signatory_designation || ''
        meta.signatoryDin = sigMeta.signatory_din || ''
      }
      await generatePDF(htmlOverride ?? doc.content, fileName, meta)
    } catch (err) {
      console.error('PDF error:', err)
    } finally { setDownloading('') }
  }

  function addAgendaItem(key: string, label?: string, sections?: string[]) {
    setSelectedAgendaItems(prev => prev.some(i => i.key === key) ? prev : [...prev, { key, notes: '', notesOpen: false, label, sections }])
  }
  function removeAgendaItem(idx: number) {
    setSelectedAgendaItems(prev => prev.filter((_, i) => i !== idx))
  }
  function moveAgendaItem(idx: number, dir: -1 | 1) {
    setSelectedAgendaItems(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  function updateAgendaItemNotes(idx: number, notes: string) {
    setSelectedAgendaItems(prev => prev.map((item, i) => i === idx ? { ...item, notes } : item))
  }
  function toggleAgendaItemNotes(idx: number) {
    setSelectedAgendaItems(prev => prev.map((item, i) => i === idx ? { ...item, notesOpen: !item.notesOpen } : item))
  }
  function saveCustomAgenda() {
    if (!customLabel.trim()) return
    const id = `custom_${Date.now()}`
    const newItem = { id, label: customLabel.trim(), sections: customSections.trim() }
    const updated = [...customAgendas, newItem]
    setCustomAgendas(updated)
    try { localStorage.setItem('sos_custom_agendas', JSON.stringify(updated)) } catch {}
    addAgendaItem(id, newItem.label, newItem.sections ? newItem.sections.split(',').map(s => s.trim()).filter(Boolean) : [])
    setCustomLabel('')
    setCustomSections('')
    setShowAddCustom(false)
  }
  function deleteCustomAgenda(id: string) {
    const updated = customAgendas.filter(c => c.id !== id)
    setCustomAgendas(updated)
    try { localStorage.setItem('sos_custom_agendas', JSON.stringify(updated)) } catch {}
    setSelectedAgendaItems(prev => prev.filter(i => i.key !== id))
  }
  function togglePresent(id: string) {
    setMinutesPresent(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-colors bg-gray-50'
  const labelCls = 'block text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1.5'

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-app-bg">
        <Navbar />
        <main className="pt-24 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-ink rounded-full animate-spin"></div>
        </main>
      </div>
    )
  }

  if (pageError || !meeting) {
    return (
      <div className="min-h-screen bg-app-bg">
        <Navbar />
        <main className="pt-24 px-6 max-w-xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-700 font-semibold mb-2">Failed to load meeting</p>
            <p className="text-sm text-red-600 mb-4">{pageError}</p>
            <Link href="/meetings" className="text-sm text-ink underline">Back to meetings</Link>
          </div>
        </main>
      </div>
    )
  }

  const previewContent = previewDoc === 'notice' ? noticeDoc?.content
    : previewDoc === 'agenda' ? agendaDoc?.content
    : previewDoc === 'minutes' ? minutesDoc?.content
    : null

  const previewDocObj = previewDoc === 'notice' ? noticeDoc
    : previewDoc === 'agenda' ? agendaDoc
    : previewDoc === 'minutes' ? minutesDoc
    : null

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/meetings" className="hover:text-ink transition-colors">Meetings</Link>
          <span>/</span>
          <span className="text-ink truncate">{client?.company_name}</span>
        </div>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink">{client?.company_name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${MEETING_TYPE_COLORS[meeting.meeting_type]}`}>
                  {MEETING_TYPE_LABELS[meeting.meeting_type]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[meeting.status]}`}>
                  {meeting.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mb-1">CIN: {client?.cin}</p>
              <p className="text-sm text-slate-600">
                {formatDisplayDate(meeting.meeting_date)} &middot; {formatTime(meeting.meeting_time)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {meeting.status === 'scheduled' && (
                <button onClick={markComplete}
                  className="px-3 py-2 text-xs font-medium border border-green-200 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  Mark Complete
                </button>
              )}
              <button onClick={deleteMeeting}
                className="px-3 py-2 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Left — document cards */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── NOTICE CARD ──────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <h2 className="text-sm font-semibold text-ink">Board Meeting Notice</h2>
                  {noticeDoc && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">✓ Generated</span>}
                </div>
                {!noticeDoc && !showNoticeForm && (
                  <button
                    onClick={() => { setShowNoticeForm(true); setShowAgendaForm(false); setShowMinutesForm(false) }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-slate-800 transition-colors"
                  >
                    + Generate Notice
                  </button>
                )}
                {noticeDoc && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewDoc(previewDoc === 'notice' ? null : 'notice')}
                      className="text-xs font-medium text-teal hover:text-teal-dark transition-colors">
                      {previewDoc === 'notice' ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => { setShowNoticeForm(true); setShowAgendaForm(false); setShowMinutesForm(false) }}
                      className="text-xs font-medium text-slate-500 hover:text-ink transition-colors">
                      Regenerate
                    </button>
                    <button onClick={() => deleteDoc('notice')} disabled={deletePending === 'notice'}
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                      {deletePending === 'notice' ? '...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>

              {/* Notice details */}
              {noticeDoc && !showNoticeForm && (
                <div className="text-xs text-slate-500 space-y-0.5 mb-2">
                  {noticeDoc.metadata?.meeting_number && (
                    <p>Meeting: <span className="font-medium text-ink">{noticeDoc.metadata.meeting_number === 1 ? '1st' : noticeDoc.metadata.meeting_number === 2 ? '2nd' : noticeDoc.metadata.meeting_number === 3 ? '3rd' : `${noticeDoc.metadata.meeting_number}th`} Board Meeting ({noticeDoc.metadata.financial_year})</span></p>
                  )}
                  <p>Signatory: <span className="font-medium text-ink">{noticeDoc.metadata?.signatory_name || '—'}</span></p>
                  <p>Date of notice: <span className="font-medium text-ink">{noticeDoc.metadata?.date_of_notice ? formatDisplayDate(noticeDoc.metadata.date_of_notice) : '—'}</span></p>
                  <p className="text-slate-400">Created {formatShortDate(noticeDoc.created_at)}</p>
                </div>
              )}

              {/* Notice form */}
              {showNoticeForm && (
                <div className="space-y-4 mt-2 pt-4 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Meeting number *</label>
                      <input
                        type="number" min="1" className={inputCls}
                        value={meetingNumber}
                        onChange={e => setMeetingNumber(e.target.value)}
                        placeholder="e.g. 1"
                      />
                      <p className="text-xs text-slate-400 mt-1">e.g. 1 → "1st Board Meeting"</p>
                    </div>
                    <div>
                      <label className={labelCls}>Date of Notice *</label>
                      <input type="date" className={inputCls} value={noticeDate} onChange={e => setNoticeDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Subject *</label>
                    <input
                      type="text" className={inputCls}
                      value={noticeSubject}
                      onChange={e => setNoticeSubject(e.target.value)}
                      placeholder="e.g. Notice of 1st Board Meeting (of 2024-25) of the Board of Directors"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Signatory Director <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                    <select className={inputCls} value={noticeSignatory} onChange={e => setNoticeSignatory(e.target.value)}>
                      <option value="">Select signatory...</option>
                      {directors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} — {d.designation} (DIN: {d.din})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Venue (optional override)</label>
                    <input
                      type="text" className={inputCls}
                      value={noticeVenue}
                      onChange={e => setNoticeVenue(e.target.value)}
                      placeholder="Leave blank to use meeting venue"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Special instructions <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={noticeSpecialInstructions}
                      onChange={e => setNoticeSpecialInstructions(e.target.value)}
                      placeholder="e.g. Include a specific clause, add a particular note..."
                    />
                  </div>
                  {noticeError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{noticeError}</p>}
                  <div className="flex gap-2">
                    <button onClick={generateNotice} disabled={noticePending}
                      className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {noticePending ? <><Spinner />Generating...</> : '✦ Generate Notice'}
                    </button>
                    <button onClick={() => { setShowNoticeForm(false); setNoticeError('') }}
                      className="px-4 py-2.5 border border-slate-200 text-sm text-ink rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Notice preview */}
              {previewDoc === 'notice' && noticeDoc && !showNoticeForm && (
                <DocPreview
                  content={noticeDoc.content}
                  onDownload={(html) => downloadPDF(noticeDoc, html)}
                  downloading={downloading === 'notice'}
                />
              )}

              {/* Empty state */}
              {!noticeDoc && !showNoticeForm && (
                <p className="text-xs text-slate-400">Issue a formal notice to all directors at least 7 days before the meeting.</p>
              )}
            </div>

            {/* ── AGENDA CARD ──────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <h2 className="text-sm font-semibold text-ink">Meeting Agenda</h2>
                  {agendaDoc && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">✓ Generated</span>}
                </div>
                {!agendaDoc && !showAgendaForm && (
                  <button
                    onClick={() => { setShowAgendaForm(true); setShowNoticeForm(false); setShowMinutesForm(false) }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-slate-800 transition-colors"
                  >
                    + Generate Agenda
                  </button>
                )}
                {agendaDoc && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewDoc(previewDoc === 'agenda' ? null : 'agenda')}
                      className="text-xs font-medium text-teal hover:text-teal-dark transition-colors">
                      {previewDoc === 'agenda' ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => { setShowAgendaForm(true); setShowNoticeForm(false); setShowMinutesForm(false) }}
                      className="text-xs font-medium text-slate-500 hover:text-ink transition-colors">
                      Regenerate
                    </button>
                    <button onClick={() => deleteDoc('agenda')} disabled={deletePending === 'agenda'}
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                      {deletePending === 'agenda' ? '...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>

              {agendaDoc && !showAgendaForm && (
                <div className="text-xs text-slate-500 space-y-0.5 mb-2">
                  <p>Items: <span className="font-medium text-ink">{agendaDoc.metadata?.item_count || (agendaDoc.metadata?.agenda_items?.length ?? '—')}</span></p>
                  <p className="text-slate-400">Created {formatShortDate(agendaDoc.created_at)}</p>
                </div>
              )}

              {showAgendaForm && (
                <div className="space-y-4 mt-2 pt-4 border-t border-slate-50">

                  {/* ── Library picker ── */}
                  <div>
                    <label className={labelCls}>Add agenda items <span className="normal-case font-normal text-slate-400">— click to add</span></label>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(AGENDA_LIBRARY).map(([key, item]) => {
                        const alreadyAdded = selectedAgendaItems.some(i => i.key === key)
                        return (
                          <button key={key} type="button" onClick={() => addAgendaItem(key)} disabled={alreadyAdded}
                            className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${alreadyAdded ? 'border-slate-100 bg-slate-50 opacity-40 cursor-default' : 'border-slate-100 hover:border-teal hover:bg-teal/5 bg-white'}`}>
                            <span className={`mt-0.5 flex-shrink-0 text-xs font-bold w-4 ${alreadyAdded ? 'text-green-500' : 'text-teal'}`}>{alreadyAdded ? '✓' : '+'}</span>
                            <div>
                              <div className="text-sm font-medium text-ink">{item.label}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{item.sections.join(' · ')}</div>
                            </div>
                          </button>
                        )
                      })}
                      {/* Custom items in picker */}
                      {customAgendas.length > 0 && (
                        <>
                          <div className="pt-1 pb-0.5 px-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Custom items</span>
                          </div>
                          {customAgendas.map(ca => {
                            const alreadyAdded = selectedAgendaItems.some(i => i.key === ca.id)
                            return (
                              <div key={ca.id} className={`w-full flex items-start gap-3 p-2.5 rounded-lg border transition-all ${alreadyAdded ? 'border-slate-100 bg-slate-50 opacity-40' : 'border-slate-100 bg-white'}`}>
                                <button type="button" onClick={() => addAgendaItem(ca.id, ca.label, ca.sections ? ca.sections.split(',').map(s => s.trim()).filter(Boolean) : [])} disabled={alreadyAdded}
                                  className={`flex-shrink-0 mt-0.5 text-xs font-bold w-4 ${alreadyAdded ? 'text-green-500' : 'text-teal'}`}>{alreadyAdded ? '✓' : '+'}</button>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-ink">{ca.label}</div>
                                  {ca.sections && <div className="text-xs text-slate-400 mt-0.5">{ca.sections}</div>}
                                </div>
                                <button type="button" onClick={() => deleteCustomAgenda(ca.id)}
                                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors text-xs">✕</button>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>

                    {/* Add custom agenda */}
                    {!showAddCustom ? (
                      <button type="button" onClick={() => setShowAddCustom(true)}
                        className="mt-2 text-sm font-medium text-teal hover:text-teal-dark transition-colors flex items-center gap-1">
                        + Add custom agenda item
                      </button>
                    ) : (
                      <div className="mt-2 p-3 border border-teal/30 rounded-xl bg-teal/5 space-y-2">
                        <div>
                          <input
                            type="text"
                            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 bg-white"
                            placeholder="Agenda item title *"
                            value={customLabel}
                            onChange={e => setCustomLabel(e.target.value)}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 bg-white"
                            placeholder="Sections / references (optional, e.g. Section 179, SS-1)"
                            value={customSections}
                            onChange={e => setCustomSections(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={saveCustomAgenda} disabled={!customLabel.trim()}
                            className="px-3 py-1.5 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
                            Save &amp; Add
                          </button>
                          <button type="button" onClick={() => { setShowAddCustom(false); setCustomLabel(''); setCustomSections('') }}
                            className="px-3 py-1.5 border border-slate-200 text-sm text-ink rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Selected items (ordered, with notes) ── */}
                  {selectedAgendaItems.length > 0 && (
                    <div>
                      <label className={labelCls}>Selected agenda — {selectedAgendaItems.length} item{selectedAgendaItems.length > 1 ? 's' : ''}</label>
                      <div className="space-y-2">
                        {selectedAgendaItems.map((item, idx) => {
                          const lib = AGENDA_LIBRARY[item.key]
                          const label = lib?.label || item.label || item.key
                          const sections = lib?.sections || item.sections || []
                          return (
                            <div key={`${item.key}-${idx}`} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                              <div className="flex items-start gap-2.5 p-3">
                                {/* Order badge */}
                                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
                                {/* Label */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-ink leading-snug">{label}</div>
                                  {sections.length > 0 && <div className="text-xs text-slate-400 mt-0.5">{sections.join(' · ')}</div>}
                                  {item.notes && !item.notesOpen && (
                                    <div className="text-sm text-teal mt-1 truncate">📝 {item.notes}</div>
                                  )}
                                </div>
                                {/* Controls — larger, always visible */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button type="button" onClick={() => moveAgendaItem(idx, -1)} disabled={idx === 0}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-ink hover:bg-slate-100 hover:border-slate-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-sm font-semibold">↑</button>
                                  <button type="button" onClick={() => moveAgendaItem(idx, 1)} disabled={idx === selectedAgendaItems.length - 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-ink hover:bg-slate-100 hover:border-slate-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-sm font-semibold">↓</button>
                                  <button type="button" onClick={() => toggleAgendaItemNotes(idx)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors text-sm ${item.notesOpen ? 'border-teal text-teal bg-teal/10' : 'border-slate-200 text-slate-500 hover:text-teal hover:border-teal hover:bg-teal/5'}`}
                                    title="Add drafting notes">✎</button>
                                  <button type="button" onClick={() => removeAgendaItem(idx)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors text-sm font-semibold">✕</button>
                                </div>
                              </div>
                              {item.notesOpen && (
                                <div className="px-3 pb-3 border-t border-slate-100 pt-2.5">
                                  <p className="text-sm text-slate-400 mb-1.5">Drafting instructions — the AI will incorporate these into the agenda for this item</p>
                                  <textarea
                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 bg-slate-50 resize-none"
                                    rows={3}
                                    placeholder="e.g. Director being appointed is John Smith, DIN 12345678, appointed w.e.f. 1st April 2024 as Additional Director..."
                                    value={item.notes}
                                    onChange={e => updateAgendaItemNotes(idx, e.target.value)}
                                    autoFocus
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Special instructions <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      className={`${inputCls} resize-none`} rows={2}
                      value={agendaSpecial} onChange={e => setAgendaSpecial(e.target.value)}
                      placeholder="Any specific instructions for the agenda..."
                    />
                  </div>
                  {agendaError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{agendaError}</p>}
                  <div className="flex gap-2">
                    <button onClick={generateAgenda} disabled={agendaPending}
                      className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {agendaPending ? <><Spinner />Generating...</> : '✦ Generate Agenda'}
                    </button>
                    <button onClick={() => { setShowAgendaForm(false); setAgendaError('') }}
                      className="px-4 py-2.5 border border-slate-200 text-sm text-ink rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {previewDoc === 'agenda' && agendaDoc && !showAgendaForm && (
                <DocPreview
                  content={agendaDoc.content}
                  onDownload={(html) => downloadPDF(agendaDoc, html)}
                  downloading={downloading === 'agenda'}
                />
              )}

              {!agendaDoc && !showAgendaForm && (
                <p className="text-xs text-slate-400">List the business items to be transacted at the board meeting.</p>
              )}
            </div>

            {/* ── MINUTES CARD ─────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <h2 className="text-sm font-semibold text-ink">Board Minutes</h2>
                  {minutesDoc && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">✓ Generated</span>}
                </div>
                {!minutesDoc && !showMinutesForm && (
                  <button
                    onClick={() => { setShowMinutesForm(true); setShowNoticeForm(false); setShowAgendaForm(false) }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-slate-800 transition-colors"
                  >
                    + Generate Minutes
                  </button>
                )}
                {minutesDoc && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewDoc(previewDoc === 'minutes' ? null : 'minutes')}
                      className="text-xs font-medium text-teal hover:text-teal-dark transition-colors">
                      {previewDoc === 'minutes' ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => { setShowMinutesForm(true); setShowNoticeForm(false); setShowAgendaForm(false) }}
                      className="text-xs font-medium text-slate-500 hover:text-ink transition-colors">
                      Regenerate
                    </button>
                    <button onClick={() => deleteDoc('minutes')} disabled={deletePending === 'minutes'}
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                      {deletePending === 'minutes' ? '...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>

              {minutesDoc && !showMinutesForm && (
                <div className="text-xs text-slate-500 space-y-0.5 mb-2">
                  <p>Chairman: <span className="font-medium text-ink">{minutesDoc.metadata?.chairman_name || '—'}</span></p>
                  <p>Directors present: <span className="font-medium text-ink">{minutesDoc.metadata?.directors_present_count ?? '—'}</span></p>
                  <p className="text-slate-400">Created {formatShortDate(minutesDoc.created_at)}</p>
                </div>
              )}

              {showMinutesForm && (
                <div className="space-y-4 mt-2 pt-4 border-t border-slate-50">

                  {/* Chairman */}
                  <div>
                    <label className={labelCls}>Chairman *</label>
                    <select className={inputCls} value={minutesChairman} onChange={e => setMinutesChairman(e.target.value)}>
                      <option value="">Select chairman...</option>
                      {directors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} — {d.designation}</option>
                      ))}
                    </select>
                  </div>

                  {/* Directors present */}
                  <div>
                    <label className={labelCls}>Directors present</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {directors.map(d => (
                        <button key={d.id} type="button" onClick={() => togglePresent(d.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${minutesPresent.includes(d.id) ? 'border-ink bg-ink/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${minutesPresent.includes(d.id) ? 'bg-ink border-ink' : 'border-slate-300'}`}>
                            {minutesPresent.includes(d.id) && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-ink">{d.name}</div>
                            <div className="text-sm text-slate-400">{d.designation} · DIN: {d.din}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {minutesPresent.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2">{minutesPresent.length} director{minutesPresent.length > 1 ? 's' : ''} selected</p>
                    )}
                  </div>

                  {/* Resolution notes per agenda item */}
                  {agendaDoc?.metadata?.agenda_items && (agendaDoc.metadata.agenda_items as any[]).length > 0 && (
                    <div>
                      <label className={labelCls}>Resolution notes per agenda item <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                      <p className="text-sm text-slate-400 mb-2">Add key details — names, amounts, dates — to be woven into each RESOLVED THAT.</p>
                      <div className="space-y-2">
                        {(agendaDoc.metadata.agenda_items as any[]).map((item: any, idx: number) => {
                          const lib = AGENDA_LIBRARY[typeof item === 'string' ? item : item?.key]
                          const label = lib?.label || (typeof item === 'object' ? item?.label : item) || `Item ${idx + 1}`
                          const itemNum = String(idx + 4).padStart(2, '0')
                          return (
                            <div key={idx} className="border border-slate-100 rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <span className="text-sm font-semibold text-ink">{itemNum}. {label}</span>
                              </div>
                              <div className="p-2">
                                <textarea
                                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 bg-white resize-none"
                                  rows={2}
                                  placeholder="e.g. Appoint John Smith (DIN 12345678) as Additional Director w.e.f. 1st April 2024..."
                                  value={minutesResolutions[idx] || ''}
                                  onChange={e => setMinutesResolutions(prev => ({ ...prev, [idx]: e.target.value }))}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Place and time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Place of signing</label>
                      <input className={inputCls} value={minutesPlace} onChange={e => setMinutesPlace(e.target.value)} placeholder="e.g. Mumbai" />
                    </div>
                    <div>
                      <label className={labelCls}>Time of conclusion</label>
                      <input type="time" className={inputCls} value={minutesConclusion} onChange={e => setMinutesConclusion(e.target.value)} />
                    </div>
                  </div>

                  {minutesError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{minutesError}</p>}
                  <div className="flex gap-2">
                    <button onClick={generateMinutes} disabled={minutesPending}
                      className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {minutesPending ? <><Spinner />Generating...</> : '✦ Generate Minutes'}
                    </button>
                    <button onClick={() => { setShowMinutesForm(false); setMinutesError('') }}
                      className="px-4 py-2.5 border border-slate-200 text-sm text-ink rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {previewDoc === 'minutes' && minutesDoc && !showMinutesForm && (
                <DocPreview
                  content={minutesDoc.content}
                  onDownload={(html) => downloadPDF(minutesDoc, html)}
                  downloading={downloading === 'minutes'}
                />
              )}

              {!minutesDoc && !showMinutesForm && (
                <p className="text-xs text-slate-400">Record the minutes of the meeting — resolutions passed, directors present, chairman details.</p>
              )}
            </div>

          </div>

          {/* ── Right sidebar ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Meeting summary */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Meeting Details</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-slate-400">Date</p>
                  <p className="text-sm font-medium text-ink">{formatDisplayDate(meeting.meeting_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Time</p>
                  <p className="text-sm font-medium text-ink">{formatTime(meeting.meeting_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Venue</p>
                  <p className="text-sm font-medium text-ink leading-snug break-words">{venue}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Type</p>
                  <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-semibold ${MEETING_TYPE_COLORS[meeting.meeting_type]}`}>
                    {MEETING_TYPE_LABELS[meeting.meeting_type]} Meeting
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[meeting.status]}`}>
                    {meeting.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Directors */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Directors <span className="text-slate-300">({directors.length})</span>
              </p>
              {directors.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No directors on record</p>
              ) : (
                <div className="space-y-3">
                  {directors.map(d => (
                    <div key={d.id} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 mt-0.5">
                        {d.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink leading-tight truncate">{d.name}</p>
                        <p className="text-xs text-slate-500">{d.designation}</p>
                        <p className="text-xs text-slate-400 font-mono">DIN: {d.din}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href={`/clients/${client?.id}`} className="block mt-3 text-xs text-teal hover:text-teal-dark transition-colors">
                View client →
              </Link>
            </div>

            {/* Document status summary */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Documents</p>
              <div className="space-y-2">
                {[
                  { key: 'notice', label: 'Notice', color: 'bg-amber-400', doc: noticeDoc },
                  { key: 'agenda', label: 'Agenda', color: 'bg-purple-400', doc: agendaDoc },
                  { key: 'minutes', label: 'Minutes', color: 'bg-blue-400', doc: minutesDoc },
                ].map(({ key, label, color, doc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${doc ? color : 'bg-slate-200'}`}></span>
                      <span className="text-xs text-slate-600">{label}</span>
                    </div>
                    {doc ? (
                      <span className="text-xs text-green-600 font-medium">✓ Ready</span>
                    ) : (
                      <span className="text-xs text-slate-400">Not generated</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
