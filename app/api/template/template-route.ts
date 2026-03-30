import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateCustomTypstTemplate } from '@/lib/typst/custom-template-generator'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST — upload a PDF template and extract its structure
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(n: string) { return cookieStore.get(n)?.value }, set() {}, remove() {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('client_id') as string

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!clientId) return NextResponse.json({ error: 'No client_id provided' }, { status: 400 })

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Use Claude to extract the structural template from the PDF
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Analyse this board minutes / legal document PDF and extract its structural template.

Return a JSON object with these fields:
{
  "doc_structure": "description of the overall document layout and structure",
  "header_style": "how the header/title area is formatted",
  "section_style": "how section headers are formatted",
  "resolution_style": "how resolutions are formatted (indent, prefix, etc)",
  "signature_style": "how the signature block is laid out",
  "font_notes": "any notable font choices (serif/sans, sizes)",
  "formatting_rules": ["list of specific formatting rules used in this document"],
  "custom_instructions": "plain English instructions for an AI to replicate this exact format"
}

Return ONLY the JSON object, no other text.`,
          },
        ],
      }],
    })

    const text = (message.content[0] as any).text || ''
    let template: any = {}
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      template = JSON.parse(clean)
    } catch {
      template = { custom_instructions: text }
    }

    // Save template to client profile
    // Generate Typst template from the analysis
    const typstTemplate = generateCustomTypstTemplate(template)

    const { error } = await supabase
      .from('clients')
      .update({
        pdf_template: { ...template, typst_template: typstTemplate },
        pdf_template_uploaded_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, template: { ...template, typst_template: typstTemplate } })

  } catch (error: any) {
    console.error('Template upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
