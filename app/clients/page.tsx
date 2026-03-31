import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

// Revalidate every 30 seconds — balances freshness with speed
export const revalidate = 30

export default async function ClientsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, cin, registered_office, company_type, company_status, directors(count)')
    .order('company_name')
    .limit(100)

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Client companies</h1>
            <p className="text-slate-500 text-sm mt-1">{clients?.length || 0} companies on record</p>
          </div>
          <Link href="/clients/new" className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0">
            + Add client
          </Link>
        </div>

        {!clients?.length ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="font-semibold text-xl text-ink mb-2">No clients yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">Add your first client company and store their CIN, directors, and DINs once — never type them again.</p>
            <Link href="/clients/new" className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors">
              Add first client →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {clients.map((client: any) => (
              <div key={client.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-5 hover:border-slate-200 transition-colors">
                <div className="w-11 h-11 bg-ink rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {client.company_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{client.company_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">{client.cin}</div>
                  <div className="text-xs text-slate-400 truncate">{client.registered_office}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-base font-bold text-ink">{(client.directors as any)?.[0]?.count || 0}</div>
                    <div className="text-xs text-slate-400">Directors</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/generate?client=${client.id}`} className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors">
                      Generate
                    </Link>
                    <Link href={`/clients/${client.id}`} className="px-3 py-1.5 border border-slate-200 text-ink text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
