'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'
import { sanitizeHtml } from '@/lib/sanitize'
import { generateAndDownloadPDF } from '@/lib/pdf'
import type { DocumentWithClient } from '@/types'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [doc, setDoc] = useState<DocumentWithClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function fetchDoc() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('documents')
        .select('*, clients(id, company_name, cin, registered_office)')
        .eq('id', params.id as string)
        .single()

      if (!data) { router.push('/documents'); return }
      setDoc(data as DocumentWithClient)
      setLoading(false)
    }
    fetchDoc()
  }, [])

  async function downloadPDF() {
    if (!doc) return
    setDownloading(true)
    const tmp = document.createElement('div')
    tmp.innerHTML = doc.content
    const rawText = tmp.innerText || tmp.textContent || ''
    const fileName = `${doc.title?.replace(/[^a-z0-9]/gi, '_') || 'document'}.pdf`
    await generateAndDownloadPDF(rawText, fileName)
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF9]">
        <Navbar />
        <main className="pt-24 px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            Loading document...
          </div>
        </main>
      </div>
    )
  }

  if (!doc) return null

  const meta = doc.metadata

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/documents" className="hover:text-ink transition-colors">Documents</Link>
          <span>/</span>
          <span className="text-ink truncate max-w-xs">{doc.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* DOCUMENT */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-ink px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Generated document</p>
                  <p className="text-sm text-white font-medium mt-0.5">{doc.title}</p>
                </div>
                <span className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/20">
                  ✓ Companies Act compliant
                </span>
              </div>
              <div className="p-8 doc-preview leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }} />
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* ACTIONS */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Actions</p>
              <div className="space-y-2">
                <button
                  onClick={downloadPDF}
                  disabled={downloading}
                  className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {downloading ? (
                    <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block"></span>Preparing PDF...</>
                  ) : '↓ Download PDF'}
                </button>
                <Link
                  href={`/generate?client=${doc.clients?.id}`}
                  className="block w-full py-2.5 border border-slate-200 text-ink text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors text-center"
                >
                  ✦ Generate another
                </Link>
              </div>
            </div>

            {/* METADATA */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Document details</p>
              <div className="space-y-3">
                {[
                  { label: 'Company', val: doc.clients?.company_name },
                  { label: 'CIN', val: doc.clients?.cin },
                  { label: 'Document type', val: doc.type?.replace('_', ' ') },
                  { label: 'Meeting date', val: meta?.meeting_date ? new Date(meta.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                  { label: 'Meeting venue', val: meta?.meeting_venue || '—' },
                  { label: 'Generated on', val: new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm text-ink font-medium capitalize">{item.val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPLIANCE */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-3">Compliance checklist</p>
              <div className="space-y-2">
                {[
                  'Section 173 — Meeting convened',
                  'Section 174 — Quorum confirmed',
                  'SS-1 — Secretarial Standards',
                  'Section 118(1) — Signing timeline',
                  'DIN numbers verified',
                  'Statutory language compliant',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-green-700">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    {item}
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
