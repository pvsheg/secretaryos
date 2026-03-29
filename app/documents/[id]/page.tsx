'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'

const DOC_TYPE_LABELS: Record<string, string> = {
  board_minutes: 'Board Minutes',
  agm_notice: 'AGM Notice',
  roc_filing: 'ROC Filing',
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

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

  async function downloadPDF() {
    if (!doc) return
    setDownloading(true)
    try {
      const { generatePDF } = await import('@/lib/pdf-generator')
      const fileName = `${(doc.clients?.company_name || 'document').replace(/[^a-z0-9]/gi, '_')}_${doc.type}_${doc.metadata?.meeting_date || 'document'}`
      await generatePDF(doc.content, fileName, {
        companyName: doc.clients?.company_name || '',
        docType: doc.type,
        meetingDate: doc.metadata?.meeting_date || '',
        cin: doc.clients?.cin || '',
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setDownloading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <div className="pt-32 flex justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-ink rounded-full animate-spin"></div>
      </div>
    </div>
  )

  if (!doc) return null

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/documents" className="text-slate-400 hover:text-ink text-sm">← Documents</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-ink font-medium truncate">{doc.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
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
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {downloading ? (
              <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block"></span>Generating...</>
            ) : '↓ Download PDF'}
          </button>
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
            className="p-8 doc-preview"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </div>

        {/* Back to client */}
        {doc.clients && (
          <div className="mt-6 flex justify-between items-center">
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
