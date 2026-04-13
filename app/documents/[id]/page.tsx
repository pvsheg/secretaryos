'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'
import { AGENDA_LIBRARY } from '@/lib/agenda-library'

const DOC_TYPE_LABELS: Record<string, string> = {
  board_minutes: 'Board Minutes',
  board_notice: 'Board Notice',
  board_agenda: 'Board Agenda',
  agm_notice: 'AGM Notice',
  roc_filing: 'ROC Filing',
}

const COMPLIANCE_LABELS: Record<string, string> = {
  mandatory_annual: 'Mandatory Annual',
  event_based: 'Event Based',
  offline: 'Offline / Ongoing',
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)

  useEffect(() => {
    async function fetchDoc() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase
        .from('documents')
        .select('*, clients(id, company_name, cin, registered_office)')
        .eq('id', params.id as string)
        .single()
      if (!data) { router.push('/documents'); return }
      setDoc(data)
      setLoading(false)
    }
    fetchDoc()
  }, [])

  function getFileName() {
    return `${(doc?.clients?.company_name || 'document').replace(/[^a-z0-9]/gi, '_')}_${doc?.type}_${doc?.metadata?.meeting_date || 'document'}`
  }

  async function downloadPDF() {
    if (!doc) return
    setDownloading(true)
    try {
      const { generatePDF } = await import('@/lib/pdf-generator')
      await generatePDF(doc.content, getFileName(), {
        companyName: doc.clients?.company_name || '',
        docType: doc.type,
        meetingDate: doc.metadata?.meeting_date || '',
        cin: doc.clients?.cin || '',
        // Signatory fields for board_notice / board_agenda signatures
        signatoryName: doc.metadata?.signatory_name || '',
        signatoryDesignation: doc.metadata?.signatory_designation || '',
        signatoryDin: doc.metadata?.signatory_din || '',
        // Chairman fields for board_minutes signatures
        chairmanName: doc.metadata?.chairman_name || '',
        chairmanDin: doc.metadata?.chairman_din || '',
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setDownloading(false)
  }

  async function downloadDocx() {
    if (!doc) return
    setDownloadingDocx(true)
    try {
      const { generateDocx } = await import('@/lib/docx-generator')
      await generateDocx(doc.content, getFileName(), {
        companyName: doc.clients?.company_name || '',
        cin: doc.clients?.cin || '',
        meetingDate: doc.metadata?.meeting_date || '',
      })
    } catch (err) {
      console.error('DOCX generation failed:', err)
    }
    setDownloadingDocx(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="pt-32 flex justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-ink rounded-full animate-spin"></div>
      </div>
    </div>
  )

  if (!doc) return null

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/documents" className="text-slate-400 hover:text-ink text-sm">← Documents</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-ink font-medium truncate">{doc.title}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {DOC_TYPE_LABELS[doc.type] || doc.type}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">
                {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink">{doc.clients?.company_name}</h1>
            {doc.metadata?.meeting_date && (
              <p className="text-sm text-slate-500 mt-1">
                Meeting date: {new Date(doc.metadata.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block"></span>Generating...</>
              ) : '↓ Download PDF'}
            </button>
            <button
              onClick={downloadDocx}
              disabled={downloadingDocx}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-ink text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingDocx ? (
                <><span className="w-3 h-3 border border-slate-300 border-t-ink rounded-full animate-spin inline-block"></span>Generating...</>
              ) : '↓ Download Word'}
            </button>
          </div>
        </div>

        {/* Document preview */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="bg-ink px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Document preview</span>
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/20">
              ✓ Section 118 compliant
            </span>
          </div>
          <div
            className="p-4 sm:p-8 doc-preview"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </div>

        {/* Generation details */}
        {doc.metadata && Object.keys(doc.metadata).some(k => doc.metadata[k]) && (
          <div className="mt-6 bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Generation details</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {doc.metadata.meeting_date && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Meeting date</p>
                  <p className="text-sm text-ink font-medium">
                    {new Date(doc.metadata.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {doc.metadata.meeting_venue && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Venue</p>
                  <p className="text-sm text-ink font-medium">{doc.metadata.meeting_venue}</p>
                </div>
              )}
              {doc.metadata.compliance_category && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Compliance category</p>
                  <p className="text-sm text-ink font-medium">{COMPLIANCE_LABELS[doc.metadata.compliance_category] || doc.metadata.compliance_category}</p>
                </div>
              )}
              {doc.metadata.agenda_types?.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 mb-1.5">Agenda items</p>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.metadata.agenda_types.map((key: string) => (
                      <span key={key} className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                        {AGENDA_LIBRARY[key]?.label || key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {doc.metadata.directors_present && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Directors present</p>
                  <p className="text-sm text-ink whitespace-pre-line">
                    {Array.isArray(doc.metadata.directors_present)
                      ? doc.metadata.directors_present.map((d: any) => `${d.name} (DIN: ${d.din}), ${d.designation}`).join('\n')
                      : doc.metadata.directors_present}
                  </p>
                </div>
              )}
              {doc.metadata.agenda_items && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Additional agenda</p>
                  <p className="text-sm text-ink whitespace-pre-line">
                    {Array.isArray(doc.metadata.agenda_items)
                      ? doc.metadata.agenda_items.map((item: any) => item?.label || item?.key || String(item)).join('\n')
                      : doc.metadata.agenda_items}
                  </p>
                </div>
              )}
              {doc.metadata.special_instructions && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Special instructions</p>
                  <p className="text-sm text-ink whitespace-pre-line">{doc.metadata.special_instructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back to client */}
        {doc.clients && (
          <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <Link
              href={`/clients/${doc.clients.id}`}
              className="text-sm text-slate-500 hover:text-ink transition-colors"
            >
              ← Back to {doc.clients.company_name}
            </Link>
            <Link
              href={`/generate?client=${doc.clients.id}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              Generate another document →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
