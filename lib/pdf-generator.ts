// lib/pdf-generator.ts
// Calls server-side /api/pdf which uses Typst for perfect PDF generation

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
  customTemplate?: string | null
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

  // Detect iOS / Safari — they block programmatic clicks on blob URLs
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  if (isIOS || isSafari) {
    // On iOS/Safari — open in new tab, user can share/save from there
    const newTab = window.open(url, '_blank')
    if (!newTab) {
      // Popup blocked — fallback to direct navigation
      window.location.href = url
    }
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } else {
    // Standard download for Chrome, Firefox, desktop
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.pdf`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
