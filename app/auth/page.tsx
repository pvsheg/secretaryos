'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Suspense } from 'react'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const ref = searchParams.get('ref')

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })

    // Show error from callback
    const err = searchParams.get('error')
    if (err === 'verification_failed') {
      setError('Verification link expired. Please request a new one.')
    }
  }, [])

  async function handleMagicLink() {
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: ref ? { referred_by_code: ref } : {},
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMagicSent(true)
    setLoading(false)
  }

  async function handleSignIn() {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Please enter email and password'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: ref ? { referred_by_code: ref } : {},
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Check your email to verify your account, then sign in.')
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors bg-white"

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl font-bold text-ink">
            Secretary<span className="text-gold">OS</span>
          </Link>
          <p className="text-slate-500 text-sm mt-1">AI compliance documents for CS professionals</p>
        </div>

        {/* Magic link sent state */}
        {magicSent ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <h2 className="font-semibold text-ink mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-4">
              We sent a sign-in link to <strong>{email}</strong>. Click it to sign in instantly — no password needed.
            </p>
            <button
              onClick={() => { setMagicSent(false); setMode('signin') }}
              className="text-sm text-slate-500 hover:text-ink transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        ) : message ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <h2 className="font-semibold text-ink mb-2">Almost there</h2>
            <p className="text-slate-500 text-sm mb-4">{message}</p>
            <button
              onClick={() => { setMessage(''); setMode('signin') }}
              className="text-sm text-slate-500 hover:text-ink transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-8">

            {/* Mode tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => { setMode('signin'); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signin' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}
              >
                Sign in
              </button>
              <button
                onClick={() => { setMode('signup'); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}
              >
                Sign up
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            {ref && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700 mb-4">
                ✓ You have been referred — 30 days free on the Growth plan after signing up
              </div>
            )}

            <div className="space-y-3">
              <div>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {mode !== 'magic' && (
                <div>
                  <input
                    type="password"
                    className={inputCls}
                    placeholder={mode === 'signup' ? 'Create password (min 8 characters)' : 'Password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
              )}

              <button
                onClick={mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleMagicLink}
                disabled={loading}
                className="w-full py-3 bg-ink text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending link...'}
                  </span>
                ) : (
                  mode === 'signin' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send magic link →'
                )}
              </button>
            </div>

            {/* Magic link option */}
            <div className="mt-4 text-center">
              {mode === 'magic' ? (
                <button
                  onClick={() => { setMode('signin'); setError('') }}
                  className="text-xs text-slate-400 hover:text-ink transition-colors"
                >
                  ← Use password instead
                </button>
              ) : (
                <button
                  onClick={() => { setMode('magic'); setError('') }}
                  className="text-xs text-slate-400 hover:text-ink transition-colors"
                >
                  Or sign in with a magic link — no password needed
                </button>
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline">terms</Link>
          {' '}and{' '}
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
