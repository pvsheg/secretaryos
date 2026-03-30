// lib/typst/html-to-typst.ts
// Converts SecretaryOS HTML document output to Typst markup

export interface TypstDocMetadata {
  company_name: string
  cin: string
  meeting_date: string
  place?: string
  chairman_name?: string
  chairman_din?: string
  cs_name?: string
  cs_membership?: string
}

// Escape special Typst characters
function escapeTypst(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/@/g, '\\@')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/~/g, '\\~')
    .replace(/\^/g, '\\^')
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/–/g, '--')
    .replace(/—/g, '---')
    .replace(/₹/g, '\\u{20B9}')
}

// Extract text from HTML element, preserving bold
function extractContent(element: Element): string {
  let result = ''
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += escapeTypst(node.textContent || '')
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'strong' || tag === 'b') {
        result += `*${escapeTypst(el.textContent || '')}*`
      } else if (tag === 'em' || tag === 'i') {
        result += `_${escapeTypst(el.textContent || '')}_`
      } else {
        result += extractContent(el)
      }
    }
  }
  return result
}

export function htmlToTypst(html: string, meta: TypstDocMetadata): string {
  // Parse HTML in Node.js environment using regex (no DOM available server-side)
  const lines = parseHtmlToLines(html)

  const typstLines: string[] = []

  // Document header with imports
  typstLines.push(`#import "template.typ": *`)
  typstLines.push('')
  typstLines.push(`#show: doc.with(`)
  typstLines.push(`  company_name: "${escapeStr(meta.company_name)}",`)
  typstLines.push(`  cin: "${escapeStr(meta.cin)}",`)
  typstLines.push(`  meeting_date: "${escapeStr(meta.meeting_date)}",`)
  typstLines.push(`)`)
  typstLines.push('')

  for (const line of lines) {
    switch (line.type) {
      case 'title':
        typstLines.push(`#doc-title[${line.content}]`)
        typstLines.push('')
        break
      case 'center':
        typstLines.push(`#doc-center[${line.content}]`)
        break
      case 'divider':
        typstLines.push(`#doc-divider()`)
        typstLines.push('')
        break
      case 'section':
        typstLines.push(`#doc-section[${line.content}]`)
        break
      case 'line':
        typstLines.push(`#doc-line[${line.content}]`)
        break
      case 'resolution':
        typstLines.push(`#doc-resolution[${line.content}]`)
        break
      case 'further':
        typstLines.push(`#doc-further[${line.content}]`)
        break
      case 'sig':
        typstLines.push(`#doc-sig(`)
        typstLines.push(`  chairman_name: "${escapeStr(meta.chairman_name || '')}",`)
        typstLines.push(`  chairman_din: "${escapeStr(meta.chairman_din || '')}",`)
        typstLines.push(`  cs_name: "${escapeStr(meta.cs_name || '')}",`)
        typstLines.push(`  cs_membership: "${escapeStr(meta.cs_membership || '')}",`)
        typstLines.push(`  date: "${escapeStr(meta.meeting_date)}",`)
        typstLines.push(`  place: "${escapeStr(meta.place || 'India')}",`)
        typstLines.push(`)`)
        break
    }
  }

  return typstLines.join('\n')
}

interface ParsedLine {
  type: 'title' | 'center' | 'section' | 'line' | 'resolution' | 'further' | 'sig' | 'divider'
  content: string
}

function escapeStr(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ')
}

function htmlToTypstInline(html: string): string {
  // Convert inline HTML to Typst
  return html
    // Bold
    .replace(/<strong>(.*?)<\/strong>/gis, '*$1*')
    .replace(/<b>(.*?)<\/b>/gis, '*$1*')
    // Italic
    .replace(/<em>(.*?)<\/em>/gis, '_$1_')
    .replace(/<i>(.*?)<\/i>/gis, '_$1_')
    // Line breaks
    .replace(/<br\s*\/?>/gi, ' \\\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1))))
    // Escape Typst special chars
    .replace(/#/g, '\\#')
    .replace(/@/g, '\\@')
    .replace(/\$/g, '\\$')
    .replace(/₹/g, 'Rs. ')
    .trim()
}

function parseHtmlToLines(html: string): ParsedLine[] {
  const lines: ParsedLine[] = []

  // Extract elements by class
  const elementPattern = /<(p|div)\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi
  let match

  while ((match = elementPattern.exec(html)) !== null) {
    const className = match[2].trim()
    const rawContent = match[3]
    const content = htmlToTypstInline(rawContent)

    if (!content && className !== 'doc-sig') continue

    switch (className) {
      case 'doc-title-main':
        lines.push({ type: 'title', content })
        break
      case 'doc-center':
        lines.push({ type: 'center', content })
        break
      case 'doc-section':
        lines.push({ type: 'section', content })
        break
      case 'doc-line':
        lines.push({ type: 'line', content })
        break
      case 'doc-resolution':
        lines.push({ type: 'resolution', content })
        break
      case 'doc-further':
        lines.push({ type: 'further', content })
        break
      case 'doc-sig':
        lines.push({ type: 'sig', content: '' })
        break
    }
  }

  // Add divider after center blocks before sections
  const result: ParsedLine[] = []
  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i])
    if (
      lines[i].type === 'center' &&
      lines[i + 1]?.type === 'section'
    ) {
      result.push({ type: 'divider', content: '' })
    }
  }

  return result
}
