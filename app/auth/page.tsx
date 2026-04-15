'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { isDisposableEmail } from '@/lib/disposable-domains'
import TermsAgreementModal from '@/components/TermsAgreementModal'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

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
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (isDisposableEmail(email)) {
      setError('Please use your professional or personal email — temporary email services are not accepted.')
      return
    }
    if (!termsAccepted) { setShowTermsModal(true); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          ...(ref ? { referred_by_code: ref } : {}),
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0',
        },
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Check your email for a verification link, then sign in.')
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-colors bg-gray-50"

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 py-12">
      {showTermsModal && (
        <TermsAgreementModal
          onAccept={() => { setTermsAccepted(true); setShowTermsModal(false); }}
        />
      )}
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl font-bold text-ink">
            Secretary<span className="text-teal">OS</span>
          </Link>
          <p className="text-gray-500 text-sm mt-1">AI compliance documents for CS professionals</p>
        </div>

        {message ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-card">
            <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4 text-teal text-xl">✓</div>
            <h2 className="font-semibold text-ink mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm mb-4">{message}</p>
            <button onClick={() => { setMessage(''); setMode('signin') }}
              className="text-sm text-gray-500 hover:text-ink transition-colors">← Back to sign in</button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-card">

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
              {[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'Sign up' }].map(t => (
                <button key={t.id} onClick={() => { setMode(t.id as any); setError(''); setConfirmPassword(''); if (t.id === 'signup' && !termsAccepted) setShowTermsModal(true) }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === t.id ? 'bg-white text-ink shadow-sm' : 'text-gray-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600 mb-4">{error}</div>
            )}

            {ref && (
              <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 text-sm text-teal-dark mb-4">
                ✓ Referral applied — 30 days free on Growth plan
              </div>
            )}

            {mode === 'signup' && (
              termsAccepted ? (
                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 text-sm text-teal-dark mb-4 flex items-center gap-2">
                  <span>✓</span>
                  <span>Platform agreement accepted</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4 text-left hover:bg-amber-100 transition-colors"
                >
                  ⚠ Review and accept the platform agreement to create your account
                </button>
              )
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
              {mode === 'signup' && (
                <input type="password" className={inputCls}
                  placeholder="Confirm password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                  autoComplete="new-password" />
              )}
              <button
                onClick={mode === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
                className="w-full py-3 bg-teal text-white font-semibold rounded-lg hover:bg-teal-dark transition-all disabled:opacity-50 text-sm active:scale-95 shadow-sm hover:shadow-card">
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
              <p className="text-center text-xs text-gray-400 mt-4">
                No account yet?{' '}
                <button onClick={() => { setMode('signup'); setError('') }} className="text-ink font-medium hover:underline">
                  Sign up free
                </button>
              </p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
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
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-teal rounded-full animate-spin"></div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
