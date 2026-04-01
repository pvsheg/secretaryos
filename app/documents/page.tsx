import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import type { DocumentWithClient } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  board_minutes: 'Board Minutes',
  agm_notice: 'AGM Notice',
  roc_filing: 'ROC Filing',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  board_minutes: 'bg-blue-50 text-blue-700 border-blue-200',
  agm_notice: 'bg-purple-50 text-purple-700 border-purple-200',
  roc_filing: 'bg-green-50 text-green-700 border-green-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default async function DocumentsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: documents } = await supabase
    .from('documents')
    .select('*, clients(company_name, cin)')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Documents</h1>
            <p className="text-slate-500 text-sm mt-1">{documents?.length || 0} documents generated</p>
          </div>
          <Link href="/generate" className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0">
            ✦ Generate new
          </Link>
        </div>

        {!documents?.length ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="font-semibold text-xl text-ink mb-2">No documents yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">Generate your first board minutes, AGM notice, or ROC filing document.</p>
            <Link href="/generate" className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors text-sm">
              Generate first document →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            {(documents as DocumentWithClient[]).map((doc, idx) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}
                className={`flex items-center gap-5 px-6 py-4 hover:bg-slate-50 transition-colors ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0">
                  {doc.type === 'board_minutes' ? '📋' : doc.type === 'agm_notice' ? '📢' : '🗂️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">{doc.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{doc.clients?.company_name}</div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <span className={`hidden sm:inline text-xs px-2 py-1 rounded-lg border font-medium ${TYPE_COLORS[doc.type]}`}>
                    {TYPE_LABELS[doc.type]}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-slate-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
