import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { execSync } from 'child_process'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { htmlToTypst } from '@/lib/typst/html-to-typst'

export const runtime = 'nodejs'
export const maxDuration = 60

// Find typst binary — works both locally and on Vercel
// outputFileTracingIncludes copies ./bin/typst into the serverless bundle
function getTypstBinary(): string {
  const candidates = [
    // Vercel: binary bundled relative to project root
    resolve(process.cwd(), 'bin', 'typst'),
    // Vercel: Next.js traces files relative to the route file
    join(__dirname, '..', '..', '..', '..', 'bin', 'typst'),
    join(__dirname, '..', '..', '..', 'bin', 'typst'),
    join(__dirname, '..', '..', 'bin', 'typst'),
    // System install
    '/usr/local/bin/typst',
  ]

  for (const p of candidates) {
    if (existsSync(p)) {
      console.log('Found typst at:', p)
      return p
    }
  }

  // Last resort — try PATH
  try {
    execSync('typst --version', { stdio: 'pipe' })
    return 'typst'
  } catch {}

  return ''
}

function getTemplateDir(): string {
  const candidates = [
    resolve(process.cwd(), 'lib', 'typst'),
    join(__dirname, '..', '..', '..', '..', 'lib', 'typst'),
    join(__dirname, '..', '..', '..', 'lib', 'typst'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return resolve(process.cwd(), 'lib', 'typst')
}

export async function POST(req: NextRequest) {
  const jobId = randomBytes(8).toString('hex')
  const workDir = join(tmpdir(), `sos-${jobId}`)

  try {
    const {
      html, fileName, companyName, cin, meetingDate,
      place, chairmanName, chairmanDin, csName, csMembership,
      customTemplate,
    } = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 })
    }

    const typstBin = getTypstBinary()
    if (!typstBin) {
      console.error('Typst binary not found. Searched:', [
        resolve(process.cwd(), 'bin', 'typst'),
        '/usr/local/bin/typst',
      ])
      return NextResponse.json(
        { error: 'PDF engine not available — please contact support' },
        { status: 500 }
      )
    }

    mkdirSync(workDir, { recursive: true })

    // Write template
    const templateDest = join(workDir, 'template.typ')
    if (customTemplate) {
      writeFileSync(templateDest, customTemplate, 'utf-8')
    } else {
      const templateSrc = join(getTemplateDir(), 'template.typ')
      if (existsSync(templateSrc)) {
        copyFileSync(templateSrc, templateDest)
      } else {
        writeFileSync(templateDest, getDefaultTemplate(), 'utf-8')
      }
    }

    // Convert HTML → Typst
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

    const typstFile = join(workDir, 'document.typ')
    const outputFile = join(workDir, 'document.pdf')
    writeFileSync(typstFile, typstContent, 'utf-8')

    // Compile
    try {
      execSync(`"${typstBin}" compile "${typstFile}" "${outputFile}"`, {
        timeout: 30000,
        stdio: 'pipe',
        cwd: workDir,
      })
    } catch (err: any) {
      const stderr = err.stderr?.toString() || ''
      const stdout = err.stdout?.toString() || ''
      console.error('=== TYPST ERROR ===')
      console.error('stderr:', stderr)
      console.error('stdout:', stdout)
      console.error('typst bin:', typstBin)
      console.error('workDir:', workDir)
      console.error('=== TYPST SOURCE ===')
      console.error(typstContent)
      cleanup(workDir)
      return NextResponse.json(
        { error: 'Typst error: ' + (stderr || stdout || err.message).slice(0, 500) },
        { status: 500 }
      )
    }

    if (!existsSync(outputFile)) {
      cleanup(workDir)
      return NextResponse.json({ error: 'PDF output not generated' }, { status: 500 })
    }

    const pdfBuffer = readFileSync(outputFile)
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
    return NextResponse.json({ error: error.message || 'PDF generation failed' }, { status: 500 })
  }
}

function cleanup(dir: string) {
  try { execSync(`rm -rf "${dir}"`, { stdio: 'pipe' }) } catch {}
}

function getDefaultTemplate(): string {
  return `
#let doc(company_name: "", cin: "", meeting_date: "", body) = {
  set page(
    paper: "a4",
    margin: (top: 2.8cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
    header: [
      #grid(columns: (1fr, 1fr),
        [#set text(size: 8pt, weight: "bold", fill: rgb("#B8973A"), tracking: 2pt); SECRETARYOS],
        align(right)[#set text(size: 8pt, fill: rgb("#888888")); Companies Act 2013 Compliant]
      )
      #line(length: 100%, stroke: 0.5pt + rgb("#0A0F1E"))
    ],
    footer: context [
      #line(length: 100%, stroke: 0.5pt + rgb("#dddddd"))
      #v(3pt)
      #grid(columns: (1fr, 1fr),
        [#set text(size: 7pt, fill: rgb("#999999")); Generated by SecretaryOS · #company_name · #cin],
        align(right)[#set text(size: 7pt, fill: rgb("#999999")); #meeting_date · Page #counter(page).display()]
      )
    ]
  )
  set text(font: ("Liberation Serif", "Times New Roman", "serif"), size: 11pt, lang: "en")
  set par(justify: true, leading: 0.8em)
  body
}
#let doc-title(content) = { set align(center); set text(size: 14pt, weight: "bold"); upper(content); v(4pt) }
#let doc-center(content) = { set align(center); set text(size: 10pt); content; v(2pt) }
#let doc-divider() = { v(4pt); align(center, line(length: 50%, stroke: 0.5pt + rgb("#B8973A"))); v(4pt) }
#let doc-section(content) = { v(14pt); set text(size: 9pt, weight: "bold", fill: rgb("#B8973A"), tracking: 1.5pt); upper(content); v(2pt); line(length: 100%, stroke: 0.5pt + rgb("#e0e0e0")); v(4pt) }
#let doc-line(content) = { pad(left: 10pt)[#set text(size: 10.5pt); #content]; v(4pt) }
#let doc-resolution(content) = { v(6pt); block(width: 100%, fill: rgb("#FAFAF8"), stroke: (left: 3pt + rgb("#B8973A")), inset: (left: 12pt, right: 12pt, top: 8pt, bottom: 8pt))[#set text(size: 10.5pt); #content]; v(4pt) }
#let doc-further(content) = { v(3pt); block(width: 100%, fill: rgb("#F8F8F6"), stroke: (left: 2pt + rgb("#cccccc")), inset: (left: 12pt, right: 12pt, top: 6pt, bottom: 6pt))[#set text(size: 10.5pt); #content]; v(4pt) }
#let doc-sig(chairman_name: "", chairman_din: "", cs_name: "", cs_membership: "", date: "", place: "") = {
  v(24pt); line(length: 100%, stroke: 0.5pt + rgb("#dddddd")); v(12pt)
  grid(columns: (1fr, 1fr), gutter: 20pt,
    [#set text(size: 9.5pt); *CHAIRMAN OF THE MEETING* #v(24pt) #line(length: 80%, stroke: 0.5pt + black) #v(3pt) Name: #chairman_name \\ DIN: #chairman_din \\ Date: #date \\ Place: #place],
    [#set text(size: 9.5pt); *COMPANY SECRETARY* #v(24pt) #line(length: 80%, stroke: 0.5pt + black) #v(3pt) Name: #cs_name \\ Membership No.: #cs_membership \\ Date: #date \\ Place: #place]
  )
}
`.trim()
}