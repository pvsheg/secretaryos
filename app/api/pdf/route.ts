import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { htmlToTypst } from '@/lib/typst/html-to-typst'

export const runtime = 'nodejs'
export const maxDuration = 60

// Path to typst binary — bundled with the app
const TYPST_BINARY = process.env.TYPST_BINARY_PATH || 'typst'
const TEMPLATE_DIR = join(process.cwd(), 'lib', 'typst')

export async function POST(req: NextRequest) {
  const jobId = randomBytes(8).toString('hex')
  const workDir = join(tmpdir(), `secretaryos-${jobId}`)

  try {
    const {
      html,
      fileName,
      companyName,
      cin,
      meetingDate,
      place,
      chairmanName,
      chairmanDin,
      csName,
      csMembership,
      customTemplate, // optional: user's custom typst template
    } = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 })
    }

    // Create isolated work directory
    mkdirSync(workDir, { recursive: true })

    // Copy template files to work directory
    copyFileSync(
      join(TEMPLATE_DIR, 'template.typ'),
      join(workDir, 'template.typ')
    )

    // If user has a custom template, use it instead
    if (customTemplate) {
      writeFileSync(join(workDir, 'template.typ'), customTemplate, 'utf-8')
    }

    // Convert HTML to Typst markup
    const typstContent = htmlToTypst(html, {
      company_name: companyName || '',
      cin: cin || '',
      meeting_date: meetingDate || '',
      place: place || 'India',
      chairman_name: chairmanName || '',
      chairman_din: chairmanDin || '',
      cs_name: csName || '',
      cs_membership: csMembership || '',
    })

    // Write the Typst source file
    const typstFile = join(workDir, 'document.typ')
    const outputFile = join(workDir, 'document.pdf')
    writeFileSync(typstFile, typstContent, 'utf-8')

    // Compile with Typst
    try {
      execSync(`${TYPST_BINARY} compile "${typstFile}" "${outputFile}"`, {
        timeout: 30000,
        stdio: 'pipe',
        cwd: workDir,
      })
    } catch (err: any) {
      const stderr = err.stderr?.toString() || err.message
      console.error('Typst compilation error:', stderr)

      // Fallback to puppeteer if typst fails
      return fallbackPuppeteer(html, fileName, companyName, cin, meetingDate)
    }

    // Read the generated PDF
    if (!existsSync(outputFile)) {
      return fallbackPuppeteer(html, fileName, companyName, cin, meetingDate)
    }

    const pdfBuffer = readFileSync(outputFile)

    // Cleanup
    cleanup(workDir)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'document'}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })

  } catch (error: any) {
    cleanup(workDir)
    console.error('PDF generation error:', error)

    // Always fallback rather than returning an error to the user
    try {
      const body = await req.clone().json()
      return fallbackPuppeteer(body.html, body.fileName, body.companyName, body.cin, body.meetingDate)
    } catch {
      return NextResponse.json(
        { error: error.message || 'PDF generation failed' },
        { status: 500 }
      )
    }
  }
}

function cleanup(dir: string) {
  try {
    execSync(`rm -rf "${dir}"`, { stdio: 'pipe' })
  } catch {}
}

// Fallback: puppeteer-based PDF if typst is not available
async function fallbackPuppeteer(
  html: string,
  fileName: string,
  companyName: string,
  cin: string,
  meetingDate: string
): Promise<NextResponse> {
  try {
    const chromium = require('@sparticuz/chromium')
    const puppeteer = require('puppeteer-core')

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(buildFallbackHtml(html, companyName, cin, meetingDate), {
      waitUntil: 'networkidle0'
    })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    return new NextResponse(new Uint8Array(Buffer.from(pdf)), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'document'}.pdf"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'PDF generation failed: ' + err.message }, { status: 500 })
  }
}

function buildFallbackHtml(content: string, companyName: string, cin: string, meetingDate: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; font-family: 'Times New Roman', serif; font-size: 11pt; color: #1a1a1a; }
  .doc-header { background: #0A0F1E; padding: 10px 40px; display: flex; justify-content: space-between; position: fixed; top: 0; left: 0; right: 0; }
  .doc-header-brand { color: #B8973A; font-size: 10pt; font-weight: bold; letter-spacing: 2px; font-family: Arial; }
  .doc-header-tag { color: #888; font-size: 8pt; font-family: Arial; }
  .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #F8F8F6; border-top: 0.5px solid #ddd; padding: 5px 40px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #999; font-family: Arial; }
  .doc-body { margin-top: 46px; margin-bottom: 32px; padding: 28px 42px 20px; }
  .doc-title-main { font-size: 13.5pt; font-weight: bold; text-align: center; text-transform: uppercase; color: #0A0F1E; margin-bottom: 5px; }
  .doc-center { text-align: center; font-size: 10pt; color: #333; margin-bottom: 3px; }
  .doc-section { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #B8973A; margin-top: 18pt; margin-bottom: 5pt; padding-bottom: 3pt; border-bottom: 0.5px solid #e0e0e0; font-family: Arial; page-break-after: avoid; }
  .doc-line { font-size: 10.5pt; color: #2a2a2a; margin-bottom: 6pt; padding-left: 10px; line-height: 1.7; page-break-inside: avoid; }
  .doc-resolution { font-size: 10.5pt; margin: 10pt 0 6pt; padding: 9pt 12px; border-left: 3px solid #B8973A; background: #FAFAF8; line-height: 1.75; page-break-inside: avoid; }
  .doc-further { font-size: 10.5pt; margin: 5pt 0 6pt; padding: 7pt 12px; border-left: 2px solid #ccc; background: #F8F8F6; line-height: 1.75; page-break-inside: avoid; }
  .doc-sig { display: flex; justify-content: space-between; margin-top: 36pt; padding-top: 16pt; border-top: 0.5px solid #ddd; page-break-inside: avoid; }
  .doc-sig-line { border-top: 1px solid #333; width: 150px; margin-bottom: 4px; display: block; }
  .doc-sig div { font-size: 9.5pt; color: #333; line-height: 1.7; }
  strong { font-weight: bold; }
</style></head><body>
  <div class="doc-header">
    <span class="doc-header-brand">SECRETARYOS</span>
    <span class="doc-header-tag">Companies Act 2013 Compliant Document</span>
  </div>
  <div class="doc-footer">
    <span>Generated by SecretaryOS · ${companyName} · ${cin}</span>
    <span>${meetingDate}</span>
  </div>
  <div class="doc-body">${content}</div>
</body></html>`
}
