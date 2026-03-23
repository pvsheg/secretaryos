'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Account created! Please check your email to confirm, then sign in.')
      setMode('login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 bg-ink flex-col justify-between p-12">
        <div className="font-serif text-2xl font-bold text-white">
          Secretary<span className="text-gold-light" style={{color:'#D4AF5A'}}>OS</span>
        </div>
        <div>
          <p className="font-serif text-4xl font-bold text-white leading-tight mb-6">
            Stop drafting.<br/>
            <span className="italic" style={{color:'#D4AF5A'}}>Start practising.</span>
          </p>
          <p className="text-slate-400 text-lg font-light leading-relaxed mb-10">
            AI-powered compliance documents for Indian Company Secretaries. Board minutes in under 60 seconds.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: '33 hrs', label: 'Saved per month' },
              { val: '45 sec', label: 'Per document' },
              { val: '73k+', label: 'CS professionals in India' },
              { val: '100%', label: 'Companies Act compliant' },
            ].map(s => (
              <div key={s.val} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="font-serif text-3xl font-bold text-white mb-1">{s.val}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600">Built exclusively for practicing CS professionals in India</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden font-serif text-2xl font-bold text-ink mb-8">
            Secretary<span className="text-gold">OS</span>
          </div>

          <h1 className="text-2xl font-semibold text-ink mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            {mode === 'login'
              ? 'Sign in to your SecretaryOS workspace'
              : 'Get started — first 3 months free for early users'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Full name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Priya Sharma" required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters" required minLength={8}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">{success}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              className="text-ink font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
