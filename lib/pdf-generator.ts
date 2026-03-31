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
  // Detect iOS / Safari — they block programmatic clicks on blob URLs.
  // Note: iPads on iOS 13+ report as Macintosh, so check maxTouchPoints too.
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // On iOS/Safari, open a blank window BEFORE the async fetch.
  // Popup blockers only allow window.open() called directly from a user gesture;
  // opening after an await causes it to be blocked. We pre-open here (synchronously),
  // then point it at the blob URL once the fetch completes.
  let iosWindow: Window | null = null
  if (isIOS || isSafari) {
    iosWindow = window.open('', '_blank')
  }

  let res: Response
  try {
    res = await fetch('/api/pdf', {
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
  } catch (err) {
    iosWindow?.close()
    throw err
  }

  if (!res.ok) {
    iosWindow?.close()
    const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
    throw new Error(err.error || 'PDF generation failed')
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  if (isIOS || isSafari) {
    if (iosWindow) {
      // Point the already-open (non-blocked) window at the blob URL
      iosWindow.location.href = url
    } else {
      // window.open was blocked — fall back to same-tab navigation
      window.location.href = url
    }
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
