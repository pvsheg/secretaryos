import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import TemplateUpload from '@/components/TemplateUpload'
import SyncFromMCA from '@/components/SyncFromMCA'

const TYPE_ICONS: Record<string, string> = {
  board_minutes: '📋', agm_notice: '📢', roc_filing: '🗂️',
}
const TYPE_LABELS: Record<string, string> = {
  board_minutes: 'Board Minutes', agm_notice: 'AGM Notice', roc_filing: 'ROC Filing',
}
const TYPE_COLORS: Record<string, string> = {
  board_minutes: 'bg-blue-50 text-blue-700',
  agm_notice: 'bg-purple-50 text-purple-700',
  roc_filing: 'bg-emerald-50 text-emerald-700',
}

function formatCapital(val: string | null): string {
  if (!val) return '—'
  const num = parseFloat(val.replace(/[,₹\s]/g, ''))
  if (isNaN(num)) return val
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-slate-50 last:border-0">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-ink font-medium break-words leading-snug">{value || '—'}</p>
    </div>
  )
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const [{ data: client }, { data: documents }, { count: docCount }] = await Promise.all([
    supabase.from('clients').select('*, directors(*)').eq('id', params.id).single(),
    supabase.from('documents').select('*').eq('client_id', params.id).eq('user_id', session.user.id).order('created_at', { ascending: false }),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('client_id', params.id).eq('user_id', session.user.id),
  ])

  if (!client) notFound()

  const directors = (client as any).directors || []
  const hasTemplate = !!(client as any).pdf_template_uploaded_at
  const status = (client as any).company_status || 'Active'
  const isActive = status.toLowerCase() === 'active'

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/clients" className="hover:text-ink transition-colors">Clients</Link>
          <span>/</span>
          <span className="text-ink truncate max-w-xs">{client.company_name}</span>
        </div>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-ink rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {client.company_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink leading-tight">{client.company_name}</h1>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mb-1">CIN: {client.cin}</p>
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                  {(client as any).company_type && <span>{(client as any).company_type}</span>}
                  {(client as any).company_type && (client as any).registration_date && <span>·</span>}
                  {(client as any).registration_date && <span>Incorporated {(client as any).registration_date}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/clients/${client.id}/edit`}
                className="px-4 py-2 border border-slate-200 text-ink text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Edit
              </Link>
              <Link href={`/generate?client=${client.id}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                ✦ Generate
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-50">
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-ink">{docCount ?? 0}</p>
              <p className="text-xs text-slate-400 mt-0.5">Documents</p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="font-serif text-2xl font-bold text-ink">{directors.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Directors</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-lg font-bold text-ink leading-tight">{client.financial_year_end}</p>
              <p className="text-xs text-slate-400 mt-0.5">FY End</p>
            </div>
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* LEFT SIDEBAR */}
          <div className="space-y-4">

            {/* Company details */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Company details</p>
              <InfoRow label="Registered office" value={client.registered_office} />
              <InfoRow label="Company category" value={(client as any).company_category} />
              <InfoRow label="Industrial classification" value={(client as any).industrial_classification} />
              <InfoRow label="ROC code" value={(client as any).roc_code} />
              <InfoRow label="Listing status" value={(client as any).listing_status || 'Unlisted'} />
            </div>

            {/* Capital structure */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Capital structure</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Authorised</p>
                  <p className="text-sm font-semibold text-ink">{formatCapital(client.authorised_capital)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Paid-up</p>
                  <p className="text-sm font-semibold text-ink">{formatCapital(client.paid_up_capital)}</p>
                </div>
              </div>
            </div>

            {/* Directors */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Directors <span className="text-slate-300">({directors.length})</span>
                </p>
                <Link href={`/clients/${client.id}/edit`} className="text-xs text-teal hover:text-teal-dark transition-colors">
                  Edit →
                </Link>
              </div>
              {directors.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No directors on record</p>
              ) : (
                <div className="space-y-3">
                  {directors.map((dir: any) => (
                    <div key={dir.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 mt-0.5">
                        {dir.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink leading-tight truncate">{dir.name}</p>
                        <p className="text-xs text-slate-500">{dir.designation}</p>
                        <p className="text-xs text-slate-400 font-mono">DIN: {dir.din}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MCA Sync */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">MCA sync</p>
                {(client as any).mca_last_synced && (
                  <span className="text-xs text-slate-400">
                    {new Date((client as any).mca_last_synced).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <SyncFromMCA clientId={client.id} cin={client.cin} />
              <p className="text-xs text-slate-400 mt-2">Updates company details and capital. Directors managed separately.</p>
            </div>

            {/* PDF Template */}
            <TemplateUpload
              clientId={client.id}
              hasTemplate={hasTemplate}
              uploadedAt={(client as any).pdf_template_uploaded_at}
            />

          </div>

          {/* RIGHT — DOCUMENTS */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="font-semibold text-ink text-sm">Documents</h2>
                <Link href={`/generate?client=${client.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-teal-dark transition-colors">
                  ✦ Generate new
                </Link>
              </div>

              {!documents?.length ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="font-semibold text-ink mb-1 text-sm">No documents yet</p>
                  <p className="text-xs text-slate-400 mb-4">Generate board minutes, AGM notice or ROC filings</p>
                  <Link href={`/generate?client=${client.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                    ✦ Generate now
                  </Link>
                </div>
              ) : (
                <div>
                  {documents.map((doc: any, idx: number) => (
                    <Link key={doc.id} href={`/documents/${doc.id}`}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${idx !== 0 ? 'border-t border-slate-50' : ''}`}>
                      <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                        {TYPE_ICONS[doc.type] || '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{doc.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium hidden sm:inline flex-shrink-0 ${TYPE_COLORS[doc.type] || 'bg-slate-100 text-slate-600'}`}>
                        {TYPE_LABELS[doc.type] || doc.type}
                      </span>
                      <span className="text-slate-300 flex-shrink-0">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
