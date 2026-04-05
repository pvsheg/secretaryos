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
  signatoryName?: string
  signatoryDesignation?: string
  signatoryDin?: string
  customTemplate?: string | null
}

export async function generatePDF(
  htmlContent: string,
  fileName: string,
  metadata: PDFMetadata
): Promise<void> {
  // Detect device type
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isMobile = isIOS || /Android/i.test(navigator.userAgent)

  // Check if the browser supports the Web Share API with files.
  // On mobile (iOS 15+, Android Chrome 89+) this opens the native share/save sheet —
  // the best UX for saving a file on mobile.
  const testFile = new File(['x'], 'test.pdf', { type: 'application/pdf' })
  const canShareFiles =
    isMobile &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [testFile] })

  // For iOS/Safari WITHOUT the share API, pre-open a blank window NOW (synchronously,
  // while still in the user-gesture context) so popup blockers don't interfere.
  let iosWindow: Window | null = null
  if ((isIOS || isSafari) && !canShareFiles) {
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
        signatoryName: metadata.signatoryName,
        signatoryDesignation: metadata.signatoryDesignation,
        signatoryDin: metadata.signatoryDin,
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

  // ── Mobile: Web Share API (native save sheet) ──────────────────────────────
  if (canShareFiles) {
    const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' })
    try {
      await navigator.share({ files: [file], title: fileName })
      return
    } catch {
      // User cancelled or share failed — fall through to blob-URL fallback
    }
  }

  // ── iOS / Safari: open pre-opened window at the blob URL ──────────────────
  const url = URL.createObjectURL(blob)

  if (isIOS || isSafari) {
    if (iosWindow) {
      iosWindow.location.href = url
    } else {
      window.open(url, '_blank') || (window.location.href = url)
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    return
  }

  // ── Desktop / Android Chrome: standard anchor download ────────────────────
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.pdf`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
