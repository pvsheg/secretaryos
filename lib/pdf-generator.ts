// lib/pdf-generator.ts
// Calls server-side /api/pdf which uses Typst for perfect PDF generation
// Falls back to puppeteer if typst is not available

export interface PDFMetadata {
  companyName: string
  docType: string
  meetingDate: string
  cin: string
  place?: string
  chairmanName?: string
  chairmanDin?: string
  csName?: string
  csMembership?: string
  customTemplate?: string | null  // Typst template from client's uploaded PDF
}

export async function generatePDF(
  htmlContent: string,
  fileName: string,
  metadata: PDFMetadata
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
      place: metadata.place || 'India',
      chairmanName: metadata.chairmanName,
      chairmanDin: metadata.chairmanDin,
      csName: metadata.csName,
      csMembership: metadata.csMembership,
      customTemplate: metadata.customTemplate || null,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
    throw new Error(err.error || 'PDF generation failed')
  }

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
