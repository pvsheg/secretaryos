'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Props {
  clientId: string
  cin: string
}

export default function SyncFromMCA({ clientId, cin }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSync() {
    setStatus('loading')
    setMsg('')
    try {
      const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL
      if (!workerUrl) throw new Error('MCA worker not configured')

      const res = await fetch(`${workerUrl}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin }),
      })
      const data = await res.json()

      if (!data.found) {
        setStatus('error')
        setMsg(data.message || 'Company not found in MCA database.')
        return
      }

      const { error } = await supabase
        .from('clients')
        .update({
          company_name: data.company_name || undefined,
          registered_office: data.registered_office_address || undefined,
          company_status: data.company_status || undefined,
          company_type: data.company_class || data.company_type || undefined,
          company_category: data.company_category || undefined,
          company_sub_category: data.company_sub_category || undefined,
          authorised_capital: data.authorized_capital ? String(data.authorized_capital) : undefined,
          paid_up_capital: data.paidup_capital ? String(data.paidup_capital) : undefined,
          registration_date: data.registration_date || undefined,
          listing_status: data.listing_status || undefined,
          state_code: data.state_code || undefined,
          industrial_classification: data.industrial_classification || undefined,
          roc_code: data.roc_code || undefined,
          mca_last_synced: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)

      if (error) throw error

      setStatus('success')
      setMsg('MCA data synced successfully. Directors are not updated — manage them via Edit.')
      router.refresh()
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message || 'Sync failed. Please try again.')
    }
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? (
          <><span className="w-3 h-3 border border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>Syncing...</>
        ) : (
          <><span>↻</span> Sync from MCA</>
        )}
      </button>
      {msg && (
        <p className={`text-xs mt-2 ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {status === 'success' ? '✓ ' : '⚠ '}{msg}
        </p>
      )}
    </div>
  )
}
