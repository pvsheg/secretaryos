import { NextRequest, NextResponse } from 'next/server'

// Server-side PDF generation using @sparticuz/chromium + puppeteer-core
// This renders HTML exactly as the browser does — perfect page breaks, fonts, layout
// Install: npm install @sparticuz/chromium puppeteer-core

export async function POST(req: NextRequest) {
  try {
    const { html, fileName, companyName, cin, meetingDate } = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 })
    }

    // Build the full document HTML
    const fullHtml = buildDocumentHtml(html, { companyName, cin, meetingDate })

    // Generate PDF using puppeteer
    const pdfBuffer = await generateWithPuppeteer(fullHtml)

    // Return as PDF download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'document'}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error.message || 'PDF generation failed' },
      { status: 500 }
    )
  }
}

function buildDocumentHtml(content: string, meta: { companyName?: string; cin?: string; meetingDate?: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page {
    size: A4;
    margin: 0;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 210mm;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: white;
  }

  /* Header — repeats on every page */
  .doc-header {
    background: #0A0F1E;
    padding: 10px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
  }
  .doc-header-brand {
    color: #B8973A;
    font-size: 10pt;
    font-weight: bold;
    letter-spacing: 2px;
    font-family: Arial, sans-serif;
  }
  .doc-header-tag {
    color: #888;
    font-size: 8pt;
    font-family: Arial, sans-serif;
  }

  /* Footer — repeats on every page */
  .doc-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #F8F8F6;
    border-top: 0.5px solid #ddd;
    padding: 5px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    color: #999;
    font-family: Arial, sans-serif;
  }

  /* Page counter */
  .page-number::after {
    content: counter(page);
  }
  .page-total::after {
    content: counter(pages);
  }

  /* Content area — leaves room for fixed header and footer */
  .doc-body {
    margin-top: 46px;
    margin-bottom: 32px;
    padding: 28px 42px 20px;
  }

  /* Document classes */
  .doc-title-main {
    font-size: 13.5pt;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #0A0F1E;
    margin-bottom: 5px;
    line-height: 1.3;
  }

  .doc-center {
    text-align: center;
    font-size: 10pt;
    color: #333;
    margin-bottom: 3px;
    line-height: 1.5;
  }

  .doc-section {
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #B8973A;
    margin-top: 18pt;
    margin-bottom: 5pt;
    padding-bottom: 3pt;
    border-bottom: 0.5px solid #e0e0e0;
    font-family: Arial, sans-serif;
    page-break-after: avoid;
  }

  .doc-line {
    font-size: 10.5pt;
    color: #2a2a2a;
    margin-bottom: 6pt;
    padding-left: 10px;
    line-height: 1.7;
    page-break-inside: avoid;
    orphans: 3;
    widows: 3;
  }

  .doc-resolution {
    font-size: 10.5pt;
    color: #1a1a1a;
    margin: 10pt 0 6pt 0;
    padding: 9pt 12px;
    border-left: 3px solid #B8973A;
    background: #FAFAF8;
    line-height: 1.75;
    page-break-inside: avoid;
  }

  .doc-further {
    font-size: 10.5pt;
    color: #1a1a1a;
    margin: 5pt 0 6pt 0;
    padding: 7pt 12px;
    border-left: 2px solid #ccc;
    background: #F8F8F6;
    line-height: 1.75;
    page-break-inside: avoid;
  }

  .doc-sig {
    display: flex;
    justify-content: space-between;
    margin-top: 36pt;
    padding-top: 16pt;
    border-top: 0.5px solid #ddd;
    page-break-inside: avoid;
  }

  .doc-sig-line {
    border-top: 1px solid #333;
    width: 150px;
    margin-bottom: 4px;
    display: block;
  }

  .doc-sig div {
    font-size: 9.5pt;
    color: #333;
    line-height: 1.7;
  }

  strong { font-weight: bold; }

  /* Prevent section headers stranded at bottom of page */
  .doc-section + .doc-line,
  .doc-section + .doc-resolution,
  .doc-section + .doc-further {
    page-break-before: avoid;
  }

  /* Divider after title */
  hr.title-divider {
    border: none;
    border-top: 0.5px solid #B8973A;
    margin: 8pt auto;
    width: 50%;
  }
</style>
</head>
<body>

  <div class="doc-header">
    <span class="doc-header-brand">SECRETARYOS</span>
    <span class="doc-header-tag">Companies Act 2013 Compliant Document</span>
  </div>

  <div class="doc-footer">
    <span>Generated by SecretaryOS &middot; ${meta.companyName || ''} &middot; ${meta.cin || ''}</span>
    <span>${meta.meetingDate || ''}</span>
  </div>

  <div class="doc-body">
    ${content}
  </div>

</body>
</html>`
}

async function generateWithPuppeteer(html: string): Promise<Buffer> {
  // Dynamic import — puppeteer-core only loads when needed
  let browser: any = null

  try {
    // Try @sparticuz/chromium first (works on Vercel serverless)
    let executablePath: string
    let puppeteer: any

    try {
      const chromium = await import('@sparticuz/chromium')
      puppeteer = await import('puppeteer-core')
      executablePath = await chromium.default.executablePath()

      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        headless: true,
      })
    } catch {
      // Fallback for local development — use regular puppeteer
      puppeteer = await import('puppeteer' as any)
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    }

    const page = await browser.newPage()

    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    })

    return Buffer.from(pdf)

  } finally {
    if (browser) await browser.close()
  }
}
