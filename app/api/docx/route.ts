import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  BorderStyle, ShadingType, TableCell, TableRow, Table, WidthType,
  convertInchesToTwip, PageOrientation,
} from 'docx'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── HTML → docx paragraph converter ──────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim()
}

interface Segment { text: string; bold: boolean }

function parseInlineHtml(html: string): Segment[] {
  const segments: Segment[] = []
  const parts = html.split(/(<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>)/gi)
  for (const part of parts) {
    const boldMatch = part.match(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/i)
    if (boldMatch) {
      segments.push({ text: stripHtml(boldMatch[1]), bold: true })
    } else if (part) {
      const text = stripHtml(part)
      if (text) segments.push({ text, bold: false })
    }
  }
  return segments.length > 0 ? segments : [{ text: '', bold: false }]
}

function segmentsToRuns(segments: Segment[], fontSize = 22): TextRun[] {
  return segments.flatMap(seg =>
    seg.text.split('\n').flatMap((line, idx, arr) => {
      const run = new TextRun({
        text: line,
        bold: seg.bold,
        size: fontSize,
        font: 'Cambria',
        color: '000000',
        break: idx < arr.length - 1 ? 1 : 0,
      })
      return [run]
    })
  )
}

interface DocSection {
  type: 'title' | 'meeting-title' | 'center' | 'section' | 'line' | 'resolution' | 'further' | 'divider'
  raw: string
}

function parseHtmlSections(html: string): DocSection[] {
  const sections: DocSection[] = []
  const pattern = /<(p|div)\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi
  let match

  while ((match = pattern.exec(html)) !== null) {
    const className = match[2].trim()
    const rawContent = match[3]

    switch (className) {
      case 'doc-title-main':
        sections.push({ type: 'title', raw: rawContent })
        break
      case 'doc-meeting-title':
        sections.push({ type: 'meeting-title', raw: rawContent })
        break
      case 'doc-center':
        sections.push({ type: 'center', raw: rawContent })
        break
      case 'doc-section':
        sections.push({ type: 'section', raw: rawContent })
        break
      case 'doc-line':
        sections.push({ type: 'line', raw: rawContent })
        break
      case 'doc-resolution':
        sections.push({ type: 'resolution', raw: rawContent })
        break
      case 'doc-further':
        sections.push({ type: 'further', raw: rawContent })
        break
      case 'doc-notice-sig':
        // Extract sig lines
        const sigLines = rawContent.match(/<p>([\s\S]*?)<\/p>/gi) || []
        for (const sl of sigLines) {
          sections.push({ type: 'line', raw: sl.replace(/<\/?p>/gi, '') })
        }
        break
    }
  }

  return sections
}

function buildDocxParagraphs(sections: DocSection[]): Paragraph[] {
  const paragraphs: Paragraph[] = []

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]

    switch (sec.type) {
      case 'title': {
        const text = stripHtml(sec.raw).toUpperCase()
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 26, font: 'Cambria', color: '000000' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }))
        break
      }
      case 'meeting-title': {
        const text = stripHtml(sec.raw).toUpperCase()
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 22, font: 'Cambria', color: '000000' })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120, before: 120 },
        }))
        break
      }
      case 'center': {
        const segs = parseInlineHtml(sec.raw)
        paragraphs.push(new Paragraph({
          children: segmentsToRuns(segs, 22),
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }))
        break
      }
      case 'section': {
        const text = stripHtml(sec.raw).toUpperCase()
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 22, font: 'Cambria', color: '000000' })],
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 60 },
          border: {
            bottom: { color: 'AAAAAA', size: 6, style: BorderStyle.SINGLE, space: 1 },
          },
        }))
        break
      }
      case 'line': {
        const segs = parseInlineHtml(sec.raw)
        paragraphs.push(new Paragraph({
          children: segmentsToRuns(segs, 22),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60 },
        }))
        break
      }
      case 'resolution': {
        const segs = parseInlineHtml(sec.raw)
        paragraphs.push(new Paragraph({
          children: segmentsToRuns(segs, 22),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 80, after: 80 },
          indent: { left: convertInchesToTwip(0.2) },
          border: {
            left: { color: '000000', size: 12, style: BorderStyle.SINGLE, space: 4 },
          },
        }))
        break
      }
      case 'further': {
        const segs = parseInlineHtml(sec.raw)
        paragraphs.push(new Paragraph({
          children: segmentsToRuns(segs, 22),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 60, after: 60 },
          indent: { left: convertInchesToTwip(0.2) },
          border: {
            left: { color: '555555', size: 6, style: BorderStyle.SINGLE, space: 4 },
          },
        }))
        break
      }
      case 'divider': {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '', size: 22, font: 'Cambria' })],
          border: {
            bottom: { color: '000000', size: 6, style: BorderStyle.SINGLE, space: 1 },
          },
          spacing: { after: 60 },
        }))
        break
      }
    }
  }

  return paragraphs
}

export async function POST(req: NextRequest) {
  try {
    const { html, fileName, companyName, cin, meetingDate } = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 })
    }

    const sections = parseHtmlSections(html)

    // Auto-insert divider between center and section (same logic as html-to-typst)
    const augmented: DocSection[] = []
    for (let i = 0; i < sections.length; i++) {
      augmented.push(sections[i])
      if (sections[i].type === 'center' && sections[i + 1]?.type === 'section') {
        augmented.push({ type: 'divider', raw: '' })
      }
    }

    const paragraphs = buildDocxParagraphs(augmented)

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Cambria', size: 22, color: '000000' },
            paragraph: { spacing: { line: 360 } }, // 1.5 line spacing
          },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }, // A4
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: paragraphs,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const safeName = (fileName || 'document').replace(/[^a-z0-9_\-]/gi, '_')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err: any) {
    console.error('DOCX generation error:', err)
    return NextResponse.json({ error: err.message || 'DOCX generation failed' }, { status: 500 })
  }
}
