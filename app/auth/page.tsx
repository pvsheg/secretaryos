'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { isDisposableEmail } from '@/lib/disposable-domains'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const ref = searchParams.get('ref')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
    if (searchParams.get('error') === 'verification_failed') {
      setError('Verification link expired. Please try signing in again.')
    }
  }, [])

  async function handleSignIn() {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message)
      setLoading(false); return
    }
    router.push('/dashboard')
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Please enter your email and password'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (isDisposableEmail(email)) {
      setError('Please use your professional or personal email — temporary email services are not accepted.')
      return
    }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: ref ? { referred_by_code: ref } : {},
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Check your email for a verification link, then sign in.')
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors bg-white"

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl font-bold text-ink">
            Secretary<span className="text-gold">OS</span>
          </Link>
          <p className="text-slate-500 text-sm mt-1">AI compliance documents for CS professionals</p>
        </div>

        {message ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-xl">✓</div>
            <h2 className="font-semibold text-ink mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-4">{message}</p>
            <button onClick={() => { setMessage(''); setMode('signin') }}
              className="text-sm text-slate-500 hover:text-ink">← Back to sign in</button>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-6">

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
              {[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'Sign up' }].map(t => (
                <button key={t.id} onClick={() => { setMode(t.id as any); setError('') }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === t.id ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 mb-4">{error}</div>
            )}

            {ref && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700 mb-4">
                ✓ Referral applied — 30 days free on Growth plan
              </div>
            )}

            <div className="space-y-3">
              <input type="email" className={inputCls} placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
                autoComplete="email" autoFocus />
              <input type="password" className={inputCls}
                placeholder={mode === 'signup' ? 'Create password (min 8 characters)' : 'Password'}
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              <button
                onClick={mode === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
                className="w-full py-3 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm">
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Please wait...
                    </span>
                  : mode === 'signin' ? 'Sign in →' : 'Create account →'
                }
              </button>
            </div>

            {mode === 'signin' && (
              <p className="text-center text-xs text-slate-400 mt-4">
                No account yet?{' '}
                <button onClick={() => { setMode('signup'); setError('') }} className="text-ink font-medium hover:underline">
                  Sign up free
                </button>
              </p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline">terms</Link>{' '}and{' '}
          <Link href="/privacy" className="underline">privacy policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-ink rounded-full animate-spin"></div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
