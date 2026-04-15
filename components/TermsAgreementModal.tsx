'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  onAccept: () => void
}

export default function TermsAgreementModal({ onAccept }: Props) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-ink px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold text-white">
              Secretary<span className="text-teal">OS</span>
            </span>
            <span className="text-gray-400 text-sm">Platform Agreement</span>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          <p className="text-red-600 font-bold text-sm uppercase tracking-wide mb-3">
            Important — Please Read Before Continuing
          </p>

          <p className="text-gray-700 text-sm mb-4">
            SecretaryOS generates <strong>AI-powered draft documents</strong> for your professional review.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Key Points</p>
            <ul className="space-y-1.5 text-sm text-amber-900">
              <li className="flex gap-2"><span className="flex-shrink-0 text-amber-600 font-bold">—</span>These are <strong>DRAFTS</strong>, not final documents</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-amber-600 font-bold">—</span>You are solely responsible for reviewing and verifying all content</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-amber-600 font-bold">—</span>You must check all details before filing with ROC</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-amber-600 font-bold">—</span>SecretaryOS is <strong>NOT liable</strong> for any errors, omissions, or consequences</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-amber-600 font-bold">—</span>You use these documents at your professional discretion</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-amber-600 font-bold">—</span>Your CS licence and professional reputation are at stake</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">By continuing, you confirm:</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-teal font-bold">✓</span>You understand these are AI-generated drafts</li>
              <li className="flex gap-2"><span className="text-teal font-bold">✓</span>You will thoroughly review before filing</li>
              <li className="flex gap-2"><span className="text-teal font-bold">✓</span>You accept full responsibility for accuracy</li>
              <li className="flex gap-2"><span className="text-teal font-bold">✓</span>You release SecretaryOS from liability</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Full details in our{' '}
            <Link href="/terms" target="_blank" className="underline hover:text-ink transition-colors">
              Terms of Service
            </Link>.
          </p>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                checked ? 'bg-teal border-teal' : 'border-gray-300 group-hover:border-gray-400 bg-white'
              }`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-ink leading-snug">
              I accept and understand — I am a qualified Company Secretary and I will review all documents before any professional use or filing.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
          <button
            onClick={onAccept}
            disabled={!checked}
            className="w-full py-3 bg-teal text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-dark active:scale-95 shadow-sm"
          >
            Continue to Sign Up →
          </button>
          {!checked && (
            <p className="text-center text-xs text-gray-400 mt-2">Check the box above to continue</p>
          )}
        </div>
      </div>
    </div>
  )
}
