'use client'
import { useState } from 'react'

interface Props {
  clientId: string
  hasTemplate: boolean
  uploadedAt?: string
}

export default function TemplateUpload({ clientId, hasTemplate, uploadedAt }: Props) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setStatus('error')
      setMessage('Please upload a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus('error')
      setMessage('File too large — maximum 10MB')
      return
    }

    setUploading(true)
    setStatus('idle')
    setMessage('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('client_id', clientId)

      const res = await fetch('/api/template', { method: 'POST', body: fd })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setMessage('Template uploaded — future documents will follow your format')
      } else {
        setStatus('error')
        setMessage(data.error || 'Upload failed')
      }
    } catch {
      setStatus('error')
      setMessage('Upload failed — please try again')
    }

    setUploading(false)
    // Reset file input
    e.target.value = ''
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          PDF template
        </p>
        {hasTemplate && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
            ✓ Active
          </span>
        )}
      </div>

      {hasTemplate ? (
        <div className="mb-3">
          <p className="text-sm text-ink font-medium">Custom format active</p>
          {uploadedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Uploaded {new Date(uploadedAt).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Documents for this client will use your uploaded format. Upload a new PDF to update it.
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Upload your existing board minutes PDF — all future documents for this client will follow your exact layout and style.
        </p>
      )}

      {status === 'success' && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 mb-3">
          ✓ {message}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mb-3">
          {message}
        </div>
      )}

      <label className={`
        w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors
        ${uploading
          ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
        }
      `}>
        {uploading ? (
          <>
            <span className="w-3 h-3 border border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
            Analysing format...
          </>
        ) : (
          <>
            ↑ {hasTemplate ? 'Replace template' : 'Upload PDF template'}
          </>
        )}
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={uploading}
          onChange={handleUpload}
        />
      </label>

      <p className="text-xs text-slate-400 mt-2 text-center">
        PDF only · Max 10MB · Claude reads the format
      </p>
    </div>
  )
}
