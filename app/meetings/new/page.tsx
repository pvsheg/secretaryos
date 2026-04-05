'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Client {
  id: string
  company_name: string
  cin: string
  registered_office: string
}

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-colors bg-gray-50'
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5'

export default function NewMeetingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_id: '',
    meeting_date: '',
    meeting_time: '11:00',
    meeting_type: 'board',
    venue_type: 'registered_office',
    venue_address: '',
  })

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, company_name, cin, registered_office')
      .order('company_name')
      .then(({ data }) => {
        if (data) setClients(data as Client[])
      })
  }, [])

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.meeting_date || !form.meeting_time) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: form.client_id,
          meeting_date: form.meeting_date,
          meeting_time: form.meeting_time,
          meeting_type: form.meeting_type,
          venue_type: form.venue_type,
          venue_address: form.venue_type === 'custom' ? form.venue_address : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create meeting.')
        setLoading(false)
        return
      }

      router.push(`/meetings/${data.meeting.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-2xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/meetings" className="hover:text-ink transition-colors">Meetings</Link>
          <span>/</span>
          <span className="text-ink">Call a Meeting</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-bold text-ink mb-1">Call a Meeting</h1>
          <p className="text-slate-500 text-sm mb-7">Schedule a board or general meeting to generate all related documents.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Client */}
            <div>
              <label className={labelCls}>Client company *</label>
              {clients.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  No clients yet. <Link href="/clients/new" className="font-semibold underline">Add a client first →</Link>
                </div>
              ) : (
                <select
                  className={inputCls}
                  value={form.client_id}
                  onChange={e => setField('client_id', e.target.value)}
                  required
                >
                  <option value="">Select a client company...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Date + Time */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Meeting date *</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.meeting_date}
                  onChange={e => setField('meeting_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Meeting time *</label>
                <input
                  type="time"
                  className={inputCls}
                  value={form.meeting_time}
                  onChange={e => setField('meeting_time', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Meeting type */}
            <div>
              <label className={labelCls}>Meeting type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'board', label: 'Board Meeting' },
                  { id: 'agm', label: 'AGM' },
                  { id: 'egm', label: 'EGM' },
                  { id: 'custom', label: 'Custom' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setField('meeting_type', t.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${form.meeting_type === t.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-ink hover:border-slate-300'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Venue type */}
            <div>
              <label className={labelCls}>Venue</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'registered_office', label: 'Registered Office' },
                  { id: 'video', label: 'Video Conference' },
                  { id: 'custom', label: 'Custom Address' },
                ].map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setField('venue_type', v.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${form.venue_type === v.id ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-ink hover:border-slate-300'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom venue address */}
            {form.venue_type === 'custom' && (
              <div>
                <label className={labelCls}>Custom venue address *</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.venue_address}
                  onChange={e => setField('venue_address', e.target.value)}
                  placeholder="Full address of the meeting venue..."
                  required
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !form.client_id || !form.meeting_date}
                className="flex-1 py-3 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Creating...</>
                ) : (
                  'Schedule Meeting'
                )}
              </button>
              <Link href="/meetings"
                className="px-5 py-3 border border-slate-200 text-ink text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
