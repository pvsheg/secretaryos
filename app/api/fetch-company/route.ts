import { NextRequest, NextResponse } from 'next/server'

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || ''

async function parseWorkerResponse(res: Response, context: string): Promise<unknown> {
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    // Worker returned HTML — log the body server-side to help debug the root cause
    const body = await res.text()
    console.error(`[fetch-company] ${context}: worker returned non-JSON (status ${res.status}). Body: ${body.slice(0, 300)}`)
    return null
  }
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { cin } = await req.json()

    if (!cin || cin.replace(/\s/g, '').length !== 21) {
      return NextResponse.json(
        { error: 'Please enter a valid 21-character CIN.' },
        { status: 400 }
      )
    }

    const cinUpper = cin.toUpperCase().replace(/\s/g, '')

    if (!WORKER_URL) {
      return NextResponse.json(
        { error: 'MCA lookup not configured. Please fill in details manually.', found: false },
        { status: 503 }
      )
    }

    const res = await fetch(`${WORKER_URL}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cin: cinUpper }),
      signal: AbortSignal.timeout(8000),
    })

    const data = await parseWorkerResponse(res, `POST /lookup CIN=${cinUpper}`)
    if (!data) {
      return NextResponse.json(
        { error: 'MCA database returned an unexpected response. Please fill in details manually.', found: false },
        { status: 502 }
      )
    }

    return NextResponse.json(data)

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('fetch-company POST error:', msg)
    return NextResponse.json(
      { error: 'Could not reach MCA database. Please fill in details manually.', found: false },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const state = searchParams.get('state')

    if (!q || q.length < 3) {
      return NextResponse.json({ results: [], count: 0 })
    }

    if (!WORKER_URL) {
      return NextResponse.json({ results: [], count: 0 })
    }

    const params = new URLSearchParams({ q, limit: '15' })
    if (state) params.set('state', state)

    const res = await fetch(`${WORKER_URL}/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    })

    const data = await parseWorkerResponse(res, `GET /search q=${q}`)
    if (!data) {
      return NextResponse.json({ results: [], count: 0 })
    }

    return NextResponse.json(data)

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('fetch-company GET error:', msg)
    return NextResponse.json({ results: [], count: 0 })
  }
}
