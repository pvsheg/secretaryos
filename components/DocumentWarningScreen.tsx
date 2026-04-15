'use client'
import { useState } from 'react'

interface Props {
  onProceed: () => void
  onCancel: () => void
}

const REVIEW_ITEMS = [
  'Review all details (meeting date, time, attendees, names)',
  'Verify all Companies Act sections and references',
  'Check formatting matches your standard practice',
  'Review resolutions for legal compliance',
  'Make necessary corrections and amendments',
  'Have senior CS/audit review if required',
  'Sign off as the responsible Company Secretary',
  'File only after complete verification',
]

const RESPONSIBILITY_ITEMS = [
  'I will thoroughly review this draft before any use',
  'I understand this is AI-generated and may contain errors',
  'I accept FULL responsibility for accuracy and completeness',
  'I will NOT file this without proper professional verification',
  'I understand my CS licence and reputation are at stake',
  'I release SecretaryOS from any liability',
  'I acknowledge SecretaryOS is a tool, not a substitute for professional judgment',
]

export default function DocumentWarningScreen({ onProceed, onCancel }: Props) {
  const [reviewChecked, setReviewChecked] = useState<boolean[]>(Array(REVIEW_ITEMS.length).fill(false))
  const [respChecked, setRespChecked] = useState<boolean[]>(Array(RESPONSIBILITY_ITEMS.length).fill(false))

  const allChecked = reviewChecked.every(Boolean) && respChecked.every(Boolean)

  function toggleReview(i: number) {
    setReviewChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }
  function toggleResp(i: number) {
    setRespChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">

        {/* Icon + heading */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-ink mb-2">Before Generating Your Document</h1>
          <p className="text-gray-500 text-sm">This is important. Please read carefully before proceeding.</p>
        </div>

        {/* Alert banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 text-center">
          <p className="text-orange-800 font-semibold text-sm">
            SecretaryOS will generate an <strong>AI-powered draft</strong>. You <strong>MUST</strong> verify it thoroughly before filing with ROC.
          </p>
        </div>

        {/* Section 1: What you need to do */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4">
            What you need to do
          </h2>
          <div className="space-y-3">
            {REVIEW_ITEMS.map((item, i) => (
              <CheckboxRow
                key={i}
                label={item}
                checked={reviewChecked[i]}
                onChange={() => toggleReview(i)}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-8" />

        {/* Section 2: Your responsibility */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-4">
            Your responsibility
          </h2>
          <div className="space-y-3">
            {RESPONSIBILITY_ITEMS.map((item, i) => (
              <CheckboxRow
                key={i}
                label={item}
                checked={respChecked[i]}
                onChange={() => toggleResp(i)}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={onCancel}
            className="sm:w-32 py-3 border border-gray-200 text-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            disabled={!allChecked}
            className="flex-1 py-3 bg-teal text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-dark active:scale-95 shadow-sm"
          >
            {allChecked ? 'Generate Document →' : `Check all boxes to continue (${reviewChecked.filter(Boolean).length + respChecked.filter(Boolean).length}/${REVIEW_ITEMS.length + RESPONSIBILITY_ITEMS.length})`}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          This confirmation is shown once. Future documents will have a brief reminder.
        </p>
      </div>
    </div>
  )
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group select-none">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
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
      <span className={`text-sm leading-snug transition-colors ${checked ? 'text-ink font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
    </label>
  )
}
