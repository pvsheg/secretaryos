// lib/pdf-generator.ts
// Client-side PDF download — calls the server-side /api/pdf route
// Server uses puppeteer (headless Chrome) for perfect rendering

export async function generatePDF(
  htmlContent: string,
  fileName: string,
  metadata: {
    companyName: string
    docType: string
    meetingDate: string
    cin: string
  }
): Promise<void> {
  const res = await fetch('/api/pdf', {
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
    const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
    throw new Error(err.error || 'PDF generation failed')
  }

  // Download the PDF
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
