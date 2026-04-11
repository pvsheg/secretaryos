// lib/docx-generator.ts
// Client-side helper to call /api/docx and trigger a download

export async function generateDocx(
  htmlContent: string,
  fileName: string,
  metadata: { companyName: string; cin: string; meetingDate: string }
): Promise<void> {
  const res = await fetch('/api/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: htmlContent,
      fileName,
      companyName: metadata.companyName,
      cin: metadata.cin,
      meetingDate: metadata.meetingDate,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'DOCX generation failed' }))
    throw new Error(err.error || 'DOCX generation failed')
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.docx`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
